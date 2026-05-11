import path from "node:path";
import type { ModuleRef, PathRef, SourceLocation, Violation, ViolationCode } from "../axi/types.js";
import type { CheckResult } from "../validator/check.js";

export const graphJsonSchemaVersion = "axiom.graph.v5";

interface GraphJsonLocation {
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

interface GraphJsonObservedDependency {
  fromModule: string;
  toModule: string;
  import: {
    filePath: string;
    line: number;
    specifier: string;
    resolvedPath?: string;
  };
  violations: GraphJsonDependencyViolation[];
  intentionalViolations: GraphJsonIntentionalDependencyViolation[];
}

interface GraphJsonViolation {
  code: ViolationCode;
  message: string;
  location?: GraphJsonLocation;
  suggestion?: string;
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
    ruleLocation: GraphJsonLocation;
  };
}

export interface GraphFormatOptions {
  violationsOnly?: boolean;
}

export interface GraphJsonResult {
  schemaVersion: typeof graphJsonSchemaVersion;
  root: string;
  filters: {
    violationsOnly: boolean;
  };
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
  observedDependencies: GraphJsonObservedDependency[];
  violations: GraphJsonViolation[];
  warnings: GraphJsonViolation[];
}

export function formatGraphResult(result: CheckResult, options: GraphFormatOptions = {}): string {
  const graph = toGraphJson(result, options);
  const lines = [
    options.violationsOnly ? "Axiom graph (violations only)." : "Axiom graph.",
    `modules: ${graph.summary.modules}`,
    `declared dependencies: ${graph.summary.declaredDependencies}`,
    `forbidden dependencies: ${graph.summary.forbiddenDependencies}`,
    `observed dependencies: ${formatObservedDependencyCount(graph)}`,
    `violations: ${graph.summary.violations}`,
    `intentional violations: ${graph.summary.intentionalViolations}`,
    `warnings: ${graph.summary.warnings}`,
  ];

  if (options.violationsOnly) {
    lines.push("");
    lines.push(...formatViolatingDependencies(graph));
    lines.push("");
    lines.push(...formatOtherViolations(graph));
    lines.push("");
    lines.push(...formatWarnings(graph));
    return lines.join("\n");
  }

  lines.push("");
  lines.push("modules:");
  lines.push(...formatModules(graph.modules));
  lines.push("");
  lines.push("declared dependencies:");
  lines.push(...formatEdges(graph.declaredDependencies, "  ", "->"));
  lines.push("");
  lines.push("forbidden dependencies:");
  lines.push(...formatEdges(graph.forbiddenDependencies, "  ", "-X->"));
  lines.push("");
  lines.push("visibility:");
  lines.push(...formatVisibility(graph.exposedPaths, "exposes"));
  lines.push(...formatVisibility(graph.hiddenPaths, "hides"));
  if (graph.exposedPaths.length === 0 && graph.hiddenPaths.length === 0) {
    lines.push("  none");
  }
  lines.push("");
  lines.push("observed dependencies:");

  if (graph.observedDependencies.length === 0) {
    lines.push("  none");
  } else {
    for (const dependency of graph.observedDependencies) {
      const violationSuffix =
        dependency.violations.length > 0 || dependency.intentionalViolations.length > 0
          ? ` [${[
              ...dependency.violations.map((violation) => violation.code),
              ...dependency.intentionalViolations.map((violation) => `${violation.code} intentional`)
            ].join(", ")}]`
          : "";
      lines.push(
        `  ${dependency.fromModule} -> ${dependency.toModule} via ${dependency.import.filePath}:${dependency.import.line} "${dependency.import.specifier}"${violationSuffix}`
      );
    }
  }

  return lines.join("\n");
}

export function formatGraphJson(result: CheckResult, options: GraphFormatOptions = {}): string {
  return JSON.stringify(toGraphJson(result, options), null, 2);
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

  return {
    schemaVersion: graphJsonSchemaVersion,
    root: normalizePath(result.root),
    filters: {
      violationsOnly: options.violationsOnly === true
    },
    summary: {
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
    },
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
    observedDependencies,
    violations: result.violations.map((violation) => ({
      code: violation.code,
      message: violation.message,
      ...(violation.location ? { location: toJsonLocation(result.root, violation.location) } : {}),
      ...(readSuggestion(violation) ? { suggestion: readSuggestion(violation) } : {})
    })),
    warnings: result.warnings.map((warning) => ({
      code: warning.code,
      message: warning.message,
      ...(warning.location ? { location: toJsonLocation(result.root, warning.location) } : {}),
      ...(readSuggestion(warning) ? { suggestion: readSuggestion(warning) } : {})
    }))
  };
}

function formatObservedDependencyCount(graph: GraphJsonResult): string {
  if (!graph.filters.violationsOnly) {
    return String(graph.summary.observedDependencies);
  }

  return `${graph.summary.shownObservedDependencies} of ${graph.summary.observedDependencies}`;
}

function formatViolatingDependencies(graph: GraphJsonResult): string[] {
  const lines = ["violating dependencies:"];

  if (graph.observedDependencies.length === 0) {
    lines.push("  none");
    return lines;
  }

  for (const dependency of graph.observedDependencies) {
    lines.push(
      `  ${dependency.fromModule} -> ${dependency.toModule} via ${dependency.import.filePath}:${dependency.import.line} "${dependency.import.specifier}"`
    );

    for (const violation of dependency.violations) {
      lines.push(`    ${violation.code}: ${violation.message}`);
      if (violation.suggestion) {
        lines.push(`    fix: ${violation.suggestion}`);
      }
    }

    for (const violation of dependency.intentionalViolations) {
      lines.push(`    intentional violation ${violation.code}: ${violation.message}`);
      lines.push(
        `    contract: accepted until ${violation.contract.acceptedUntil} (${violation.contract.ruleLocation.filePath}:${violation.contract.ruleLocation.line})`
      );
      lines.push(`    reason: ${violation.contract.reason}`);
    }
  }

  return lines;
}

function formatOtherViolations(graph: GraphJsonResult): string[] {
  const dependencyViolationKeys = new Set(
    graph.observedDependencies.flatMap((dependency) =>
      dependency.violations.map((violation) => `${dependency.import.filePath}:${dependency.import.line}:${violation.code}`)
    )
  );
  const otherViolations = graph.violations.filter((violation) => {
    if (!violation.location) {
      return true;
    }

    return !dependencyViolationKeys.has(`${violation.location.filePath}:${violation.location.line}:${violation.code}`);
  });
  const lines = ["other violations:"];

  if (otherViolations.length === 0) {
    lines.push("  none");
    return lines;
  }

  for (const violation of otherViolations) {
    const location = violation.location ? ` ${violation.location.filePath}:${violation.location.line}` : "";
    lines.push(`  ${violation.code}${location}: ${violation.message}`);
  }

  return lines;
}

function formatWarnings(graph: GraphJsonResult): string[] {
  const lines = ["warnings:"];

  if (graph.warnings.length === 0) {
    lines.push("  none");
    return lines;
  }

  for (const warning of graph.warnings) {
    const location = warning.location ? ` ${warning.location.filePath}:${warning.location.line}` : "";
    lines.push(`  ${warning.code}${location}: ${warning.message}`);
    if (warning.suggestion) {
      lines.push(`  fix: ${warning.suggestion}`);
    }
  }

  return lines;
}

function formatModules(modules: GraphJsonModule[]): string[] {
  if (modules.length === 0) {
    return ["  none"];
  }

  return modules.map((module) => {
    const layer = module.layer ? ` layer ${module.layer}` : "";
    const purpose = module.purpose ? ` - ${module.purpose}` : "";
    return `  ${module.name}${layer}${purpose}`;
  });
}

function formatEdges(edges: GraphJsonEdge[], prefix: string, arrow: string): string[] {
  if (edges.length === 0) {
    return [`${prefix}none`];
  }

  return edges.map((edge) => {
    const location = edge.ruleLocation ? ` (${edge.ruleLocation.filePath}:${edge.ruleLocation.line})` : "";
    return `${prefix}${edge.fromModule} ${arrow} ${edge.toModule}${location}`;
  });
}

function formatVisibility(rules: GraphJsonVisibilityRule[], verb: "exposes" | "hides"): string[] {
  return rules.map((rule) => `  ${rule.module} ${verb} ${rule.pattern} (${rule.ruleLocation.filePath}:${rule.ruleLocation.line})`);
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

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function toJsonLocation(root: string, location: SourceLocation): GraphJsonLocation {
  return {
    filePath: relativePath(root, location.filePath),
    line: location.line,
    ...(location.column === undefined ? {} : { column: location.column })
  };
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
