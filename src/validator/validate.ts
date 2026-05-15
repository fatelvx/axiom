import path from "node:path";
import type {
  AxiomModule,
  AxiomSpec,
  DynamicDependencyExpressionRecord,
  ImportRecord,
  LocalExportRecord,
  ObservedDependency,
  PathRef,
  SourceFileMetric,
  SuppressedViolation,
  SuppressionInfo,
  SuppressionRule,
  Violation,
  ViolationCode
} from "../axi/types.js";
import { largeModuleFileLineThreshold } from "../axi/constants.js";
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
const couplingConcentrationModuleThreshold = 4;
const publicEntrypointInternalTargetThreshold = 4;

interface DateValidationOptions {
  root?: string;
  today?: string;
  intentionalViolationExpiryWarningDays?: number;
}

interface CouplingStats {
  incomingModules: Set<string>;
  outgoingModules: Set<string>;
  incomingImportSites: number;
  outgoingImportSites: number;
  outgoingCompositionImportFiles: Map<string, number>;
  outgoingCompositionModulesByFile: Map<string, Set<string>>;
}

interface PublicEntrypointCouplingStats {
  module: AxiomModule;
  filePath: string;
  firstLine: number;
  exposedRule?: PathRef;
  internalTargets: Set<string>;
  importKinds: Set<ImportRecord["kind"]>;
  importSites: number;
  typeOnlyImportSites: number;
}

interface HiddenImportedBinding {
  importRecord: ImportRecord & { resolvedPath: string };
  hiddenRule: PathRef;
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
          ...(suppression.pathScope ? { pathScope: suppression.pathScope.pattern } : {}),
          reason: suppression.reason,
          rule: formatSuppressionRule(module.name, suppression),
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
        ...(suppression.pathScope ? { pathScope: suppression.pathScope } : {}),
        reason: suppression.reason,
        rule: formatSuppressionInfoRule(suppression),
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
  localExports: LocalExportRecord[],
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

  const hiddenImportsByFile = collectHiddenImportedBindings(spec, imports, ownership, root);

  for (const localExport of localExports) {
    const hiddenBindings = hiddenImportsByFile.get(path.resolve(localExport.filePath));
    if (!hiddenBindings) {
      continue;
    }

    const owner = ownership.findModule(localExport.filePath);
    if (!owner) {
      continue;
    }

    const module = byName.get(owner.name);
    if (!module || module.exposes.length === 0 || !matchesAnyPathRule(root, localExport.filePath, module.exposes)) {
      continue;
    }

    for (const exportedName of localExport.exportedNames) {
      const leak = hiddenBindings.get(exportedName);
      if (!leak) {
        continue;
      }

      violations.push({
        code: "hidden_reexport",
        message: `${module.name} re-exports a hidden import through an exposed file.`,
        location: {
          filePath: localExport.filePath,
          line: localExport.line
        },
        details: {
          fromModule: module.name,
          toModule: module.name,
          specifier: leak.importRecord.specifier,
          exportedName,
          exportedPath: relativePath(root, leak.importRecord.resolvedPath),
          exportKind: localExport.kind,
          importLocation: {
            filePath: leak.importRecord.filePath,
            line: leak.importRecord.line
          },
          observed: `${module.name} exposes hidden path`,
          rule: `${module.name} hides ${leak.hiddenRule.pattern}`,
          ruleLocation: leak.hiddenRule.location,
          suggestion: "Remove this re-export from the exposed surface, or move the exported API out of the hidden path."
        }
      });
    }
  }

  return violations;
}

export function findPublicApiSurfaceWarnings(
  spec: AxiomSpec,
  imports: ImportRecord[],
  ownership: OwnershipIndex,
  root: string
): Violation[] {
  const warnings: Violation[] = [];
  const byName = new Map(spec.modules.map((module) => [module.name, module]));
  const entrypointCouplingStats = new Map<string, PublicEntrypointCouplingStats>();

  for (const importRecord of imports) {
    const owner = ownership.findModule(importRecord.filePath);
    if (!owner) {
      continue;
    }

    const module = byName.get(owner.name);
    if (!module || module.exposes.length === 0 || !matchesAnyPathRule(root, importRecord.filePath, module.exposes)) {
      continue;
    }

    const exposedRule = findMatchingPathRule(root, importRecord.filePath, module.exposes);

    if (importRecord.kind === "export" && (importRecord.exportKind === "star" || importRecord.exportKind === "namespace")) {
      const hiddenRule = findMatchingPathRule(root, importRecord.resolvedPath, module.hides);
      if (!hiddenRule) {
        warnings.push({
          code: "broad_public_surface",
          message: `${module.name} exposes a broad public API surface through ${formatExportKind(importRecord)}.`,
          location: {
            filePath: importRecord.filePath,
            line: importRecord.line
          },
          details: {
            module: module.name,
            specifier: importRecord.specifier,
            exposedPath: relativePath(root, importRecord.filePath),
            exportKind: importRecord.exportKind,
            isTypeOnly: importRecord.isTypeOnly === true,
            observed: `${module.name} broad public surface`,
            ...(exposedRule
              ? {
                  rule: `${module.name} exposes ${exposedRule.pattern}`,
                  ruleLocation: exposedRule.location
                }
              : {}),
            suggestion:
              "Review whether this barrel is intentionally broad; prefer explicit exports or split the public surface when coupling starts to hide behind one entry point."
          }
        });
      }
    }

    if (!importRecord.resolvedPath) {
      continue;
    }

    const target = ownership.findModule(importRecord.resolvedPath);
    if (!target || target.name !== module.name || path.resolve(importRecord.filePath) === path.resolve(importRecord.resolvedPath)) {
      continue;
    }

    if (matchesAnyPathRule(root, importRecord.resolvedPath, module.exposes)) {
      continue;
    }

    const stats = ensurePublicEntrypointCouplingStats(
      entrypointCouplingStats,
      module,
      importRecord.filePath,
      importRecord.line,
      exposedRule
    );
    stats.internalTargets.add(relativePath(root, importRecord.resolvedPath));
    stats.importKinds.add(importRecord.kind);
    stats.importSites += 1;
    if (importRecord.isTypeOnly) {
      stats.typeOnlyImportSites += 1;
    }
  }

  warnings.push(...formatPublicEntrypointCouplingWarnings(entrypointCouplingStats, root));

  return warnings;
}

function ensurePublicEntrypointCouplingStats(
  statsByEntrypoint: Map<string, PublicEntrypointCouplingStats>,
  module: AxiomModule,
  filePath: string,
  line: number,
  exposedRule: PathRef | undefined
): PublicEntrypointCouplingStats {
  const key = path.resolve(filePath);
  const existing = statsByEntrypoint.get(key);
  if (existing) {
    existing.firstLine = Math.min(existing.firstLine, line);
    return existing;
  }

  const created: PublicEntrypointCouplingStats = {
    module,
    filePath,
    firstLine: line,
    exposedRule,
    internalTargets: new Set<string>(),
    importKinds: new Set<ImportRecord["kind"]>(),
    importSites: 0,
    typeOnlyImportSites: 0
  };
  statsByEntrypoint.set(key, created);
  return created;
}

function formatPublicEntrypointCouplingWarnings(
  statsByEntrypoint: Map<string, PublicEntrypointCouplingStats>,
  root: string
): Violation[] {
  return [...statsByEntrypoint.values()]
    .filter((stats) => stats.internalTargets.size >= publicEntrypointInternalTargetThreshold)
    .sort((left, right) => relativePath(root, left.filePath).localeCompare(relativePath(root, right.filePath)))
    .map((stats) => {
      const internalTargets = [...stats.internalTargets].sort();
      const exposedPath = relativePath(root, stats.filePath);

      return {
        code: "public_entrypoint_coupling" as const,
        message: `${stats.module.name} public entry point reaches ${internalTargets.length} internal files.`,
        location: {
          filePath: stats.filePath,
          line: stats.firstLine
        },
        details: {
          module: stats.module.name,
          exposedPath,
          internalTargetCount: internalTargets.length,
          internalImportSites: stats.importSites,
          typeOnlyImportSites: stats.typeOnlyImportSites,
          internalTargets,
          importKinds: [...stats.importKinds].sort(),
          threshold: {
            internalTargets: publicEntrypointInternalTargetThreshold
          },
          observed: `${stats.module.name} public entry point depends on ${internalTargets.length} internal files`,
          ...(stats.exposedRule
            ? {
                rule: `${stats.module.name} exposes ${stats.exposedRule.pattern}`,
                ruleLocation: stats.exposedRule.location
              }
            : {}),
          suggestion:
            "Review whether this entry point is masking internal coupling; prefer narrower named exports, split the public surface, or make the facade boundary explicit."
        }
      };
    });
}

function collectHiddenImportedBindings(
  spec: AxiomSpec,
  imports: ImportRecord[],
  ownership: OwnershipIndex,
  root: string
): Map<string, Map<string, HiddenImportedBinding>> {
  const hiddenImportsByFile = new Map<string, Map<string, HiddenImportedBinding>>();
  const byName = new Map(spec.modules.map((module) => [module.name, module]));

  for (const importRecord of imports) {
    if (importRecord.kind !== "import" || !importRecord.resolvedPath || !importRecord.importedBindings?.length) {
      continue;
    }

    const owner = ownership.findModule(importRecord.filePath);
    const target = ownership.findModule(importRecord.resolvedPath);
    if (!owner || !target || owner.name !== target.name) {
      continue;
    }

    const module = byName.get(owner.name);
    if (!module) {
      continue;
    }

    const hiddenRule = findMatchingPathRule(root, importRecord.resolvedPath, module.hides);
    if (!hiddenRule) {
      continue;
    }

    const bindingsByName = ensureHiddenBindingMap(hiddenImportsByFile, importRecord.filePath);
    for (const binding of importRecord.importedBindings) {
      bindingsByName.set(binding.localName, {
        importRecord: importRecord as ImportRecord & { resolvedPath: string },
        hiddenRule
      });
    }
  }

  return hiddenImportsByFile;
}

function ensureHiddenBindingMap(
  hiddenImportsByFile: Map<string, Map<string, HiddenImportedBinding>>,
  filePath: string
): Map<string, HiddenImportedBinding> {
  const key = path.resolve(filePath);
  const existing = hiddenImportsByFile.get(key);
  if (existing) {
    return existing;
  }

  const created = new Map<string, HiddenImportedBinding>();
  hiddenImportsByFile.set(key, created);
  return created;
}

export function findUnresolvedImportWarnings(
  imports: ImportRecord[],
  ownership: OwnershipIndex,
  root: string
): Violation[] {
  return imports
    .filter((importRecord) => !importRecord.resolvedPath && isInternalLikeUnresolvedSpecifier(importRecord.specifier))
    .flatMap((importRecord) => {
      const fromModule = ownership.findModule(importRecord.filePath);
      if (!fromModule) {
        return [];
      }

      return [
        {
          code: "unresolved_import" as const,
          message: `${fromModule.name} has an import that Axiom could not resolve into the observed graph.`,
          location: {
            filePath: importRecord.filePath,
            line: importRecord.line
          },
          details: {
            module: fromModule.name,
            specifier: importRecord.specifier,
            importKind: importRecord.kind,
            observed: `${fromModule.name} unresolved import`,
            resolution: "unresolved",
            scope: "relative_or_package_imports",
            suggestion:
              "Axiom could not map this static import to a source file, so the observed graph may be incomplete. Add the missing file, configure tsconfig/package imports, or exclude generated/runtime paths intentionally."
          }
        }
      ];
    });
}

export function findDynamicDependencyExpressionWarnings(
  dynamicDependencyExpressions: DynamicDependencyExpressionRecord[],
  ownership: OwnershipIndex,
  root: string
): Violation[] {
  return [...dynamicDependencyExpressions]
    .sort((left, right) => {
      const pathCompare = relativePath(root, left.filePath).localeCompare(relativePath(root, right.filePath));
      return pathCompare !== 0 ? pathCompare : left.line - right.line;
    })
    .flatMap((record) => {
      const fromModule = ownership.findModule(record.filePath);
      if (!fromModule) {
        return [];
      }

      const dependencyKind = record.kind === "dynamic_import_expression" ? "import()" : "require()";

      return [
        {
          code: "dynamic_dependency_expression" as const,
          message: `${fromModule.name} has a non-literal ${dependencyKind} expression that Axiom cannot resolve into the observed graph.`,
          location: {
            filePath: record.filePath,
            line: record.line
          },
          details: {
            module: fromModule.name,
            dependencyKind,
            expressionKind: record.expressionKind,
            expressionPreview: record.expressionPreview,
            observed: `${fromModule.name} dynamic dependency expression`,
            resolution: "not_statically_resolved",
            scope: "dynamic_dependency_expression",
            note:
              "Literal dynamic imports are scanned as observed dependencies; non-literal dependency expressions are graph-incompleteness evidence.",
            suggestion:
              "Prefer literal imports or a visible registry when the dependency is architectural, or document it as runtime wiring outside Axiom's static graph."
          }
        }
      ];
    });
}

export function findCouplingConcentrationWarnings(observedDependencies: ObservedDependency[], root: string): Violation[] {
  const statsByModule = new Map<string, CouplingStats>();

  for (const dependency of observedDependencies) {
    if (dependency.fromModule === dependency.toModule) {
      continue;
    }

    const fromStats = ensureCouplingStats(statsByModule, dependency.fromModule);
    const toStats = ensureCouplingStats(statsByModule, dependency.toModule);

    fromStats.outgoingModules.add(dependency.toModule);
    fromStats.outgoingImportSites += 1;
    if (isCompositionRootImport(dependency.importRecord)) {
      incrementMapCount(fromStats.outgoingCompositionImportFiles, dependency.importRecord.filePath);
      ensureMapSet(fromStats.outgoingCompositionModulesByFile, dependency.importRecord.filePath).add(dependency.toModule);
    }
    toStats.incomingModules.add(dependency.fromModule);
    toStats.incomingImportSites += 1;
  }

  return [...statsByModule.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .flatMap(([moduleName, stats]) => {
      const incomingModules = [...stats.incomingModules].sort();
      const outgoingModules = [...stats.outgoingModules].sort();
      const fanInModules = incomingModules.length;
      const fanOutModules = outgoingModules.length;
      const hasConcentratedFanIn = fanInModules >= couplingConcentrationModuleThreshold;
      const hasConcentratedFanOut = fanOutModules >= couplingConcentrationModuleThreshold;

      if (!hasConcentratedFanIn && !hasConcentratedFanOut) {
        return [];
      }

      const compositionRootHint =
        hasConcentratedFanOut && !hasConcentratedFanIn
          ? describeCompositionRootFanOut(stats, root)
          : undefined;
      const suggestion =
        compositionRootHint?.suggestion ??
        "Review whether this module is becoming a coordination hub; split responsibilities, narrow public surfaces, or make the boundary explicit before considering enforcement.";

      return [
        {
          code: "coupling_concentration" as const,
          message: formatCouplingConcentrationMessage(moduleName, fanInModules, fanOutModules, Boolean(compositionRootHint)),
          details: {
            module: moduleName,
            direction: formatCouplingConcentrationDirection(hasConcentratedFanIn, hasConcentratedFanOut),
            fanInModules,
            fanOutModules,
            incomingModules,
            outgoingModules,
            incomingImportSites: stats.incomingImportSites,
            outgoingImportSites: stats.outgoingImportSites,
            threshold: {
              fanInModules: couplingConcentrationModuleThreshold,
              fanOutModules: couplingConcentrationModuleThreshold
            },
            observed: formatCouplingConcentrationObserved(
              moduleName,
              fanInModules,
              fanOutModules,
              Boolean(compositionRootHint)
            ),
            ...(compositionRootHint ?? {}),
            suggestion
          }
        }
      ];
    });
}

export function findLargeModuleFileWarnings(sourceFileMetrics: SourceFileMetric[], root: string): Violation[] {
  return sourceFileMetrics
    .filter((metric) => metric.lineCount >= largeModuleFileLineThreshold)
    .sort((left, right) => {
      if (right.lineCount !== left.lineCount) {
        return right.lineCount - left.lineCount;
      }

      return relativePath(root, left.filePath).localeCompare(relativePath(root, right.filePath));
    })
    .map((metric) => ({
      code: "large_module_file" as const,
      message: "Source file is large enough that architecture pressure may be hidden inside the file.",
      location: {
        filePath: metric.filePath,
        line: 1
      },
      details: {
        filePath: relativePath(root, metric.filePath),
        lineCount: metric.lineCount,
        threshold: {
          lines: largeModuleFileLineThreshold
        },
        importsScanned: metric.importCount,
        exportsScanned: metric.exportCount,
        functionLikeCount: metric.functionLikeCount,
        classCount: metric.classCount,
        ...(metric.nameTokenClusters.length > 0
          ? {
              nameTokenClusters: metric.nameTokenClusters,
              responsibilityHint:
                "Identifier token clusters are lexical review hints from declaration names. They are not proof that these are the correct module boundaries."
            }
          : {}),
        observed: `${relativePath(root, metric.filePath)} has ${metric.lineCount} lines`,
        scope: "intra_file_responsibility_pressure",
        suggestion:
          "Use this as a refactor/review prompt; split only after identifying real responsibilities. This warning does not mean the import graph is unhealthy."
      }
    }));
}

export function findDeepInternalImportWarnings(
  spec: AxiomSpec,
  observedDependencies: ObservedDependency[],
  sourceFiles: string[],
  ownership: OwnershipIndex,
  root: string
): Violation[] {
  const modulesByName = new Map(spec.modules.map((module) => [module.name, module]));
  const entrypointsByModule = findLikelyEntrypointsByModule(sourceFiles, ownership, root);
  const warnings: Violation[] = [];

  for (const dependency of observedDependencies) {
    const resolvedPath = dependency.importRecord.resolvedPath;
    if (!resolvedPath || !isRelativeSpecifier(dependency.importRecord.specifier)) {
      continue;
    }

    const targetModule = modulesByName.get(dependency.toModule);
    if (!targetModule || targetModule.exposes.length > 0) {
      continue;
    }

    const publicEntrypoints = entrypointsByModule.get(dependency.toModule) ?? [];
    if (publicEntrypoints.length === 0) {
      continue;
    }

    const importedPath = relativePath(root, resolvedPath);
    if (publicEntrypoints.includes(importedPath)) {
      continue;
    }

    const sourceGroup = findBestModuleSourceGroup(targetModule, importedPath);
    const sourceGroupEntrypoints = sourceGroup
      ? publicEntrypoints.filter((entrypoint) => findBestModuleSourceGroup(targetModule, entrypoint) === sourceGroup)
      : publicEntrypoints;
    const otherModuleEntrypoints = publicEntrypoints.filter((entrypoint) => !sourceGroupEntrypoints.includes(entrypoint));
    const entrypointConfidence =
      sourceGroupEntrypoints.length === 1 ? "single_likely_entrypoint" : "ambiguous_entrypoints";
    const entrypointReason = formatEntrypointReason(sourceGroupEntrypoints.length);

    warnings.push({
      code: "deep_internal_import",
      message:
        entrypointConfidence === "single_likely_entrypoint"
          ? `${dependency.fromModule} imports ${dependency.toModule} through a deep relative path instead of a likely source-group entry point.`
          : `${dependency.fromModule} imports ${dependency.toModule} through a deep relative path with no clear source-group entry point.`,
      location: {
        filePath: dependency.importRecord.filePath,
        line: dependency.importRecord.line
      },
      details: {
        fromModule: dependency.fromModule,
        toModule: dependency.toModule,
        specifier: dependency.importRecord.specifier,
        importedPath,
        deepImportGroup: formatDeepImportGroup(importedPath),
        sourceGroup,
        publicEntrypoints: sourceGroupEntrypoints.slice(0, 5),
        publicEntrypointCount: sourceGroupEntrypoints.length,
        publicEntrypointsTruncated: sourceGroupEntrypoints.length > 5,
        moduleEntrypoints: otherModuleEntrypoints.slice(0, 5),
        moduleEntrypointCount: otherModuleEntrypoints.length,
        moduleEntrypointsTruncated: otherModuleEntrypoints.length > 5,
        entrypointConfidence,
        entrypointReason,
        importKind: dependency.importRecord.kind,
        observed: `${dependency.fromModule} -> ${dependency.toModule} deep internal import`,
        scope: "relative_cross_module_non_entrypoint",
        suggestion:
          entrypointConfidence === "single_likely_entrypoint"
            ? `Import the source-group entry point from ${dependency.toModule}, or declare explicit exposes/hides rules if this deep path is intentional.`
            : `Review the ${formatDeepImportGroup(
                importedPath
              )} source group for ${dependency.toModule}; this module may be too broad or missing a public entry point, so declare explicit exposes/hides rules or split the module before treating another source group's index file as the public boundary.`
      }
    });
  }

  return warnings;
}

function findLikelyEntrypointsByModule(
  sourceFiles: string[],
  ownership: OwnershipIndex,
  root: string
): Map<string, string[]> {
  const entrypoints = new Map<string, string[]>();

  for (const sourceFile of sourceFiles) {
    if (!isIndexSourceFile(sourceFile)) {
      continue;
    }

    const owner = ownership.findModule(sourceFile);
    if (!owner) {
      continue;
    }

    const moduleEntrypoints = entrypoints.get(owner.name) ?? [];
    moduleEntrypoints.push(relativePath(root, sourceFile));
    entrypoints.set(owner.name, moduleEntrypoints);
  }

  for (const moduleEntrypoints of entrypoints.values()) {
    moduleEntrypoints.sort();
  }

  return entrypoints;
}

function findBestModuleSourceGroup(module: AxiomModule, relativeFilePath: string): string | undefined {
  let bestGroup: string | undefined;

  for (const pattern of module.paths) {
    if (!globToRegExp(pattern).test(relativeFilePath)) {
      continue;
    }

    const group = modulePathStaticPrefix(pattern);
    if (!bestGroup || group.length > bestGroup.length) {
      bestGroup = group;
    }
  }

  return bestGroup;
}

function modulePathStaticPrefix(pattern: string): string {
  const wildcardIndex = pattern.indexOf("*");
  const prefix = wildcardIndex === -1 ? pattern : pattern.slice(0, wildcardIndex);
  return prefix.replace(/\/+$/, "");
}

function formatEntrypointReason(sourceGroupEntrypointCount: number): string {
  if (sourceGroupEntrypointCount === 0) {
    return "no_same_source_group_entrypoint";
  }

  if (sourceGroupEntrypointCount === 1) {
    return "single_same_source_group_entrypoint";
  }

  return "multiple_same_source_group_entrypoints";
}

function formatDeepImportGroup(relativeFilePath: string): string {
  const segments = relativeFilePath.split("/").filter(Boolean);
  if (segments.length <= 1) {
    return relativeFilePath;
  }

  if (segments.length >= 4) {
    return `${segments.slice(0, 3).join("/")}/*`;
  }

  return `${segments.slice(0, 2).join("/")}/*`;
}

function ensureCouplingStats(
  statsByModule: Map<string, CouplingStats>,
  moduleName: string
): CouplingStats {
  const existing = statsByModule.get(moduleName);
  if (existing) {
    return existing;
  }

  const created = {
    incomingModules: new Set<string>(),
    outgoingModules: new Set<string>(),
    incomingImportSites: 0,
    outgoingImportSites: 0,
    outgoingCompositionImportFiles: new Map<string, number>(),
    outgoingCompositionModulesByFile: new Map<string, Set<string>>()
  };
  statsByModule.set(moduleName, created);
  return created;
}

function formatCouplingConcentrationMessage(
  moduleName: string,
  fanInModules: number,
  fanOutModules: number,
  isCompositionRootFanOut = false
): string {
  const hasConcentratedFanIn = fanInModules >= couplingConcentrationModuleThreshold;
  const hasConcentratedFanOut = fanOutModules >= couplingConcentrationModuleThreshold;

  if (isCompositionRootFanOut && hasConcentratedFanOut) {
    return `${moduleName} composition root imports ${fanOutModules} modules.`;
  }

  if (hasConcentratedFanIn && hasConcentratedFanOut) {
    return `${moduleName} has concentrated fan-in from ${fanInModules} modules and fan-out to ${fanOutModules} modules.`;
  }

  if (hasConcentratedFanIn) {
    return `${moduleName} has concentrated fan-in from ${fanInModules} modules.`;
  }

  return `${moduleName} has concentrated fan-out to ${fanOutModules} modules.`;
}

function formatCouplingConcentrationDirection(hasConcentratedFanIn: boolean, hasConcentratedFanOut: boolean): string {
  if (hasConcentratedFanIn && hasConcentratedFanOut) {
    return "fan_in_and_fan_out";
  }

  return hasConcentratedFanIn ? "fan_in" : "fan_out";
}

function formatCouplingConcentrationObserved(
  moduleName: string,
  fanInModules: number,
  fanOutModules: number,
  isCompositionRootFanOut = false
): string {
  const hasConcentratedFanIn = fanInModules >= couplingConcentrationModuleThreshold;
  const hasConcentratedFanOut = fanOutModules >= couplingConcentrationModuleThreshold;

  if (isCompositionRootFanOut && hasConcentratedFanOut) {
    return `${moduleName} composition root imports ${fanOutModules} modules`;
  }

  if (hasConcentratedFanIn && hasConcentratedFanOut) {
    return `${moduleName} fan-in ${fanInModules}, fan-out ${fanOutModules}`;
  }

  if (hasConcentratedFanIn) {
    return `${moduleName} fan-in from ${fanInModules} modules`;
  }

  return `${moduleName} fan-out to ${fanOutModules} modules`;
}

function describeCompositionRootFanOut(
  stats: CouplingStats,
  root: string
):
  | {
      reviewKind: string;
      roleHint: string;
      entryFiles: string[];
      entryFileFanOutModules: number;
      entryFileImportSites: number;
      note: string;
      suggestion: string;
    }
  | undefined {
  const entryFiles = [...stats.outgoingCompositionModulesByFile.entries()]
    .map(([filePath, modules]) => ({
      filePath,
      relativeFilePath: relativePath(root, filePath),
      modules,
      importSites: stats.outgoingCompositionImportFiles.get(filePath) ?? 0
    }))
    .filter((entry) => isLikelyCompositionRootFile(entry.relativeFilePath) && entry.modules.size > 0)
    .sort((left, right) => left.relativeFilePath.localeCompare(right.relativeFilePath));
  const entryFanOutModules = new Set(entryFiles.flatMap((entry) => [...entry.modules]));

  if (entryFanOutModules.size < couplingConcentrationModuleThreshold) {
    return undefined;
  }

  return {
    reviewKind: "composition_root_pressure",
    roleHint: "composition_root",
    entryFiles: entryFiles.map((entry) => entry.relativeFilePath),
    entryFileFanOutModules: entryFanOutModules.size,
    entryFileImportSites: entryFiles.reduce((total, entry) => total + entry.importSites, 0),
    note:
      "This may be legitimate app or package bootstrap wiring when the entry file only composes modules; review whether it is also accumulating product logic.",
    suggestion:
      "Review whether the entry file is only wiring dependencies together. If yes, keep this as visible composition-root pressure; if it owns behavior too, split bootstrap from product logic or make the boundary explicit."
  };
}

function isCompositionRootImport(importRecord: ImportRecord): boolean {
  return importRecord.kind !== "export";
}

function isLikelyCompositionRootFile(relativeFilePath: string): boolean {
  const normalized = normalizePathForMatch(relativeFilePath).toLowerCase();
  const fileName = normalized.split("/").pop() ?? "";
  const stem = fileName.replace(/\.(c|m)?[jt]sx?$/, "");
  const segments = normalized.split("/").filter(Boolean);

  if (stem === "main" || stem === "bootstrap" || stem === "entry" || stem === "startup" || stem === "start") {
    return true;
  }

  if (stem === "app" && /\.(jsx?|tsx?)$/.test(fileName)) {
    return true;
  }

  return (
    stem === "index" &&
    segments.length === 2 &&
    segments[0] === "src" &&
    /\.(jsx?|tsx?)$/.test(fileName)
  );
}

function incrementMapCount(map: Map<string, number>, key: string): void {
  map.set(key, (map.get(key) ?? 0) + 1);
}

function ensureMapSet<TKey, TValue>(map: Map<TKey, Set<TValue>>, key: TKey): Set<TValue> {
  const existing = map.get(key);
  if (existing) {
    return existing;
  }

  const created = new Set<TValue>();
  map.set(key, created);
  return created;
}

function formatExportKind(importRecord: ImportRecord): string {
  if (importRecord.exportKind === "namespace") {
    return "export * as";
  }

  return importRecord.isTypeOnly ? "export type *" : "export *";
}

function isRelativeSpecifier(specifier: string): boolean {
  return specifier.startsWith(".");
}

function isInternalLikeUnresolvedSpecifier(specifier: string): boolean {
  return specifier.startsWith(".") || specifier.startsWith("#");
}

function isIndexSourceFile(filePath: string): boolean {
  return stripExtension(path.basename(filePath)) === "index";
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
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
      !isExpiredDate(suppression.expiresOn, options.today) &&
      suppressionMatchesViolationScope(suppression, violation, options.root)
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
    ...(rule.pathScope ? { pathScope: rule.pathScope.pattern } : {}),
    expiresOn: rule.expiresOn,
    reason: rule.reason,
    location: rule.location
  };
}

function suppressionMatchesViolationScope(
  suppression: SuppressionRule,
  violation: Violation,
  root: string | undefined
): boolean {
  if (!suppression.pathScope) {
    return true;
  }

  if (!root || !violation.location) {
    return false;
  }

  return pathRuleMatches(root, violation.location.filePath, suppression.pathScope);
}

function formatSuppressionInfoRule(suppression: SuppressionInfo): string {
  return `${suppression.fromModule} accepts ${suppression.code} to ${suppression.toModule}${formatPathScopeText(
    suppression.pathScope
  )} until ${suppression.expiresOn}`;
}

function formatSuppressionRule(moduleName: string, suppression: SuppressionRule): string {
  return `${moduleName} accepts ${suppression.code} to ${suppression.target.name}${formatPathScopeText(
    suppression.pathScope?.pattern
  )} until ${suppression.expiresOn}`;
}

function formatPathScopeText(pathScope: string | undefined): string {
  return pathScope ? ` at "${pathScope}"` : "";
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
