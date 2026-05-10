import path from "node:path";
import type { AxiomModule, SourceLocation, SuppressedViolation, Violation, ViolationCode } from "../axi/types.js";
import type { CheckResult } from "../validator/check.js";

export const checkJsonSchemaVersion = "axiom.check.v3";

export interface CheckJsonLocation {
  filePath: string;
  line: number;
  column?: number;
}

export interface CheckJsonModule {
  name: string;
  paths: string[];
  layer?: string;
  purpose?: string;
  depends: string[];
  exposes: string[];
  hides: string[];
  forbidsModules: string[];
  suppressions: CheckJsonSuppression[];
  location: CheckJsonLocation;
}

export interface CheckJsonSuppression {
  code: string;
  toModule: string;
  expiresOn: string;
  reason: string;
  location: CheckJsonLocation;
}

export interface CheckJsonObservedDependency {
  fromModule: string;
  toModule: string;
  import: {
    filePath: string;
    line: number;
    specifier: string;
    resolvedPath?: string;
  };
}

export interface CheckJsonViolation {
  code: ViolationCode;
  message: string;
  location?: CheckJsonLocation;
  details: Record<string, unknown>;
}

export interface CheckJsonSuppressedViolation extends CheckJsonViolation {
  suppression: {
    fromModule: string;
    toModule: string;
    code: ViolationCode;
    expiresOn: string;
    reason: string;
    location: CheckJsonLocation;
  };
}

export interface CheckJsonResult {
  schemaVersion: typeof checkJsonSchemaVersion;
  ok: boolean;
  root: string;
  summary: {
    modules: number;
    specFiles: number;
    sourceFiles: number;
    importsScanned: number;
    observedDependencies: number;
    violations: number;
    suppressedViolations: number;
    warnings: number;
  };
  specFiles: string[];
  sourceFiles: string[];
  modules: CheckJsonModule[];
  observedDependencies: CheckJsonObservedDependency[];
  violations: CheckJsonViolation[];
  suppressedViolations: CheckJsonSuppressedViolation[];
  warnings: CheckJsonViolation[];
}

export function toCheckJson(result: CheckResult): CheckJsonResult {
  return {
    schemaVersion: checkJsonSchemaVersion,
    ok: result.violations.length === 0,
    root: normalizePath(result.root),
    summary: {
      modules: result.spec.modules.length,
      specFiles: result.specFiles.length,
      sourceFiles: result.sourceFiles.length,
      importsScanned: result.importCount,
      observedDependencies: result.observedDependencies.length,
      violations: result.violations.length,
      suppressedViolations: result.suppressedViolations.length,
      warnings: result.warnings.length
    },
    specFiles: result.specFiles.map((filePath) => relativePath(result.root, filePath)),
    sourceFiles: result.sourceFiles.map((filePath) => relativePath(result.root, filePath)),
    modules: result.spec.modules.map((module) => toJsonModule(result.root, module)),
    observedDependencies: result.observedDependencies.map((dependency) => ({
      fromModule: dependency.fromModule,
      toModule: dependency.toModule,
      import: {
        filePath: relativePath(result.root, dependency.importRecord.filePath),
        line: dependency.importRecord.line,
        specifier: dependency.importRecord.specifier,
        ...(dependency.importRecord.resolvedPath
          ? { resolvedPath: relativePath(result.root, dependency.importRecord.resolvedPath) }
          : {})
      }
    })),
    violations: result.violations.map((violation) => toJsonViolation(result.root, violation)),
    suppressedViolations: result.suppressedViolations.map((suppressedViolation) =>
      toJsonSuppressedViolation(result.root, suppressedViolation)
    ),
    warnings: result.warnings.map((warning) => toJsonViolation(result.root, warning))
  };
}

export function formatCheckJson(result: CheckResult): string {
  return JSON.stringify(toCheckJson(result), null, 2);
}

function toJsonModule(root: string, module: AxiomModule): CheckJsonModule {
  return {
    name: module.name,
    paths: [...module.paths],
    ...(module.layer ? { layer: module.layer } : {}),
    ...(module.purpose ? { purpose: module.purpose } : {}),
    depends: module.depends.map((dependency) => dependency.name),
    exposes: module.exposes.map((rule) => rule.pattern),
    hides: module.hides.map((rule) => rule.pattern),
    forbidsModules: module.forbidsModules.map((forbidden) => forbidden.name),
    suppressions: module.suppressions.map((suppression) => ({
      code: suppression.code,
      toModule: suppression.target.name,
      expiresOn: suppression.expiresOn,
      reason: suppression.reason,
      location: toJsonLocation(root, suppression.location)
    })),
    location: toJsonLocation(root, module.location)
  };
}

function toJsonViolation(root: string, violation: Violation): CheckJsonViolation {
  return {
    code: violation.code,
    message: violation.message,
    ...(violation.location ? { location: toJsonLocation(root, violation.location) } : {}),
    details: normalizeDetails(root, violation.details ?? {})
  };
}

function toJsonSuppressedViolation(root: string, suppressedViolation: SuppressedViolation): CheckJsonSuppressedViolation {
  return {
    ...toJsonViolation(root, suppressedViolation.violation),
    suppression: {
      fromModule: suppressedViolation.suppression.fromModule,
      toModule: suppressedViolation.suppression.toModule,
      code: suppressedViolation.suppression.code,
      expiresOn: suppressedViolation.suppression.expiresOn,
      reason: suppressedViolation.suppression.reason,
      location: toJsonLocation(root, suppressedViolation.suppression.location)
    }
  };
}

function normalizeDetails(root: string, value: Record<string, unknown>): Record<string, unknown> {
  return normalizeValue(root, value) as Record<string, unknown>;
}

function normalizeValue(root: string, value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(root, item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (isSourceLocation(value)) {
    return toJsonLocation(root, value);
  }

  const entries = Object.entries(value).map(([key, item]) => {
    if (key === "filePath" || key === "resolvedPath") {
      return [key, normalizeMaybePath(root, item)];
    }

    return [key, normalizeValue(root, item)];
  });

  return Object.fromEntries(entries);
}

function isSourceLocation(value: object): value is SourceLocation {
  const maybeLocation = value as Partial<SourceLocation>;
  return typeof maybeLocation.filePath === "string" && typeof maybeLocation.line === "number";
}

function toJsonLocation(root: string, location: SourceLocation): CheckJsonLocation {
  return {
    filePath: relativePath(root, location.filePath),
    line: location.line,
    ...(location.column === undefined ? {} : { column: location.column })
  };
}

function normalizeMaybePath(root: string, value: unknown): unknown {
  return typeof value === "string" ? relativePath(root, value) : value;
}

function relativePath(root: string, filePath: string): string {
  if (!path.isAbsolute(filePath)) {
    return normalizePath(filePath);
  }

  const relative = path.relative(root, filePath);
  return normalizePath(relative.length > 0 ? relative : ".");
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}
