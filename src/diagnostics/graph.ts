import path from "node:path";
import type { ModuleRef, PathRef, Violation, ViolationCode } from "../axi/types.js";
import type { CheckResult } from "../validator/check.js";
import { computeDrift } from "./graphDrift.js";
import { formatGraphResultFromGraph } from "./graphHuman.js";
import { formatGraphMarkdownFromGraph } from "./graphMarkdown.js";
import { formatGraphMermaidFromGraph } from "./graphMermaid.js";
import {
  buildArchitectureSummary,
  type GraphJsonArchitectureSummary
} from "./graphArchitecture.js";
import { buildAdvisorySignalCoverage } from "./advisorySignalCoverage.js";
import {
  normalizeDetails,
  normalizePath,
  readString,
  relativePath,
  toJsonLocation
} from "./graphValues.js";

export const graphJsonSchemaVersion = "axiom.graph.v12";

export interface GraphJsonLocation {
  filePath: string;
  line: number;
  column?: number;
}

interface GraphJsonModule {
  name: string;
  paths: string[];
  layer?: string;
  purpose?: string;
  depends: string[];
  forbidsModules: string[];
  exposes: string[];
  hides: string[];
  location: GraphJsonLocation;
}

interface GraphJsonEdge {
  fromModule: string;
  toModule: string;
  ruleLocation?: GraphJsonLocation;
}

interface GraphJsonVisibilityRule {
  module: string;
  pattern: string;
  ruleLocation: GraphJsonLocation;
}

export interface GraphJsonImportSite {
  filePath: string;
  line: number;
  specifier: string;
  resolvedPath?: string;
}

export interface GraphJsonObservedDependency {
  fromModule: string;
  toModule: string;
  import: GraphJsonImportSite;
  violations: GraphJsonDependencyViolation[];
  intentionalViolations: GraphJsonIntentionalDependencyViolation[];
}

export interface GraphJsonViolation {
  code: ViolationCode;
  message: string;
  location?: GraphJsonLocation;
  suggestion?: string;
  details?: Record<string, unknown>;
}

interface GraphJsonDependencyViolation {
  code: ViolationCode;
  message: string;
  suggestion?: string;
}

interface GraphJsonIntentionalDependencyViolation extends GraphJsonDependencyViolation {
  kind: "intentional_violation";
  contract: {
    acceptedUntil: string;
    reason: string;
    pathScope?: string;
    ruleLocation: GraphJsonLocation;
  };
}

export interface GraphJsonIntentionalDebt {
  kind: "intentional_violation";
  code: ViolationCode;
  message: string;
  fromModule: string;
  toModule: string;
  acceptedUntil: string;
  reason: string;
  pathScope?: string;
  contractLocation: GraphJsonLocation;
  location?: GraphJsonLocation;
  details?: Record<string, unknown>;
  suggestion?: string;
}

export interface GraphFormatOptions {
  violationsOnly?: boolean;
  attention?: boolean;
  observe?: boolean;
  driftOnly?: boolean;
  portable?: boolean;
  baseline?: GraphBaseline;
}

export interface GraphBaseline {
  path?: string;
  schemaVersion?: string;
  observedDependencies: GraphBaselineObservedDependency[];
}

export interface GraphBaselineObservedDependency {
  fromModule: string;
  toModule: string;
  import: GraphJsonImportSite;
}

export interface GraphJsonDrift {
  kind: "advisory_observed_edge_drift";
  baseline: {
    path?: string;
    schemaVersion?: string;
    observedDependencies: number;
  };
  newObservedEdges: GraphJsonDriftEdge[];
  removedObservedEdges: GraphJsonDriftEdge[];
}

interface GraphJsonDriftEdge {
  fromModule: string;
  toModule: string;
  imports: GraphJsonImportSite[];
  violations: GraphJsonDependencyViolation[];
  intentionalViolations: GraphJsonIntentionalDependencyViolation[];
}

export interface GraphJsonResult {
  schemaVersion: typeof graphJsonSchemaVersion;
  root: string;
  artifact?: {
    kind: "graph_baseline";
    pathMode: "portable";
  };
  filters: {
    violationsOnly: boolean;
    attention: boolean;
  };
  architectureSummary: GraphJsonArchitectureSummary;
  summary: {
    modules: number;
    declaredDependencies: number;
    forbiddenDependencies: number;
    exposedPaths: number;
    hiddenPaths: number;
    observedDependencies: number;
    shownObservedDependencies: number;
    violations: number;
    intentionalViolations: number;
    warnings: number;
  };
  modules: GraphJsonModule[];
  declaredDependencies: GraphJsonEdge[];
  forbiddenDependencies: GraphJsonEdge[];
  exposedPaths: GraphJsonVisibilityRule[];
  hiddenPaths: GraphJsonVisibilityRule[];
  allObservedDependencies: GraphJsonObservedDependency[];
  shownObservedDependencies: GraphJsonObservedDependency[];
  observedDependencies: GraphJsonObservedDependency[];
  violations: GraphJsonViolation[];
  intentionalDebt: GraphJsonIntentionalDebt[];
  warnings: GraphJsonViolation[];
  drift?: GraphJsonDrift;
}

export function formatGraphResult(result: CheckResult, options: GraphFormatOptions = {}): string {
  const graph = toGraphJson(result, options);
  // Keep CLI text rendering behind graphHuman.ts; this module owns the graph payload assembly.
  return formatGraphResultFromGraph(graph, options);
}

export function formatGraphJson(result: CheckResult, options: GraphFormatOptions = {}): string {
  return JSON.stringify(toGraphJson(result, options), null, 2);
}

export function formatGraphMarkdown(result: CheckResult, options: GraphFormatOptions = {}): string {
  const graph = toGraphJson(result, options);
  return formatGraphMarkdownFromGraph(graph, options);
}

export function formatGraphMermaid(result: CheckResult, options: GraphFormatOptions = {}): string {
  const graph = toGraphJson(result, options);
  return formatGraphMermaidFromGraph(graph, options);
}

export function toGraphJson(result: CheckResult, options: GraphFormatOptions = {}): GraphJsonResult {
  const declaredDependencies = result.spec.modules.flatMap((module) =>
    module.depends.map((dependency) => toEdge(result.root, module.name, dependency))
  );
  const forbiddenDependencies = result.spec.modules.flatMap((module) =>
    module.forbidsModules.map((forbidden) => toEdge(result.root, module.name, forbidden))
  );
  const exposedPaths = result.spec.modules.flatMap((module) =>
    module.exposes.map((rule) => toVisibilityRule(result.root, module.name, rule))
  );
  const hiddenPaths = result.spec.modules.flatMap((module) =>
    module.hides.map((rule) => toVisibilityRule(result.root, module.name, rule))
  );
  const allObservedDependencies = result.observedDependencies.map((dependency) =>
    toObservedDependency(result.root, dependency, result.violations, result.suppressedViolations)
  );
  const observedDependencies = options.violationsOnly
    ? allObservedDependencies.filter(
        (dependency) => dependency.violations.length > 0 || dependency.intentionalViolations.length > 0
      )
    : allObservedDependencies;
  const intentionalDebt = result.suppressedViolations
    .map((suppressedViolation) => toIntentionalDebt(result.root, suppressedViolation))
    .sort(compareIntentionalDebt);
  const drift = options.baseline ? computeDrift(options.baseline, allObservedDependencies) : undefined;
  const filters = {
    violationsOnly: options.violationsOnly === true,
    attention: options.attention === true
  };
  const summary = {
    modules: result.spec.modules.length,
    declaredDependencies: declaredDependencies.length,
    forbiddenDependencies: forbiddenDependencies.length,
    exposedPaths: exposedPaths.length,
    hiddenPaths: hiddenPaths.length,
    observedDependencies: allObservedDependencies.length,
    shownObservedDependencies: observedDependencies.length,
    violations: result.violations.length,
    intentionalViolations: result.suppressedViolations.length,
    warnings: result.warnings.length
  };
  const violations = result.violations.map((violation) => toJsonViolation(result.root, violation));
  const warnings = result.warnings.map((warning) => toJsonViolation(result.root, warning));
  const advisorySignalCoverage = buildAdvisorySignalCoverage({
    options: result.advisorySignalOptions,
    warningCodes: result.warnings.map((warning) => warning.code),
    declaredModuleCount: result.spec.modules.length,
    exposedPathCount: exposedPaths.length
  });

  return {
    schemaVersion: graphJsonSchemaVersion,
    root: options.portable === true ? "." : normalizePath(result.root),
    ...(options.portable === true
      ? {
          artifact: {
            kind: "graph_baseline" as const,
            pathMode: "portable" as const
          }
        }
      : {}),
    filters,
    architectureSummary: buildArchitectureSummary({
      filters,
      summary,
      allObservedDependencies,
      violations,
      intentionalDebt,
      warnings,
      drift,
      advisorySignalCoverage,
      options
    }),
    summary,
    modules: result.spec.modules.map((module) => ({
      name: module.name,
      paths: [...module.paths],
      ...(module.layer ? { layer: module.layer } : {}),
      ...(module.purpose ? { purpose: module.purpose } : {}),
      depends: module.depends.map((dependency) => dependency.name),
      forbidsModules: module.forbidsModules.map((forbidden) => forbidden.name),
      exposes: module.exposes.map((rule) => rule.pattern),
      hides: module.hides.map((rule) => rule.pattern),
      location: toJsonLocation(result.root, module.location)
    })),
    declaredDependencies,
    forbiddenDependencies,
    exposedPaths,
    hiddenPaths,
    allObservedDependencies,
    shownObservedDependencies: observedDependencies,
    observedDependencies,
    violations,
    intentionalDebt,
    warnings,
    ...(drift ? { drift } : {})
  };
}

function compareIntentionalDebt(left: GraphJsonIntentionalDebt, right: GraphJsonIntentionalDebt): number {
  return `${left.acceptedUntil}\0${left.fromModule}->${left.toModule}\0${left.code}\0${left.pathScope ?? ""}`.localeCompare(
    `${right.acceptedUntil}\0${right.fromModule}->${right.toModule}\0${right.code}\0${right.pathScope ?? ""}`
  );
}

function toJsonViolation(root: string, violation: Violation): GraphJsonViolation {
  return {
    code: violation.code,
    message: violation.message,
    ...(violation.location ? { location: toJsonLocation(root, violation.location) } : {}),
    ...(readSuggestion(violation) ? { suggestion: readSuggestion(violation) } : {}),
    ...(violation.details ? { details: normalizeDetails(root, violation.details) } : {})
  };
}

function toIntentionalDebt(
  root: string,
  suppressedViolation: CheckResult["suppressedViolations"][number]
): GraphJsonIntentionalDebt {
  const violation = suppressedViolation.violation;
  const suppression = suppressedViolation.suppression;

  return {
    kind: "intentional_violation",
    code: violation.code,
    message: violation.message,
    fromModule: suppression.fromModule,
    toModule: suppression.toModule,
    acceptedUntil: suppression.expiresOn,
    reason: suppression.reason,
    ...(suppression.pathScope ? { pathScope: suppression.pathScope } : {}),
    contractLocation: toJsonLocation(root, suppression.location),
    ...(violation.location ? { location: toJsonLocation(root, violation.location) } : {}),
    ...(violation.details ? { details: normalizeDetails(root, violation.details) } : {}),
    ...(readSuggestion(violation) ? { suggestion: readSuggestion(violation) } : {})
  };
}

function toEdge(root: string, fromModule: string, target: ModuleRef): GraphJsonEdge {
  return {
    fromModule,
    toModule: target.name,
    ruleLocation: toJsonLocation(root, target.location)
  };
}

function toVisibilityRule(root: string, module: string, rule: PathRef): GraphJsonVisibilityRule {
  return {
    module,
    pattern: rule.pattern,
    ruleLocation: toJsonLocation(root, rule.location)
  };
}

function toObservedDependency(
  root: string,
  dependency: CheckResult["observedDependencies"][number],
  violations: Violation[],
  suppressedViolations: CheckResult["suppressedViolations"]
): GraphJsonObservedDependency {
  return {
    fromModule: dependency.fromModule,
    toModule: dependency.toModule,
    import: {
      filePath: relativePath(root, dependency.importRecord.filePath),
      line: dependency.importRecord.line,
      specifier: dependency.importRecord.specifier,
      ...(dependency.importRecord.resolvedPath
        ? { resolvedPath: relativePath(root, dependency.importRecord.resolvedPath) }
        : {})
    },
    violations: violations
      .filter((violation) => matchesObservedDependency(violation, dependency))
      .map((violation) => ({
        code: violation.code,
        message: violation.message,
        ...(readSuggestion(violation) ? { suggestion: readSuggestion(violation) } : {})
      })),
    intentionalViolations: suppressedViolations
      .filter((suppressedViolation) => matchesObservedDependency(suppressedViolation.violation, dependency))
      .map((suppressedViolation) => ({
        code: suppressedViolation.violation.code,
        kind: "intentional_violation",
        message: suppressedViolation.violation.message,
        ...(readSuggestion(suppressedViolation.violation)
          ? { suggestion: readSuggestion(suppressedViolation.violation) }
          : {}),
        contract: {
          acceptedUntil: suppressedViolation.suppression.expiresOn,
          reason: suppressedViolation.suppression.reason,
          ...(suppressedViolation.suppression.pathScope
            ? { pathScope: suppressedViolation.suppression.pathScope }
            : {}),
          ruleLocation: toJsonLocation(root, suppressedViolation.suppression.location)
        }
      }))
  };
}

function matchesObservedDependency(
  violation: Violation,
  dependency: CheckResult["observedDependencies"][number]
): boolean {
  if (!violation.location) {
    return false;
  }

  if (
    path.resolve(violation.location.filePath) !== path.resolve(dependency.importRecord.filePath) ||
    violation.location.line !== dependency.importRecord.line
  ) {
    return false;
  }

  const fromModule = readString(violation.details?.fromModule);
  const toModule = readString(violation.details?.toModule);
  const specifier = readString(violation.details?.specifier);

  return (
    (!fromModule || fromModule === dependency.fromModule) &&
    (!toModule || toModule === dependency.toModule) &&
    (!specifier || specifier === dependency.importRecord.specifier)
  );
}

function readSuggestion(violation: Violation): string | undefined {
  return readString(violation.details?.suggestion);
}
