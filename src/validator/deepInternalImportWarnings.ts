import path from "node:path";
import type { AxiomModule, AxiomSpec, ObservedDependency, Violation } from "../axi/types.js";
import { globToRegExp, normalizePathForMatch } from "./glob.js";
import type { OwnershipIndex } from "./ownership.js";

// Builds review-only deep import boundary evidence; this module does not define gate semantics.
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

function isRelativeSpecifier(specifier: string): boolean {
  return specifier.startsWith(".");
}

function isIndexSourceFile(filePath: string): boolean {
  return stripExtension(path.basename(filePath)) === "index";
}

function stripExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}

function relativePath(root: string, filePath: string): string {
  return normalizePathForMatch(path.relative(root, filePath));
}
