import path from "node:path";
import type { ImportRecord, ObservedDependency, Violation } from "../axi/types.js";
import { normalizePathForMatch } from "./glob.js";

// Builds review-only coupling pressure evidence; this module does not define gate semantics.
const couplingConcentrationModuleThreshold = 4;

interface CouplingStats {
  incomingModules: Set<string>;
  outgoingModules: Set<string>;
  incomingImportSites: number;
  outgoingImportSites: number;
  outgoingCompositionImportFiles: Map<string, number>;
  outgoingCompositionModulesByFile: Map<string, Set<string>>;
}

export function findCouplingConcentrationWarnings(
  observedDependencies: ObservedDependency[],
  root: string
): Violation[] {
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
      ensureMapSet(fromStats.outgoingCompositionModulesByFile, dependency.importRecord.filePath).add(
        dependency.toModule
      );
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
        hasConcentratedFanOut && !hasConcentratedFanIn ? describeCompositionRootFanOut(stats, root) : undefined;
      const suggestion =
        compositionRootHint?.suggestion ??
        "Review whether this module is becoming a coordination hub; split responsibilities, narrow public surfaces, or make the boundary explicit before considering enforcement.";

      return [
        {
          code: "coupling_concentration" as const,
          message: formatCouplingConcentrationMessage(
            moduleName,
            fanInModules,
            fanOutModules,
            Boolean(compositionRootHint)
          ),
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

function ensureCouplingStats(statsByModule: Map<string, CouplingStats>, moduleName: string): CouplingStats {
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

  return stem === "index" && segments.length === 2 && segments[0] === "src" && /\.(jsx?|tsx?)$/.test(fileName);
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

function relativePath(root: string, filePath: string): string {
  return normalizePathForMatch(path.relative(root, filePath));
}
