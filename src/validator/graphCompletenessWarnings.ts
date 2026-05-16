import path from "node:path";
import type { DynamicDependencyExpressionRecord, ImportRecord, Violation } from "../axi/types.js";
import { normalizePathForMatch } from "./glob.js";
import type { OwnershipIndex } from "./ownership.js";

/**
 * Advisory evidence for places where Axiom can see a dependency expression but
 * cannot add a precise edge to the observed graph. This module does not define
 * gate semantics; it only shapes graph-completeness review pressure.
 */
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

function isInternalLikeUnresolvedSpecifier(specifier: string): boolean {
  return specifier.startsWith(".") || specifier.startsWith("#");
}

function relativePath(root: string, filePath: string): string {
  return normalizePathForMatch(path.relative(root, filePath));
}
