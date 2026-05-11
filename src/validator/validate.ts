import path from "node:path";
import type {
  AxiomModule,
  AxiomSpec,
  ImportRecord,
  ObservedDependency,
  PathRef,
  SuppressedViolation,
  SuppressionInfo,
  SuppressionRule,
  Violation,
  ViolationCode
} from "../axi/types.js";
import { globToRegExp, normalizePathForMatch } from "./glob.js";
import type { OwnershipIndex } from "./ownership.js";

const suppressibleCodes = new Set<ViolationCode>([
  "forbidden_dependency",
  "hidden_reexport",
  "hidden_import",
  "layer_breach",
  "undeclared_dependency",
  "unexposed_import"
]);
const expiringSuppressionWarningDays = 30;

interface DateValidationOptions {
  today?: string;
  intentionalViolationExpiryWarningDays?: number;
}

export function validateSpec(spec: AxiomSpec, options: DateValidationOptions = {}): Violation[] {
  const violations: Violation[] = [];
  const byName = buildModuleMap(spec.modules, violations);
  const layerOrder = spec.layerOrders[0];
  const layerIndex = buildLayerIndex(spec, violations);

  for (const module of spec.modules) {
    if (module.paths.length === 0) {
      violations.push({
        code: "missing_module_path",
        message: `${module.name} has no path declaration.`,
        location: module.location,
        details: {
          module: module.name,
          suggestion: `Add at least one path declaration under module ${module.name}.`
        }
      });
    }

    if (layerOrder && module.layer && !layerIndex.has(module.layer)) {
      violations.push({
        code: "unknown_layer",
        message: `${module.name} uses unknown layer ${module.layer}.`,
        location: module.layerLocation,
        details: {
          module: module.name,
          layer: module.layer,
          rule: formatLayerOrder(layerOrder),
          ruleLocation: layerOrder.location,
          suggestion: `Add ${module.layer} to the layers declaration, or change module ${module.name} to a known layer.`
        }
      });
    }

    for (const dependency of module.depends) {
      if (!byName.has(dependency.name)) {
        violations.push({
          code: "unknown_module",
          message: `${module.name} depends on unknown module ${dependency.name}.`,
          location: dependency.location,
          details: {
            module: module.name,
            target: dependency.name,
            suggestion: `Declare module ${dependency.name}, or remove the dependency from module ${module.name}.`
          }
        });
      }
    }

    for (const forbidden of module.forbidsModules) {
      if (!byName.has(forbidden.name)) {
        violations.push({
          code: "unknown_module",
          message: `${module.name} forbids unknown module ${forbidden.name}.`,
          location: forbidden.location,
          details: {
            module: module.name,
            target: forbidden.name,
            suggestion: `Declare module ${forbidden.name}, or remove the forbidden module rule from module ${module.name}.`
          }
        });
      }
    }

    for (const suppression of module.suppressions) {
      if (!suppressibleCodes.has(suppression.code as ViolationCode)) {
        violations.push({
          code: "invalid_suppression",
          message: `${module.name} accepts unsupported violation code ${suppression.code}.`,
          location: suppression.location,
          details: {
            module: module.name,
            suppressedCode: suppression.code,
            suppressibleCodes: [...suppressibleCodes].sort(),
            suggestion: "Use intentional violations only for observed dependency and visibility violations."
          }
        });
      }

      if (!byName.has(suppression.target.name)) {
        violations.push({
          code: "unknown_module",
          message: `${module.name} accepts a violation to unknown module ${suppression.target.name}.`,
          location: suppression.target.location,
          details: {
            module: module.name,
            target: suppression.target.name,
            suggestion: `Declare module ${suppression.target.name}, or remove the intentional violation from module ${module.name}.`
          }
        });
      }

      if (!isValidIsoDate(suppression.expiresOn) || suppression.reason.trim().length === 0) {
        violations.push({
          code: "invalid_suppression",
          message: `${module.name} has an invalid intentional violation for ${suppression.target.name}.`,
          location: suppression.location,
          details: {
            module: module.name,
            target: suppression.target.name,
            suppressedCode: suppression.code,
            expiresOn: suppression.expiresOn,
            reason: suppression.reason,
            suggestion: 'Use a real YYYY-MM-DD date and a non-empty because "reason".'
          }
        });
        continue;
      }

      if (isExpiredDate(suppression.expiresOn, options.today)) {
        violations.push({
          code: "expired_suppression",
          message: `${module.name} has an expired intentional violation for ${suppression.target.name}.`,
          location: suppression.location,
          details: {
            module: module.name,
            target: suppression.target.name,
            suppressedCode: suppression.code,
            expiresOn: suppression.expiresOn,
            reason: suppression.reason,
            suggestion: "Remove the intentional violation if the architecture debt is fixed, or extend it with a fresh reason."
          }
        });
      }
    }
  }

  violations.push(...detectCycles(spec.modules));
  return violations;
}

export function applySuppressions(
  spec: AxiomSpec,
  violations: Violation[],
  options: DateValidationOptions = {}
): { violations: Violation[]; suppressedViolations: SuppressedViolation[] } {
  const remainingViolations: Violation[] = [];
  const suppressedViolations: SuppressedViolation[] = [];
  const modulesByName = new Map(spec.modules.map((module) => [module.name, module]));

  for (const violation of violations) {
    const suppression = findActiveSuppression(modulesByName, violation, options);

    if (!suppression) {
      remainingViolations.push(violation);
      continue;
    }

    suppressedViolations.push({
      violation,
      suppression
    });
  }

  return {
    violations: remainingViolations,
    suppressedViolations
  };
}

export function findUnusedSuppressions(
  spec: AxiomSpec,
  suppressedViolations: SuppressedViolation[],
  options: DateValidationOptions = {}
): Violation[] {
  const usedSuppressionLocations = new Set(
    suppressedViolations.map((suppressedViolation) => locationKey(suppressedViolation.suppression.location))
  );
  const knownModules = new Set(spec.modules.map((module) => module.name));
  const warnings: Violation[] = [];

  for (const module of spec.modules) {
    for (const suppression of module.suppressions) {
      if (
        !isActiveValidSuppression(suppression, knownModules, options) ||
        usedSuppressionLocations.has(locationKey(suppression.location))
      ) {
        continue;
      }

      warnings.push({
        code: "unused_suppression",
        message: `${module.name} has an unused intentional violation for ${suppression.target.name}.`,
        location: suppression.location,
        details: {
          module: module.name,
          target: suppression.target.name,
          suppressedCode: suppression.code,
          expiresOn: suppression.expiresOn,
          reason: suppression.reason,
          rule: `${module.name} accepts ${suppression.code} to ${suppression.target.name} until ${suppression.expiresOn}`,
          ruleLocation: suppression.location,
          suggestion:
            "Remove the intentional violation if the architecture debt is gone, or keep it only while a matching violation is expected."
        }
      });
    }
  }

  return warnings;
}

export function findExpiringSuppressions(
  suppressedViolations: SuppressedViolation[],
  options: DateValidationOptions = {}
): Violation[] {
  const warnings: Violation[] = [];
  const seenLocations = new Set<string>();

  for (const suppressedViolation of suppressedViolations) {
    const suppression = suppressedViolation.suppression;
    const key = locationKey(suppression.location);
    if (seenLocations.has(key)) {
      continue;
    }
    seenLocations.add(key);

    const daysUntilExpiration = daysUntilDate(suppression.expiresOn, options.today);
    if (
      daysUntilExpiration === undefined ||
      daysUntilExpiration < 0 ||
      daysUntilExpiration > (options.intentionalViolationExpiryWarningDays ?? expiringSuppressionWarningDays)
    ) {
      continue;
    }

    warnings.push({
      code: "expiring_suppression",
      message: `${suppression.fromModule} has an intentional violation to ${suppression.toModule} that expires ${formatExpirationDistance(daysUntilExpiration)}.`,
      location: suppression.location,
      details: {
        module: suppression.fromModule,
        target: suppression.toModule,
        suppressedCode: suppression.code,
        expiresOn: suppression.expiresOn,
        daysUntilExpiration,
        reason: suppression.reason,
        rule: `${suppression.fromModule} accepts ${suppression.code} to ${suppression.toModule} until ${suppression.expiresOn}`,
        ruleLocation: suppression.location,
        suggestion:
          "Review this intentional violation before it expires; remove it if the debt is fixed, or extend it with a fresh reason if the debt remains."
      }
    });
  }

  return warnings;
}

export function buildObservedDependencies(
  imports: ImportRecord[],
  ownership: OwnershipIndex
): ObservedDependency[] {
  const dependencies: ObservedDependency[] = [];

  for (const importRecord of imports) {
    if (!importRecord.resolvedPath) {
      continue;
    }

    const fromModule = ownership.findModule(importRecord.filePath);
    const toModule = ownership.findModule(importRecord.resolvedPath);

    if (!fromModule || !toModule || fromModule.name === toModule.name) {
      continue;
    }

    dependencies.push({
      fromModule: fromModule.name,
      toModule: toModule.name,
      importRecord
    });
  }

  return dependencies;
}

export function validateObservedDependencies(
  spec: AxiomSpec,
  observedDependencies: ObservedDependency[],
  root: string
): Violation[] {
  const violations: Violation[] = [];
  const byName = new Map(spec.modules.map((module) => [module.name, module]));
  const layerOrder = spec.layerOrders[0];
  const layerIndex = buildLayerIndex(spec, []);

  for (const dependency of observedDependencies) {
    const fromModule = byName.get(dependency.fromModule);
    const toModule = byName.get(dependency.toModule);
    if (!fromModule || !toModule) {
      continue;
    }
    const resolvedPath = dependency.importRecord.resolvedPath;
    if (!resolvedPath) {
      continue;
    }

    const forbiddenRule = fromModule.forbidsModules.find((ref) => ref.name === dependency.toModule);
    const declaredDependencies = new Set(fromModule.depends.map((ref) => ref.name));

    if (forbiddenRule) {
      violations.push({
        code: "forbidden_dependency",
        message: `${dependency.fromModule} imports forbidden module ${dependency.toModule}.`,
        location: {
          filePath: dependency.importRecord.filePath,
          line: dependency.importRecord.line
        },
        details: {
          fromModule: dependency.fromModule,
          toModule: dependency.toModule,
          specifier: dependency.importRecord.specifier,
          observed: `${dependency.fromModule} -> ${dependency.toModule}`,
          rule: `${dependency.fromModule} forbids module ${dependency.toModule}`,
          ruleLocation: forbiddenRule.location,
          suggestion: `Remove the import, move the shared code to an allowed module, or change the forbidden rule only if this dependency is intentional.`
        }
      });
      continue;
    }

    if (layerOrder && isLayerBreach(fromModule, toModule, layerIndex)) {
      violations.push({
        code: "layer_breach",
        message: `${dependency.fromModule} in layer ${fromModule.layer} imports ${dependency.toModule} in outer layer ${toModule.layer}.`,
        location: {
          filePath: dependency.importRecord.filePath,
          line: dependency.importRecord.line
        },
        details: {
          fromModule: dependency.fromModule,
          toModule: dependency.toModule,
          fromLayer: fromModule.layer,
          toLayer: toModule.layer,
          specifier: dependency.importRecord.specifier,
          observed: `${dependency.fromModule} -> ${dependency.toModule}`,
          rule: formatLayerOrder(layerOrder),
          ruleLocation: layerOrder.location,
          suggestion: `Move the dependency inward, invert the dependency, or change the layer declarations.`
        }
      });
      continue;
    }

    const hiddenRule = findMatchingPathRule(root, resolvedPath, toModule.hides);
    if (hiddenRule) {
      violations.push({
        code: "hidden_import",
        message: `${dependency.fromModule} imports hidden path from ${dependency.toModule}.`,
        location: {
          filePath: dependency.importRecord.filePath,
          line: dependency.importRecord.line
        },
        details: {
          fromModule: dependency.fromModule,
          toModule: dependency.toModule,
          specifier: dependency.importRecord.specifier,
          importedPath: relativePath(root, resolvedPath),
          observed: `${dependency.fromModule} -> ${dependency.toModule}`,
          rule: `${dependency.toModule} hides ${hiddenRule.pattern}`,
          ruleLocation: hiddenRule.location,
          suggestion: `Import an exposed entry point from ${dependency.toModule}, or move the shared code behind a public boundary.`
        }
      });
      continue;
    }

    if (toModule.exposes.length > 0 && !matchesAnyPathRule(root, resolvedPath, toModule.exposes)) {
      violations.push({
        code: "unexposed_import",
        message: `${dependency.fromModule} imports a non-exposed path from ${dependency.toModule}.`,
        location: {
          filePath: dependency.importRecord.filePath,
          line: dependency.importRecord.line
        },
        details: {
          fromModule: dependency.fromModule,
          toModule: dependency.toModule,
          specifier: dependency.importRecord.specifier,
          importedPath: relativePath(root, resolvedPath),
          observed: `${dependency.fromModule} -> ${dependency.toModule}`,
          rule: `${dependency.toModule} exposes ${toModule.exposes.map((rule) => rule.pattern).join(", ")}`,
          ruleLocation: toModule.exposes[0]?.location,
          suggestion: `Import an exposed entry point from ${dependency.toModule}, or add an exposes rule for this public API.`
        }
      });
      continue;
    }

    if (!declaredDependencies.has(dependency.toModule)) {
      violations.push({
        code: "undeclared_dependency",
        message: `${dependency.fromModule} imports ${dependency.toModule}, but ${dependency.toModule} is not declared in depends.`,
        location: {
          filePath: dependency.importRecord.filePath,
          line: dependency.importRecord.line
        },
        details: {
          fromModule: dependency.fromModule,
          toModule: dependency.toModule,
          specifier: dependency.importRecord.specifier,
          observed: `${dependency.fromModule} -> ${dependency.toModule}`,
          suggestion: `Add 'depends ${dependency.toModule}' under module ${dependency.fromModule}, or remove the import.`
        }
      });
    }
  }

  return violations;
}

export function validateModuleSurfaceConsistency(
  spec: AxiomSpec,
  imports: ImportRecord[],
  ownership: OwnershipIndex,
  root: string
): Violation[] {
  const violations: Violation[] = [];
  const byName = new Map(spec.modules.map((module) => [module.name, module]));

  for (const importRecord of imports) {
    if (importRecord.kind !== "export" || !importRecord.resolvedPath) {
      continue;
    }

    const owner = ownership.findModule(importRecord.filePath);
    const target = ownership.findModule(importRecord.resolvedPath);
    if (!owner || !target || owner.name !== target.name) {
      continue;
    }

    const module = byName.get(owner.name);
    if (!module || module.exposes.length === 0 || !matchesAnyPathRule(root, importRecord.filePath, module.exposes)) {
      continue;
    }

    const hiddenRule = findMatchingPathRule(root, importRecord.resolvedPath, module.hides);
    if (!hiddenRule) {
      continue;
    }

    violations.push({
      code: "hidden_reexport",
      message: `${module.name} re-exports a hidden path through an exposed file.`,
      location: {
        filePath: importRecord.filePath,
        line: importRecord.line
      },
      details: {
        fromModule: module.name,
        toModule: module.name,
        specifier: importRecord.specifier,
        exportedPath: relativePath(root, importRecord.resolvedPath),
        observed: `${module.name} exposes hidden path`,
        rule: `${module.name} hides ${hiddenRule.pattern}`,
        ruleLocation: hiddenRule.location,
        suggestion: "Remove this re-export from the exposed surface, or move the exported API out of the hidden path."
      }
    });
  }

  return violations;
}

function findMatchingPathRule(root: string, filePath: string | undefined, rules: PathRef[]): PathRef | undefined {
  if (!filePath) {
    return undefined;
  }

  return rules.find((rule) => pathRuleMatches(root, filePath, rule));
}

function matchesAnyPathRule(root: string, filePath: string | undefined, rules: PathRef[]): boolean {
  if (!filePath) {
    return false;
  }

  return rules.some((rule) => pathRuleMatches(root, filePath, rule));
}

function pathRuleMatches(root: string, filePath: string, rule: PathRef): boolean {
  return globToRegExp(rule.pattern).test(relativePath(root, filePath));
}

function relativePath(root: string, filePath: string): string {
  return normalizePathForMatch(path.relative(root, filePath));
}

function findActiveSuppression(
  modulesByName: Map<string, AxiomModule>,
  violation: Violation,
  options: DateValidationOptions
): SuppressionInfo | undefined {
  if (!suppressibleCodes.has(violation.code)) {
    return undefined;
  }

  const fromModule = readString(violation.details?.fromModule);
  const toModule = readString(violation.details?.toModule);
  if (!fromModule || !toModule) {
    return undefined;
  }

  const module = modulesByName.get(fromModule);
  if (!module) {
    return undefined;
  }

  const rule = module.suppressions.find(
    (suppression) =>
      suppression.code === violation.code &&
      suppression.target.name === toModule &&
      suppression.reason.trim().length > 0 &&
      isValidIsoDate(suppression.expiresOn) &&
      !isExpiredDate(suppression.expiresOn, options.today)
  );

  if (!rule) {
    return undefined;
  }

  return toSuppressionInfo(fromModule, toModule, violation.code, rule);
}

function toSuppressionInfo(
  fromModule: string,
  toModule: string,
  code: ViolationCode,
  rule: SuppressionRule
): SuppressionInfo {
  return {
    fromModule,
    toModule,
    code,
    expiresOn: rule.expiresOn,
    reason: rule.reason,
    location: rule.location
  };
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isActiveValidSuppression(
  suppression: SuppressionRule,
  knownModules: Set<string>,
  options: DateValidationOptions
): boolean {
  return (
    suppressibleCodes.has(suppression.code as ViolationCode) &&
    knownModules.has(suppression.target.name) &&
    suppression.reason.trim().length > 0 &&
    isValidIsoDate(suppression.expiresOn) &&
    !isExpiredDate(suppression.expiresOn, options.today)
  );
}

function locationKey(location: { filePath: string; line: number }): string {
  return `${path.resolve(location.filePath)}:${location.line}`;
}

function isValidIsoDate(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isExpiredDate(value: string, today?: string): boolean {
  return isValidIsoDate(value) && value < resolveTodayIsoDate(today);
}

function daysUntilDate(value: string, today?: string): number | undefined {
  const todayDate = parseIsoDate(resolveTodayIsoDate(today));
  const targetDate = parseIsoDate(value);
  if (!todayDate || !targetDate) {
    return undefined;
  }

  const todayMs = Date.UTC(todayDate.year, todayDate.month - 1, todayDate.day);
  const targetMs = Date.UTC(targetDate.year, targetDate.month - 1, targetDate.day);
  return Math.round((targetMs - todayMs) / (24 * 60 * 60 * 1000));
}

function formatExpirationDistance(daysUntilExpiration: number): string {
  if (daysUntilExpiration === 0) {
    return "today";
  }

  if (daysUntilExpiration === 1) {
    return "in 1 day";
  }

  return `in ${daysUntilExpiration} days`;
}

function resolveTodayIsoDate(today?: string): string {
  return today && isValidIsoDate(today) ? today : todayIsoDate();
}

function parseIsoDate(value: string): { year: number; month: number; day: number } | undefined {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return undefined;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return { year, month, day };
}

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildLayerIndex(spec: AxiomSpec, violations: Violation[]): Map<string, number> {
  const layerOrder = spec.layerOrders[0];
  const layerIndex = new Map<string, number>();

  if (!layerOrder) {
    return layerIndex;
  }

  if (spec.layerOrders.length > 1) {
    violations.push({
      code: "duplicate_layer_order",
      message: "Multiple layer order declarations found.",
      location: spec.layerOrders[1]?.location,
      details: {
        suggestion: "Keep a single layers declaration for the project."
      }
    });
  }

  for (let index = 0; index < layerOrder.layers.length; index += 1) {
    const layer = layerOrder.layers[index];
    if (layer) {
      layerIndex.set(layer.name, index);
    }
  }

  return layerIndex;
}

function isLayerBreach(
  fromModule: AxiomModule,
  toModule: AxiomModule,
  layerIndex: Map<string, number>
): boolean {
  if (!fromModule.layer || !toModule.layer) {
    return false;
  }

  const fromIndex = layerIndex.get(fromModule.layer);
  const toIndex = layerIndex.get(toModule.layer);

  if (fromIndex === undefined || toIndex === undefined) {
    return false;
  }

  return toIndex > fromIndex;
}

function formatLayerOrder(layerOrder: NonNullable<AxiomSpec["layerOrders"][number]>): string {
  return `layers ${layerOrder.layers.map((layer) => layer.name).join(" -> ")}`;
}

function buildModuleMap(modules: AxiomModule[], violations: Violation[]): Map<string, AxiomModule> {
  const byName = new Map<string, AxiomModule>();

  for (const module of modules) {
    if (byName.has(module.name)) {
      violations.push({
        code: "duplicate_module",
        message: `Duplicate module ${module.name}.`,
        location: module.location,
        details: {
          module: module.name,
          suggestion: `Merge the duplicate ${module.name} declarations, or rename one of them.`
        }
      });
      continue;
    }

    byName.set(module.name, module);
  }

  return byName;
}

function detectCycles(modules: AxiomModule[]): Violation[] {
  const violations: Violation[] = [];
  const byName = new Map(modules.map((module) => [module.name, module]));
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];
  const reported = new Set<string>();

  for (const module of modules) {
    visit(module.name);
  }

  return violations;

  function visit(name: string): void {
    if (visited.has(name)) {
      return;
    }

    if (visiting.has(name)) {
      const cycleStart = stack.indexOf(name);
      const cycle = [...stack.slice(cycleStart), name];
      const cycleKey = cycle.join(" -> ");

      if (!reported.has(cycleKey)) {
        reported.add(cycleKey);
        violations.push({
          code: "cycle_dependency",
          message: `Declared dependency cycle: ${cycleKey}.`,
          location: byName.get(name)?.location,
          details: { cycle }
        });
      }
      return;
    }

    const module = byName.get(name);
    if (!module) {
      return;
    }

    visiting.add(name);
    stack.push(name);

    for (const dependency of module.depends) {
      if (byName.has(dependency.name)) {
        visit(dependency.name);
      }
    }

    stack.pop();
    visiting.delete(name);
    visited.add(name);
  }
}
