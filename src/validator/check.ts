import fs from "node:fs";
import path from "node:path";
import type {
  AxiomSpec,
  ImportRecord,
  LocalExportRecord,
  ObservedDependency,
  SuppressedViolation,
  Violation
} from "../axi/types.js";
import { parseAxiomText } from "../axi/parser.js";
import { applyDiscoveryOverrides, loadConfig } from "../config/config.js";
import { findAxiomFiles, findSourceFiles } from "../fs/discover.js";
import { readTextFile } from "../fs/text.js";
import { createImportResolver } from "../scanner/importResolver.js";
import { scanSourceFile } from "../scanner/importScanner.js";
import { createOwnershipIndex, validateOwnership } from "./ownership.js";
import {
  applySuppressions,
  buildObservedDependencies,
  findCouplingConcentrationWarnings,
  findDeepInternalImportWarnings,
  findExpiringSuppressions,
  findPublicApiSurfaceWarnings,
  findUnresolvedImportWarnings,
  validateModuleSurfaceConsistency,
  findUnusedSuppressions,
  validateObservedDependencies,
  validateSpec
} from "./validate.js";

export type AdoptionMode = "loose" | "warn-unowned" | "strict";

export interface CheckOptions {
  root: string;
  configPath?: string;
  include?: string[];
  exclude?: string[];
  specPaths?: string[];
  adoptionMode?: AdoptionMode;
  today?: string;
  intentionalViolationExpiryWarningDays?: number;
  warnUnresolvedImports?: boolean;
  warnPublicApiSurface?: boolean;
  warnCouplingConcentration?: boolean;
  warnDeepInternalImports?: boolean;
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
  const config = applyDiscoveryOverrides(loadConfig(root, options.configPath), {
    include: options.include,
    exclude: options.exclude
  });
  const intentionalViolationExpiryWarningDays =
    options.intentionalViolationExpiryWarningDays ?? config.intentionalViolationExpiryWarningDays;
  const warnUnresolvedImports = options.warnUnresolvedImports ?? config.warnUnresolvedImports;
  const warnPublicApiSurface = options.warnPublicApiSurface ?? config.warnPublicApiSurface;
  const warnCouplingConcentration = options.warnCouplingConcentration ?? config.warnCouplingConcentration;
  const warnDeepInternalImports = options.warnDeepInternalImports ?? config.warnDeepInternalImports;
  const specFiles = options.specPaths?.length ? resolveExplicitSpecFiles(root, options.specPaths) : findAxiomFiles(root, config);
  const sourceFiles = findSourceFiles(root, config);
  const resolver = createImportResolver({ root, tsconfigPath: config.tsconfig });
  const violations: Violation[] = [];
  const warnings: Violation[] = [];
  const suppressedViolations: SuppressedViolation[] = [];
  const spec: AxiomSpec = { modules: [], layerOrders: [] };

  if (specFiles.length === 0) {
    violations.push({
      code: "no_spec_files",
      message: `No .axi files found under ${root}.`,
      details: {
        suggestion:
          "Run `axi infer --root . > axiom/main.axi` from the project root to create a starter contract, or pass an external pilot contract with `--spec <path-to-contract.axi>`."
      }
    });
  }

  for (const specFile of specFiles) {
    const text = readTextFile(specFile);
    const parsed = parseAxiomText(specFile, text);
    spec.modules.push(...parsed.modules);
    spec.layerOrders.push(...parsed.layerOrders);
    violations.push(...parsed.violations);
  }

  violations.push(...validateSpec(spec, { today: options.today }));

  const sourceScans = sourceFiles.map((sourceFile) => scanSourceFile(sourceFile, { resolver }));
  const imports: ImportRecord[] = sourceScans.flatMap((scan) => scan.imports);
  const localExports: LocalExportRecord[] = sourceScans.flatMap((scan) => scan.localExports);
  const ownership = createOwnershipIndex(root, spec.modules);
  violations.push(...validateOwnership(sourceFiles, ownership));
  const unownedSourceFileDiagnostics = spec.modules.length > 0 ? findUnownedSourceFiles(sourceFiles, ownership) : [];

  if (adoptionMode === "strict") {
    violations.push(...unownedSourceFileDiagnostics);
  } else if (adoptionMode === "warn-unowned") {
    warnings.push(...unownedSourceFileDiagnostics);
  }

  const observedDependencies = buildObservedDependencies(imports, ownership);

  const observedViolations = [
    ...validateObservedDependencies(spec, observedDependencies, root),
    ...validateModuleSurfaceConsistency(spec, imports, localExports, ownership, root)
  ];
  const observedValidation = applySuppressions(spec, observedViolations, {
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
  if (warnUnresolvedImports) {
    warnings.push(...findUnresolvedImportWarnings(imports, ownership, root));
  }
  if (warnPublicApiSurface) {
    warnings.push(...findPublicApiSurfaceWarnings(spec, imports, ownership, root));
  }
  if (warnCouplingConcentration) {
    warnings.push(...findCouplingConcentrationWarnings(observedDependencies));
  }
  if (warnDeepInternalImports) {
    warnings.push(...findDeepInternalImportWarnings(spec, observedDependencies, sourceFiles, ownership, root));
  }

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

function resolveExplicitSpecFiles(root: string, specPaths: string[]): string[] {
  const files: string[] = [];

  for (const specPath of specPaths) {
    const resolvedPath = resolveSpecPath(root, specPath);

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`Axiom spec not found: ${resolvedPath}`);
    }

    const stat = fs.statSync(resolvedPath);

    if (stat.isDirectory()) {
      const directorySpecs = findAxiomFiles(resolvedPath, { specs: ["**/*.axi"] });
      if (directorySpecs.length === 0) {
        throw new Error(`No .axi files found in explicit spec directory: ${resolvedPath}`);
      }
      files.push(...directorySpecs);
      continue;
    }

    if (!stat.isFile() || !resolvedPath.endsWith(".axi")) {
      throw new Error(`Axiom spec must be a .axi file or a directory containing .axi files: ${resolvedPath}`);
    }

    files.push(resolvedPath);
  }

  return [...new Set(files.map((filePath) => path.resolve(filePath)))].sort();
}

function resolveSpecPath(root: string, specPath: string): string {
  if (path.isAbsolute(specPath)) {
    return specPath;
  }

  const fromCwd = path.resolve(specPath);
  if (fs.existsSync(fromCwd)) {
    return fromCwd;
  }

  return path.resolve(root, specPath);
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
