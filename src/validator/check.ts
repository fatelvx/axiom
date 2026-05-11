import fs from "node:fs";
import path from "node:path";
import type { AxiomSpec, ImportRecord, ObservedDependency, SuppressedViolation, Violation } from "../axi/types.js";
import { parseAxiomText } from "../axi/parser.js";
import { loadConfig } from "../config/config.js";
import { findAxiomFiles, findSourceFiles } from "../fs/discover.js";
import { createImportResolver } from "../scanner/importResolver.js";
import { scanImports } from "../scanner/importScanner.js";
import { createOwnershipIndex, validateOwnership } from "./ownership.js";
import {
  applySuppressions,
  buildObservedDependencies,
  findExpiringSuppressions,
  findUnusedSuppressions,
  validateObservedDependencies,
  validateSpec
} from "./validate.js";

export type AdoptionMode = "loose" | "warn-unowned" | "strict";

export interface CheckOptions {
  root: string;
  configPath?: string;
  adoptionMode?: AdoptionMode;
  today?: string;
  intentionalViolationExpiryWarningDays?: number;
}

export interface CheckResult {
  root: string;
  specFiles: string[];
  sourceFiles: string[];
  importCount: number;
  observedDependencies: ObservedDependency[];
  spec: AxiomSpec;
  violations: Violation[];
  warnings: Violation[];
  suppressedViolations: SuppressedViolation[];
}

export function runCheck(options: CheckOptions): CheckResult {
  const root = path.resolve(options.root);
  const adoptionMode = options.adoptionMode ?? "loose";
  const config = loadConfig(root, options.configPath);
  const intentionalViolationExpiryWarningDays =
    options.intentionalViolationExpiryWarningDays ?? config.intentionalViolationExpiryWarningDays;
  const specFiles = findAxiomFiles(root, config);
  const sourceFiles = findSourceFiles(root, config);
  const resolver = createImportResolver({ root, tsconfigPath: config.tsconfig });
  const violations: Violation[] = [];
  const warnings: Violation[] = [];
  const suppressedViolations: SuppressedViolation[] = [];
  const spec: AxiomSpec = { modules: [], layerOrders: [] };

  if (specFiles.length === 0) {
    violations.push({
      code: "no_spec_files",
      message: `No .axi files found under ${root}.`
    });
  }

  for (const specFile of specFiles) {
    const text = fs.readFileSync(specFile, "utf8");
    const parsed = parseAxiomText(specFile, text);
    spec.modules.push(...parsed.modules);
    spec.layerOrders.push(...parsed.layerOrders);
    violations.push(...parsed.violations);
  }

  violations.push(...validateSpec(spec, { today: options.today }));

  const imports: ImportRecord[] = sourceFiles.flatMap((sourceFile) => scanImports(sourceFile, { resolver }));
  const ownership = createOwnershipIndex(root, spec.modules);
  violations.push(...validateOwnership(sourceFiles, ownership));
  const unownedSourceFileDiagnostics = spec.modules.length > 0 ? findUnownedSourceFiles(sourceFiles, ownership) : [];

  if (adoptionMode === "strict") {
    violations.push(...unownedSourceFileDiagnostics);
  } else if (adoptionMode === "warn-unowned") {
    warnings.push(...unownedSourceFileDiagnostics);
  }

  const observedDependencies = buildObservedDependencies(imports, ownership);

  const observedValidation = applySuppressions(spec, validateObservedDependencies(spec, observedDependencies, root), {
    today: options.today
  });
  violations.push(...observedValidation.violations);
  suppressedViolations.push(...observedValidation.suppressedViolations);
  warnings.push(
    ...findExpiringSuppressions(suppressedViolations, {
      today: options.today,
      intentionalViolationExpiryWarningDays
    })
  );
  warnings.push(...findUnusedSuppressions(spec, suppressedViolations, { today: options.today }));

  return {
    root,
    specFiles,
    sourceFiles,
    importCount: imports.length,
    observedDependencies,
    spec,
    violations,
    warnings,
    suppressedViolations
  };
}

function findUnownedSourceFiles(sourceFiles: string[], ownership: ReturnType<typeof createOwnershipIndex>): Violation[] {
  return sourceFiles
    .filter((sourceFile) => ownership.findModules(sourceFile).length === 0)
    .map((sourceFile) => ({
      code: "unowned_source_file" as const,
      message: "Source file is not owned by any module path.",
      location: {
        filePath: sourceFile,
        line: 1
      },
      details: {
        suggestion: "Add a module path that owns this file, or exclude it from Axiom source discovery."
      }
    }));
}
