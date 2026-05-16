import path from "node:path";
import type { AxiomModule, AxiomSpec, ImportRecord, PathRef, Violation } from "../axi/types.js";
import { globToRegExp, normalizePathForMatch } from "./glob.js";
import type { OwnershipIndex } from "./ownership.js";

// Builds review-only public API surface evidence; this module does not define gate semantics.
const publicEntrypointInternalTargetThreshold = 4;

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

function formatExportKind(importRecord: ImportRecord): string {
  if (importRecord.exportKind === "namespace") {
    return "export * as";
  }

  return importRecord.isTypeOnly ? "export type *" : "export *";
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
