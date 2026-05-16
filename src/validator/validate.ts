import path from "node:path";
import type {
  AxiomModule,
  AxiomSpec,
  ImportRecord,
  LocalExportRecord,
  ObservedDependency,
  PathRef,
  Violation
} from "../axi/types.js";
import { globToRegExp, normalizePathForMatch } from "./glob.js";
import { validateSuppressionRules, type IntentionalDebtOptions } from "./intentionalDebt.js";
import type { OwnershipIndex } from "./ownership.js";

interface HiddenImportedBinding {
  importRecord: ImportRecord & { resolvedPath: string };
  hiddenRule: PathRef;
}

export function validateSpec(spec: AxiomSpec, options: IntentionalDebtOptions = {}): Violation[] {
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

  }

  violations.push(...validateSuppressionRules(spec, options));
  violations.push(...detectCycles(spec.modules));
  return violations;
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
