import path from "node:path";
import type { AxiomModule, Violation } from "../axi/types.js";
import { globToRegExp, normalizePathForMatch } from "./glob.js";

interface ModuleMatcher {
  module: AxiomModule;
  patterns: RegExp[];
}

export interface OwnershipIndex {
  findModule(filePath: string): AxiomModule | undefined;
  findModules(filePath: string): AxiomModule[];
}

export function createOwnershipIndex(root: string, modules: AxiomModule[]): OwnershipIndex {
  const matchers: ModuleMatcher[] = modules.map((module) => ({
    module,
    patterns: module.paths.map((pattern) => globToRegExp(pattern))
  }));

  return {
    findModule(filePath: string): AxiomModule | undefined {
      const matches = findMatches(filePath);

      if (matches.length !== 1) {
        return undefined;
      }

      return matches[0];
    },

    findModules(filePath: string): AxiomModule[] {
      return findMatches(filePath);
    }
  };

  function findMatches(filePath: string): AxiomModule[] {
    const relativePath = normalizePathForMatch(path.relative(root, filePath));
    return matchers
      .filter((matcher) => matcher.patterns.some((pattern) => pattern.test(relativePath)))
      .map((matcher) => matcher.module);
  }
}

export function validateOwnership(sourceFiles: string[], ownership: OwnershipIndex): Violation[] {
  const violations: Violation[] = [];

  for (const sourceFile of sourceFiles) {
    const owners = ownership.findModules(sourceFile);

    if (owners.length <= 1) {
      continue;
    }

    violations.push({
      code: "ambiguous_module_owner",
      message: `Source file is owned by multiple modules: ${owners.map((owner) => owner.name).join(", ")}.`,
      location: {
        filePath: sourceFile,
        line: 1
      },
      details: {
        owners: owners.map((owner) => owner.name),
        suggestion: "Make module path declarations non-overlapping, or split the file into a single owner."
      }
    });
  }

  return violations;
}
