import fs from "node:fs";
import path from "node:path";
import type {
  AxiomSpec,
  DynamicDependencyExpressionRecord,
  ImportRecord,
  LocalExportRecord,
  ObservedDependency,
  SourceFileMetric,
  SuppressedViolation,
  Violation
} from "../axi/types.js";
import { parseAxiomText } from "../axi/parser.js";
import { applyDiscoveryOverrides, loadConfig } from "../config/config.js";
import { findAxiomFiles, findSourceFiles } from "../fs/discover.js";
import { readTextFile } from "../fs/text.js";
import { createImportResolver } from "../scanner/importResolver.js";
import { scanSourceFile } from "../scanner/importScanner.js";
import { findCouplingConcentrationWarnings } from "./couplingWarnings.js";
import { findLargeModuleFileWarnings, summarizeTopLargestFiles } from "./largeFilePressure.js";
import { createOwnershipIndex, validateOwnership } from "./ownership.js";
import {
  applySuppressions,
  buildObservedDependencies,
  findDeepInternalImportWarnings,
  findDynamicDependencyExpressionWarnings,
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
  warnDynamicImports?: boolean;
  warnPublicApiSurface?: boolean;
  warnCouplingConcentration?: boolean;
  warnDeepInternalImports?: boolean;
  warnLargeFiles?: boolean;
}

export interface AdvisorySignalOptions {
  unresolvedImports: boolean;
  dynamicImports: boolean;
  publicApiSurface: boolean;
  couplingConcentration: boolean;
  deepInternalImports: boolean;
  largeFiles: boolean;
}

export interface CheckResult {
  root: string;
  specFiles: string[];
  sourceFiles: string[];
  sourceFileMetrics: SourceFileMetric[];
  importCount: number;
  observedDependencies: ObservedDependency[];
  advisorySignalOptions: AdvisorySignalOptions;
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
  const warnDynamicImports = options.warnDynamicImports ?? config.warnDynamicImports;
  const warnPublicApiSurface = options.warnPublicApiSurface ?? config.warnPublicApiSurface;
  const warnCouplingConcentration = options.warnCouplingConcentration ?? config.warnCouplingConcentration;
  const warnDeepInternalImports = options.warnDeepInternalImports ?? config.warnDeepInternalImports;
  const warnLargeFiles = options.warnLargeFiles ?? config.warnLargeFiles;
  const specFiles = options.specPaths?.length ? resolveExplicitSpecFiles(root, options.specPaths) : findAxiomFiles(root, config);
  const sourceFiles = findSourceFiles(root, config);
  const resolver = createImportResolver({ root, tsconfigPath: config.tsconfig });
  const violations: Violation[] = [];
  const warnings: Violation[] = [];
  const suppressedViolations: SuppressedViolation[] = [];
  const spec: AxiomSpec = { modules: [], layerOrders: [] };

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
  const dynamicDependencyExpressions: DynamicDependencyExpressionRecord[] = sourceScans.flatMap(
    (scan) => scan.dynamicDependencyExpressions
  );
  const localExports: LocalExportRecord[] = sourceScans.flatMap((scan) => scan.localExports);
  const sourceFileMetrics = sourceScans.map((scan) => scan.metrics);

  if (specFiles.length === 0) {
    violations.push(buildNoSpecFilesViolation(root, sourceFiles, imports.length, sourceFileMetrics));
  }

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
    root,
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
  if (warnDynamicImports) {
    warnings.push(...findDynamicDependencyExpressionWarnings(dynamicDependencyExpressions, ownership, root));
  }
  if (warnPublicApiSurface) {
    warnings.push(...findPublicApiSurfaceWarnings(spec, imports, ownership, root));
  }
  if (warnCouplingConcentration) {
    warnings.push(...findCouplingConcentrationWarnings(observedDependencies, root));
  }
  if (warnDeepInternalImports) {
    warnings.push(...findDeepInternalImportWarnings(spec, observedDependencies, sourceFiles, ownership, root));
  }
  if (warnLargeFiles) {
    warnings.push(...findLargeModuleFileWarnings(sourceFileMetrics, root));
  }

  return {
    root,
    specFiles,
    sourceFiles,
    sourceFileMetrics,
    importCount: imports.length,
    observedDependencies,
    advisorySignalOptions: {
      unresolvedImports: warnUnresolvedImports,
      dynamicImports: warnDynamicImports,
      publicApiSurface: warnPublicApiSurface,
      couplingConcentration: warnCouplingConcentration,
      deepInternalImports: warnDeepInternalImports,
      largeFiles: warnLargeFiles
    },
    spec,
    violations,
    warnings,
    suppressedViolations
  };
}

function buildNoSpecFilesViolation(
  root: string,
  sourceFiles: string[],
  importCount: number,
  sourceFileMetrics: SourceFileMetric[]
): Violation {
  const scopeHints = detectFirstRunScopeHints(root, sourceFiles);

  return {
    code: "no_spec_files",
    message: `No .axi files found under ${root}.`,
    details: {
      sourceFiles: sourceFiles.length,
      importsScanned: importCount,
      topLargestFiles: summarizeTopLargestFiles(root, sourceFileMetrics),
      inferredModuleCandidates: inferModuleCandidates(root, sourceFiles),
      ...(scopeHints.length > 0 ? { scopeHints } : {}),
      note:
        "Axiom can scan imports before a contract, but it cannot compare declared-vs-observed architecture intent yet. A quiet import graph can still hide intra-file responsibility concentration.",
      suggestion:
        "Run `axi infer --root . > axiom/main.axi` from the project root to create a starter contract, or pass an external pilot contract with `--spec <path-to-contract.axi>`."
    }
  };
}

function detectFirstRunScopeHints(root: string, sourceFiles: string[]): Array<Record<string, unknown>> {
  const matchedFolders: string[] = [];
  const samplePaths: string[] = [];

  for (const sourceFile of sourceFiles) {
    const relativeFilePath = relativePath(root, sourceFile);
    const segments = relativeFilePath.split("/").filter(Boolean);
    const scopeNoise = findLikelyScopeNoise(segments);
    if (!scopeNoise) {
      continue;
    }

    if (!matchedFolders.includes(scopeNoise.folder)) {
      matchedFolders.push(scopeNoise.folder);
    }

    if (!samplePaths.includes(relativeFilePath)) {
      samplePaths.push(relativeFilePath);
    }
  }

  if (samplePaths.length === 0) {
    return [];
  }

  return [
    {
      kind: "possible_scan_scope_noise",
      message:
        "This first run included files under hidden, generated, runtime, profile, smoke, or benchmark-looking folders. Confirm the scan scope before turning the result into a contract.",
      matchedFolders: matchedFolders.slice(0, 8),
      samplePaths: samplePaths.slice(0, 8),
      suggestion:
        '`axi check --root . --include "src/**"` for a source-only pilot, or add project-specific `exclude` entries in axiom.config.json for runtime/generated/profile folders.'
    }
  ];
}

function findLikelyScopeNoise(segments: string[]): { folder: string } | undefined {
  const directorySegments = segments.slice(0, -1);
  const firstSegment = directorySegments[0];
  const insideCommonSourceRoot = firstSegment === "src" || firstSegment === "apps" || firstSegment === "packages";

  for (let index = 0; index < directorySegments.length; index += 1) {
    const segment = directorySegments[index] ?? "";
    const lowerSegment = segment.toLowerCase();

    if (isHiddenDirectorySegment(segment)) {
      return { folder: directorySegments.slice(0, index + 1).join("/") };
    }

    if (hasGeneratedIndicator(lowerSegment)) {
      return { folder: directorySegments.slice(0, index + 1).join("/") };
    }

    if (!insideCommonSourceRoot && hasRuntimeScopeIndicator(lowerSegment)) {
      return { folder: directorySegments.slice(0, index + 1).join("/") };
    }
  }

  return undefined;
}

function isHiddenDirectorySegment(segment: string): boolean {
  return segment.startsWith(".") && segment.length > 1;
}

function hasGeneratedIndicator(segment: string): boolean {
  return segment.includes("generated") || segment.includes("codegen");
}

function hasRuntimeScopeIndicator(segment: string): boolean {
  return (
    segment.includes("runtime") ||
    segment.includes("profile") ||
    segment.includes("smoke") ||
    segment.includes("benchmark") ||
    segment.includes("artifact")
  );
}

function inferModuleCandidates(root: string, sourceFiles: string[]): Array<Record<string, number | string>> {
  const candidates = new Map<string, { name: string; path: string; fileCount: number }>();

  for (const sourceFile of sourceFiles) {
    const relativeFilePath = relativePath(root, sourceFile);
    const segments = relativeFilePath.split("/").filter(Boolean);
    if (segments.length === 0) {
      continue;
    }

    const candidate = inferModuleCandidateFromSegments(segments);
    const existing = candidates.get(candidate.path) ?? {
      name: candidate.name,
      path: candidate.path,
      fileCount: 0
    };
    existing.name = preferModuleCandidateName(existing.name, candidate.name);
    existing.fileCount += 1;
    candidates.set(candidate.path, existing);
  }

  return [...candidates.values()]
    .sort((left, right) => {
      if (right.fileCount !== left.fileCount) {
        return right.fileCount - left.fileCount;
      }

      return left.path.localeCompare(right.path);
    })
    .slice(0, 8);
}

function inferModuleCandidateFromSegments(segments: string[]): { name: string; path: string } {
  if (segments[0] === "src") {
    const secondSegment = segments[1];
    if (!secondSegment || isSourceFileSegment(secondSegment)) {
      return { name: sourceRootEntryModuleName(secondSegment) ?? "SrcRoot", path: "src/*" };
    }

    return { name: toPascalCase(secondSegment), path: `src/${secondSegment}/**` };
  }

  const firstSegment = segments[0] ?? "root";
  if (isSourceFileSegment(firstSegment)) {
    return { name: "Root", path: "*" };
  }

  return { name: toPascalCase(firstSegment), path: `${firstSegment}/**` };
}

function isSourceFileSegment(segment: string): boolean {
  return /\.[cm]?[jt]sx?$/.test(segment);
}

function sourceRootEntryModuleName(fileName: string | undefined): string | undefined {
  if (!fileName || !isSourceFileSegment(fileName)) {
    return undefined;
  }

  const stem = fileName.replace(/\.[^.]+$/, "").toLowerCase();
  if (stem === "bootstrap") {
    return "Bootstrap";
  }

  if (
    stem === "main" ||
    stem === "index" ||
    stem === "app" ||
    stem === "entry" ||
    stem === "startup" ||
    stem === "start"
  ) {
    return "AppEntry";
  }

  return undefined;
}

function preferModuleCandidateName(existingName: string, candidateName: string): string {
  if ((existingName === "SrcRoot" || existingName === "Root") && candidateName !== existingName) {
    return candidateName;
  }

  return existingName;
}

function toPascalCase(value: string): string {
  const words = value
    .split(/[^A-Za-z0-9]+/)
    .map((word) => word.trim())
    .filter(Boolean);

  const name = words.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join("");
  return name || "Module";
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

function relativePath(root: string, filePath: string): string {
  return path.relative(root, filePath).replace(/\\/g, "/");
}
