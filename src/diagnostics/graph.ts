import path from "node:path";
import type { ModuleRef, PathRef, SourceLocation, Violation, ViolationCode } from "../axi/types.js";
import type { CheckResult } from "../validator/check.js";
import { computeDrift, formatDrift, formatDriftOnly, formatMarkdownDrift } from "./graphDrift.js";
import { formatGraphMermaidFromGraph } from "./graphMermaid.js";
import {
  buildArchitectureSummary,
  formatCentralModuleMetrics,
  formatGraphInterpretation,
  formatGraphReviewModel,
  isSetupIssue,
  type GraphJsonArchitectureSummary
} from "./graphArchitecture.js";
import {
  formatMarkdownWarningClusters,
  formatWarningClusters,
  warningDisplayCode
} from "./graphWarnings.js";
import {
  buildAdvisorySignalCoverage,
  formatAdvisorySignalCoverageDetails,
  formatAdvisorySignalCoverageMarkdown,
  formatAdvisorySignalCoverageSummary
} from "./advisorySignalCoverage.js";

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
  const lines = [
    formatGraphHeader(options),
    ...formatGraphReviewModel(graph, options),
    ...formatGraphInterpretation(graph),
    `modules: ${graph.summary.modules}`,
    `declared dependencies: ${graph.summary.declaredDependencies}`,
    `forbidden dependencies: ${graph.summary.forbiddenDependencies}`,
    ...formatObservedDependencySummaryLines(graph),
    ...formatViolationSummaryLines(graph),
    `intentional violations: ${graph.summary.intentionalViolations}`,
    `warnings: ${graph.summary.warnings}`,
    "advisory signal scope: warning counts include only checks enabled for this command or config",
    ...(options.violationsOnly ? [] : formatAdvisorySignalCoverageSummary(graph.architectureSummary.advisorySignalCoverage))
  ];
  if (graph.drift) {
    lines.push(
      `drift: ${graph.drift.newObservedEdges.length} new observed edge${pluralize(
        graph.drift.newObservedEdges.length
      )}, ${graph.drift.removedObservedEdges.length} removed observed edge${pluralize(
        graph.drift.removedObservedEdges.length
      )}`
    );
  }

  if (options.driftOnly) {
    lines.push("");
    lines.push(...formatDriftOnly(graph));
    return lines.join("\n");
  }

  if (options.violationsOnly) {
    lines.push("");
    lines.push(...formatSetupIssues(graph));
    lines.push("");
    lines.push(...formatViolatingDependencies(graph));
    lines.push("");
    lines.push(...formatIntentionalDebt(graph));
    lines.push("");
    lines.push(...formatOtherViolations(graph));
    lines.push("");
    lines.push(...formatWarnings(graph));
    if (graph.drift) {
      lines.push("");
      lines.push(...formatDrift(graph.drift));
    }
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

  if (graph.intentionalDebt.length > 0) {
    lines.push("");
    lines.push(...formatIntentionalDebt(graph));
  }

  if (graph.drift) {
    lines.push("");
    lines.push(...formatDrift(graph.drift));
  }

  return lines.join("\n");
}

function formatGraphHeader(options: GraphFormatOptions): string {
  if (options.driftOnly) {
    return "Axiom diff.";
  }

  if (options.observe) {
    return "Axiom observe.";
  }

  if (options.attention) {
    return "Axiom graph (attention).";
  }

  if (options.violationsOnly) {
    return "Axiom graph (violations only).";
  }

  return "Axiom graph.";
}

export function formatGraphJson(result: CheckResult, options: GraphFormatOptions = {}): string {
  return JSON.stringify(toGraphJson(result, options), null, 2);
}

export function formatGraphMarkdown(result: CheckResult, options: GraphFormatOptions = {}): string {
  const graph = toGraphJson(result, options);
  if (options.driftOnly) {
    return formatGraphDiffMarkdown(graph);
  }

  const lines = [
    "## Axiom Architecture Review",
    "",
    `Status: ${formatMarkdownReviewStatus(graph)}`,
    `Review mode: ${formatMarkdownReviewMode(options)}`,
    "",
    "### Summary",
    `- Modules: ${graph.summary.modules}`,
    `- Declared dependencies: ${graph.summary.declaredDependencies}`,
    ...formatMarkdownObservedDependencySummary(graph),
    ...formatMarkdownViolationSummary(graph),
    `- Intentional violations: ${graph.summary.intentionalViolations}`,
    `- Advisory signals: ${graph.summary.warnings}`
  ];

  if (graph.drift) {
    lines.push(
      `- Drift: ${graph.drift.newObservedEdges.length} new observed edge${pluralize(
        graph.drift.newObservedEdges.length
      )}, ${graph.drift.removedObservedEdges.length} removed observed edge${pluralize(
        graph.drift.removedObservedEdges.length
      )}`
    );
  }

  lines.push("");
  lines.push(...formatMarkdownInterpretation(graph));
  lines.push("");
  lines.push(...formatMarkdownReviewNotes(graph));
  lines.push("");
  lines.push(...formatMarkdownSetupIssues(graph));
  lines.push("");
  lines.push(...formatMarkdownHardViolations(graph));
  lines.push("");
  lines.push(...formatMarkdownIntentionalDebt(graph));
  lines.push("");
  lines.push(...formatMarkdownWarnings(graph));

  if (graph.drift) {
    lines.push("");
    lines.push(...formatMarkdownDrift(graph.drift));
  }

  return lines.join("\n");
}

function formatGraphDiffMarkdown(graph: GraphJsonResult): string {
  const lines = [
    "## Axiom Architecture Diff",
    "",
    `Status: ${formatMarkdownDiffStatus(graph)}`,
    "Review mode: baseline drift (advisory)",
    "",
    "### Summary",
    `- Modules: ${graph.summary.modules}`,
    `- Full observed dependencies: ${graph.summary.observedDependencies}`,
    `- Hard violations in current graph: ${graph.summary.violations}`,
    `- Intentional violations in current graph: ${graph.summary.intentionalViolations}`,
    `- Advisory signals in current graph: ${graph.summary.warnings}`
  ];

  if (graph.drift) {
    lines.push(
      `- Drift: ${graph.drift.newObservedEdges.length} new observed edge${pluralize(
        graph.drift.newObservedEdges.length
      )}, ${graph.drift.removedObservedEdges.length} removed observed edge${pluralize(
        graph.drift.removedObservedEdges.length
      )}`
    );
  }

  lines.push("");
  lines.push(...formatMarkdownInterpretation(graph));
  lines.push("");
  lines.push("### Review Notes");
  lines.push("- This is review output; use `axi check` when you want a CI gate.");
  lines.push("- Diff compares current observed module edges with an unfiltered `axi graph --json` baseline.");
  lines.push("- New and removed edges are advisory drift signals until your team promotes a policy explicitly.");
  lines.push("- Run `axi observe --markdown` when you also want hard violations, visible debt, and advisory signals.");
  lines.push("");

  if (graph.drift) {
    lines.push(...formatMarkdownDrift(graph.drift));
  } else {
    lines.push("### Architecture Drift (Advisory)");
    lines.push("- No baseline was provided.");
  }

  return lines.join("\n");
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

function formatObservedDependencySummaryLines(graph: GraphJsonResult): string[] {
  if (!graph.filters.violationsOnly) {
    return [`observed dependencies: ${graph.summary.observedDependencies}`];
  }

  return [
    `shown dependency edges: ${graph.summary.shownObservedDependencies}`,
    `full observed dependencies: ${graph.summary.observedDependencies}`
  ];
}

function formatMarkdownObservedDependencySummary(graph: GraphJsonResult): string[] {
  if (!graph.filters.violationsOnly) {
    return [`- Observed dependencies: ${graph.summary.observedDependencies}`];
  }

  return [
    `- Shown dependency edges: ${graph.summary.shownObservedDependencies}`,
    `- Full observed dependencies: ${graph.summary.observedDependencies}`
  ];
}

function formatViolationSummaryLines(graph: GraphJsonResult): string[] {
  const setupIssueCount = getSetupIssues(graph).length;
  if (setupIssueCount === 0) {
    return [`violations: ${graph.summary.violations}`];
  }

  return [`setup issues: ${setupIssueCount}`, `hard violations: ${getHardViolations(graph).length}`];
}

function formatMarkdownViolationSummary(graph: GraphJsonResult): string[] {
  const setupIssueCount = getSetupIssues(graph).length;
  if (setupIssueCount === 0) {
    return [`- Hard violations: ${graph.summary.violations}`];
  }

  return [`- Setup issues: ${setupIssueCount}`, `- Hard violations: ${getHardViolations(graph).length}`];
}

function formatMarkdownReviewStatus(graph: GraphJsonResult): string {
  switch (graph.architectureSummary.status) {
    case "needs_contract":
      return "needs contract";
    case "failing_contract":
      return "failing contract";
    case "needs_review":
      return "needs review";
    case "drift_detected":
      return "needs review";
    case "clear":
      return "clear";
  }
}

function formatMarkdownDiffStatus(graph: GraphJsonResult): string {
  const driftCount = (graph.drift?.newObservedEdges.length ?? 0) + (graph.drift?.removedObservedEdges.length ?? 0);
  return driftCount > 0 ? "drift detected" : "no drift";
}

function formatMarkdownReviewMode(options: GraphFormatOptions): string {
  if (options.observe) {
    return "observe (advisory)";
  }

  if (options.attention) {
    return "graph attention (advisory)";
  }

  if (options.violationsOnly) {
    return "graph violations-only (advisory)";
  }

  return "graph summary (advisory)";
}

function formatMarkdownInterpretation(graph: GraphJsonResult): string[] {
  const interpretation = graph.architectureSummary.interpretation;
  const lines = ["### Interpretation", `- Headline: ${interpretation.headline}`, "- Look first:"];

  for (const item of interpretation.lookFirst) {
    lines.push(`  - ${item}`);
  }

  lines.push("- Central modules:");
  if (interpretation.centralModules.length === 0) {
    lines.push("  - None observed in this scan scope.");
  } else {
    for (const module of interpretation.centralModules) {
      lines.push(
        `  - ${markdownCode(module.module)} (${module.role.replace(/_/g, " ")}): ${formatCentralModuleMetrics(module)}`
      );
    }
  }

  lines.push(`- Caveat: ${interpretation.caveat}`);
  lines.push("");
  lines.push("### Review Story");
  lines.push(`- Summary: ${graph.architectureSummary.reviewStory.summary}`);
  lines.push(`- Setup: ${graph.architectureSummary.reviewStory.setup}`);
  if (graph.architectureSummary.reviewStory.pressures.length === 0) {
    lines.push("- Pressures: none");
  } else {
    lines.push("- Pressures:");
    for (const pressure of graph.architectureSummary.reviewStory.pressures.slice(0, 3)) {
      lines.push(`  - ${markdownCode(pressure.title)} (${pressure.severity}): ${pressure.description}`);
    }
  }
  lines.push(`- Next step: ${graph.architectureSummary.reviewStory.nextStep}`);
  lines.push(`- Caveat: ${graph.architectureSummary.reviewStory.caveat}`);
  return lines;
}

function formatMarkdownReviewNotes(graph: GraphJsonResult): string[] {
  const lines = [
    "### Review Notes",
    "- This is review output; use `axi check` when you want a CI gate.",
    "- Hard violations are contract failures.",
    "- Intentional violations, warning diagnostics, and drift are visible debt or advisory signals.",
    "- Advisory signals are review pressure, not a cleanup checklist or failure state; do not refactor solely to reduce signal counts.",
    "- Before acting on advisory signals, state the architecture hypothesis and verify the change with tests, audits, or Axiom evidence.",
    "- Advisory signal counts include only warning checks enabled for this command or config.",
    "- Axiom does not auto-accept debt; accepted debt must be declared in `.axi` with an expiration date and reason.",
    "- Expired or invalid intentional violations are hard contract failures in `axi check`."
  ];

  if (graph.filters.violationsOnly) {
    lines.push("- Dependency summaries separate shown attention edges from the full observed graph.");
  }

  return lines;
}

function formatMarkdownSetupIssues(graph: GraphJsonResult): string[] {
  const setupIssues = getSetupIssues(graph);
  const lines = ["### Setup Issues"];

  if (setupIssues.length === 0) {
    lines.push("- None");
    return lines;
  }

  for (const issue of setupIssues) {
    const location = issue.location ? ` at ${markdownCode(formatLocation(issue.location))}` : "";
    lines.push(`- ${markdownCode(issue.code)}${location}: ${issue.message}`);
    appendMarkdownDiagnosticDetails(lines, issue);
  }

  return lines;
}

function formatMarkdownHardViolations(graph: GraphJsonResult): string[] {
  const violatingDependencies = graph.observedDependencies.filter((dependency) => dependency.violations.length > 0);
  const otherViolations = getOtherViolations(graph);
  const lines = ["### Hard Violations"];

  if (violatingDependencies.length === 0 && otherViolations.length === 0) {
    lines.push("- None");
    return lines;
  }

  for (const dependency of violatingDependencies) {
    lines.push(
      `- ${markdownCode(`${dependency.fromModule} -> ${dependency.toModule}`)} via ${formatMarkdownImport(
        dependency.import
      )}`
    );

    for (const violation of dependency.violations) {
      lines.push(`  - ${markdownCode(violation.code)}: ${violation.message}`);
      if (violation.suggestion) {
        lines.push(`  - Fix: ${violation.suggestion}`);
      }
    }
  }

  for (const violation of otherViolations) {
    const location = violation.location ? ` at ${markdownCode(formatLocation(violation.location))}` : "";
    lines.push(`- ${markdownCode(violation.code)}${location}: ${violation.message}`);
    if (violation.suggestion) {
      lines.push(`  - Fix: ${violation.suggestion}`);
    }
  }

  return lines;
}

function formatMarkdownIntentionalDebt(graph: GraphJsonResult): string[] {
  const lines = ["### Visible Intentional Debt"];

  if (graph.intentionalDebt.length === 0) {
    lines.push("- None");
    return lines;
  }

  for (const debt of graph.intentionalDebt) {
    const location = debt.location ? ` at ${markdownCode(formatLocation(debt.location))}` : "";
    lines.push(`- ${markdownCode(debt.code)}${location}: ${debt.message}`);
    lines.push(`  - Edge: ${markdownCode(`${debt.fromModule} -> ${debt.toModule}`)}`);
    appendMarkdownDetail(lines, "Observed", readString(debt.details?.observed));
    const specifier = readString(debt.details?.specifier);
    if (specifier) {
      appendMarkdownDetail(lines, "Specifier", markdownCode(specifier));
    }
    const rule = readString(debt.details?.rule);
    const ruleLocation = readLocation(debt.details?.ruleLocation);
    if (rule) {
      const suffix = ruleLocation ? ` (${formatLocation(ruleLocation)})` : "";
      appendMarkdownDetail(lines, "Rule", `${rule}${suffix}`);
    }
    lines.push(`  - Accepted until: ${markdownCode(debt.acceptedUntil)}`);
    if (debt.pathScope) {
      lines.push(`  - Scope: ${markdownCode(debt.pathScope)}`);
    }
    lines.push(`  - Contract: ${markdownCode(formatLocation(debt.contractLocation))}`);
    lines.push(`  - Reason: ${debt.reason}`);
    if (debt.suggestion) {
      lines.push(`  - Fix: ${debt.suggestion}`);
    }
  }

  return lines;
}

function formatMarkdownWarnings(graph: GraphJsonResult): string[] {
  const lines = ["### Advisory Signals"];

  if (graph.warnings.length === 0) {
    lines.push("- None");
    lines.push("- Zero advisory signals is not proof of architecture health; compare the graph with intended ownership and responsibilities.");
    lines.push(...formatAdvisorySignalCoverageMarkdown(graph.architectureSummary.advisorySignalCoverage));
    return lines;
  }

  lines.push("- These are review-pressure signals, not a cleanup checklist.");
  lines.push("- Do not refactor solely to reduce advisory signal counts; first name the architecture hypothesis and verification plan.");
  lines.push(...formatAdvisorySignalCoverageMarkdown(graph.architectureSummary.advisorySignalCoverage));
  lines.push(...formatMarkdownWarningClusters(graph.warnings));

  for (const warning of graph.warnings) {
    const location = warning.location ? ` at ${markdownCode(formatLocation(warning.location))}` : "";
    lines.push(`- ${markdownCode(warningDisplayCode(warning))}${location}: ${warning.message}`);
    appendMarkdownWarningDetails(lines, warning);
  }

  return lines;
}

function appendMarkdownWarningDetails(lines: string[], warning: GraphJsonViolation): void {
  appendMarkdownDetail(lines, "Observed", readString(warning.details?.observed));
  const specifier = readString(warning.details?.specifier);
  if (specifier) {
    appendMarkdownDetail(lines, "Specifier", markdownCode(specifier));
  }

  const dependencyKind = readString(warning.details?.dependencyKind);
  const expressionKind = readString(warning.details?.expressionKind);
  if (dependencyKind || expressionKind) {
    appendMarkdownDetail(lines, "Dependency expression", `${dependencyKind ?? "unknown"} (${expressionKind ?? "unknown"})`);
  }

  const expressionPreview = readString(warning.details?.expressionPreview);
  if (expressionPreview) {
    appendMarkdownDetail(lines, "Expression", markdownCode(expressionPreview));
  }

  const rule = readString(warning.details?.rule);
  const ruleLocation = readLocation(warning.details?.ruleLocation);
  if (rule) {
    const suffix = ruleLocation ? ` (${formatLocation(ruleLocation)})` : "";
    appendMarkdownDetail(lines, "Rule", `${rule}${suffix}`);
  }

  const importedPath = readString(warning.details?.importedPath);
  if (importedPath) {
    appendMarkdownDetail(lines, "Imported path", markdownCode(importedPath));
  }

  const publicEntrypoints = readStringArray(warning.details?.publicEntrypoints);
  if (publicEntrypoints.length > 0) {
    appendMarkdownDetail(lines, "Likely entry points", publicEntrypoints.map(markdownCode).join(", "));
  }

  const moduleEntrypoints = readStringArray(warning.details?.moduleEntrypoints);
  if (moduleEntrypoints.length > 0) {
    appendMarkdownDetail(lines, "Other module entry points", moduleEntrypoints.map(markdownCode).join(", "));
  }

  const entrypointConfidence = readString(warning.details?.entrypointConfidence);
  if (entrypointConfidence) {
    appendMarkdownDetail(lines, "Entrypoint confidence", markdownCode(entrypointConfidence));
  }

  const entrypointReason = readString(warning.details?.entrypointReason);
  if (entrypointReason) {
    appendMarkdownDetail(lines, "Entrypoint reason", markdownCode(entrypointReason));
  }

  const deepImportGroup = readString(warning.details?.deepImportGroup);
  if (deepImportGroup) {
    appendMarkdownDetail(lines, "Deep import group", markdownCode(deepImportGroup));
  }

  const internalTargets = readStringArray(warning.details?.internalTargets);
  if (internalTargets.length > 0) {
    appendMarkdownDetail(lines, "Internal targets", internalTargets.map(markdownCode).join(", "));
  }

  const threshold = readRecord(warning.details?.threshold);
  const fanInThreshold = readNumber(threshold?.fanInModules);
  const fanOutThreshold = readNumber(threshold?.fanOutModules);
  const internalTargetsThreshold = readNumber(threshold?.internalTargets);
  const lineThreshold = readNumber(threshold?.lines);
  if (
    fanInThreshold !== undefined ||
    fanOutThreshold !== undefined ||
    internalTargetsThreshold !== undefined ||
    lineThreshold !== undefined
  ) {
    appendMarkdownDetail(
      lines,
      "Threshold",
      [
        fanInThreshold === undefined ? undefined : `fan-in >= ${fanInThreshold}`,
        fanOutThreshold === undefined ? undefined : `fan-out >= ${fanOutThreshold}`,
        internalTargetsThreshold === undefined ? undefined : `internal targets >= ${internalTargetsThreshold}`,
        lineThreshold === undefined ? undefined : `lines >= ${lineThreshold}`
      ]
        .filter((item): item is string => item !== undefined)
        .join(" or ")
    );
  }

  const lineCount = readNumber(warning.details?.lineCount);
  if (lineCount !== undefined) {
    appendMarkdownDetail(lines, "Line count", String(lineCount));
  }

  const importsScanned = readNumber(warning.details?.importsScanned);
  const exportsScanned = readNumber(warning.details?.exportsScanned);
  const functionLikeCount = readNumber(warning.details?.functionLikeCount);
  const classCount = readNumber(warning.details?.classCount);
  if (
    importsScanned !== undefined ||
    exportsScanned !== undefined ||
    functionLikeCount !== undefined ||
    classCount !== undefined
  ) {
    appendMarkdownDetail(
      lines,
      "File shape",
      `${importsScanned ?? 0} imports, ${exportsScanned ?? 0} exports, ${functionLikeCount ?? 0} functions, ${
        classCount ?? 0
      } classes`
    );
  }

  const nameTokenClusters = formatNameTokenClusters(warning.details?.nameTokenClusters, markdownCode);
  if (nameTokenClusters) {
    appendMarkdownDetail(lines, "Name clusters", nameTokenClusters);
  }

  appendMarkdownDetail(lines, "Responsibility hint", readString(warning.details?.responsibilityHint));

  const incomingModules = readStringArray(warning.details?.incomingModules);
  if (incomingModules.length > 0) {
    appendMarkdownDetail(lines, "Fan-in modules", incomingModules.join(", "));
  }

  const outgoingModules = readStringArray(warning.details?.outgoingModules);
  if (outgoingModules.length > 0) {
    appendMarkdownDetail(lines, "Fan-out modules", outgoingModules.join(", "));
  }

  const reviewKind = readString(warning.details?.reviewKind);
  if (reviewKind) {
    appendMarkdownDetail(lines, "Review kind", markdownCode(reviewKind));
  }

  const roleHint = readString(warning.details?.roleHint);
  if (roleHint) {
    appendMarkdownDetail(lines, "Role hint", markdownCode(roleHint));
  }

  const entryFiles = readStringArray(warning.details?.entryFiles);
  if (entryFiles.length > 0) {
    appendMarkdownDetail(lines, "Entry files", entryFiles.map(markdownCode).join(", "));
  }

  const entryFileFanOutModules = readNumber(warning.details?.entryFileFanOutModules);
  const entryFileImportSites = readNumber(warning.details?.entryFileImportSites);
  if (entryFileFanOutModules !== undefined || entryFileImportSites !== undefined) {
    appendMarkdownDetail(
      lines,
      "Entry file fan-out",
      `${entryFileFanOutModules ?? "unknown"} modules, ${entryFileImportSites ?? "unknown"} import sites`
    );
  }

  appendMarkdownDetail(lines, "Note", readString(warning.details?.note));

  const expiresOn = readString(warning.details?.expiresOn);
  const daysUntilExpiration = readNumber(warning.details?.daysUntilExpiration);
  if (expiresOn) {
    const suffix = daysUntilExpiration === undefined ? "" : ` (${formatExpirationDistance(daysUntilExpiration)})`;
    appendMarkdownDetail(lines, "Expires", `${expiresOn}${suffix}`);
  }

  appendMarkdownDetail(lines, "Reason", readString(warning.details?.reason));

  if (warning.suggestion) {
    appendMarkdownDetail(lines, "Fix", warning.suggestion);
  }
}

function appendMarkdownDiagnosticDetails(lines: string[], violation: GraphJsonViolation): void {
  const sourceFileCount = readNumber(violation.details?.sourceFiles);
  const importsScanned = readNumber(violation.details?.importsScanned);
  if (sourceFileCount !== undefined || importsScanned !== undefined) {
    appendMarkdownDetail(
      lines,
      "Scan",
      `${sourceFileCount ?? "unknown"} source files, ${importsScanned ?? "unknown"} imports scanned`
    );
  }

  const scopeHints = readRecordArray(violation.details?.scopeHints);
  if (scopeHints.length > 0) {
    for (const hint of scopeHints.slice(0, 2)) {
      appendMarkdownDetail(lines, "Scope guidance", readString(hint.message));

      const matchedFolders = readStringArray(hint.matchedFolders);
      if (matchedFolders.length > 0) {
        appendMarkdownDetail(lines, "Matched folders", matchedFolders.map(markdownCode).join(", "));
      }

      const samplePaths = readStringArray(hint.samplePaths);
      if (samplePaths.length > 0) {
        appendMarkdownDetail(lines, "Examples", samplePaths.slice(0, 4).map(markdownCode).join(", "));
      }

      appendMarkdownDetail(lines, "Try", readString(hint.suggestion));
    }
  }

  appendMarkdownDetail(lines, "Note", readString(violation.details?.note));

  if (violation.suggestion) {
    appendMarkdownDetail(lines, "Fix", violation.suggestion);
  }
}

function appendMarkdownDetail(lines: string[], label: string, value: string | undefined): void {
  if (value) {
    lines.push(`  - ${label}: ${value}`);
  }
}

function formatLocation(location: GraphJsonLocation | GraphJsonImportSite): string {
  return `${location.filePath}:${location.line}`;
}

function formatMarkdownImport(importSite: GraphJsonImportSite): string {
  return `${markdownCode(formatLocation(importSite))} importing ${markdownCode(importSite.specifier)}`;
}

function markdownCode(value: string | number): string {
  return `\`${String(value).replace(/`/g, "\\`")}\``;
}

function formatViolatingDependencies(graph: GraphJsonResult): string[] {
  const lines = ["violating dependencies:"];
  const dependencies = graph.observedDependencies.filter((dependency) => dependency.violations.length > 0);

  if (dependencies.length === 0) {
    lines.push("  none");
    return lines;
  }

  for (const dependency of dependencies) {
    lines.push(
      `  ${dependency.fromModule} -> ${dependency.toModule} via ${dependency.import.filePath}:${dependency.import.line} "${dependency.import.specifier}"`
    );

    for (const violation of dependency.violations) {
      lines.push(`    ${violation.code}: ${violation.message}`);
      if (violation.suggestion) {
        lines.push(`    fix: ${violation.suggestion}`);
      }
    }

  }

  return lines;
}

function formatIntentionalDebt(graph: GraphJsonResult): string[] {
  const lines = ["visible intentional debt:"];

  if (graph.intentionalDebt.length === 0) {
    lines.push("  none");
    return lines;
  }

  for (const debt of graph.intentionalDebt) {
    const location = debt.location ? ` ${debt.location.filePath}:${debt.location.line}` : "";
    lines.push(`  ${debt.code}${location}: ${debt.message}`);
    lines.push(`    edge: ${debt.fromModule} -> ${debt.toModule}`);
    const observed = readString(debt.details?.observed);
    if (observed) {
      lines.push(`    observed: ${observed}`);
    }
    const specifier = readString(debt.details?.specifier);
    if (specifier) {
      lines.push(`    specifier: "${specifier}"`);
    }
    const rule = readString(debt.details?.rule);
    const ruleLocation = readLocation(debt.details?.ruleLocation);
    if (rule) {
      const suffix = ruleLocation ? ` (${ruleLocation.filePath}:${ruleLocation.line})` : "";
      lines.push(`    rule: ${rule}${suffix}`);
    }
    if (debt.pathScope) {
      lines.push(`    scope: ${debt.pathScope}`);
    }
    lines.push(
      `    contract: accepted until ${debt.acceptedUntil} (${debt.contractLocation.filePath}:${debt.contractLocation.line})`
    );
    lines.push(`    reason: ${debt.reason}`);
    if (debt.suggestion) {
      lines.push(`    fix: ${debt.suggestion}`);
    }
  }

  return lines;
}

function formatOtherViolations(graph: GraphJsonResult): string[] {
  const otherViolations = getOtherViolations(graph);
  const lines = ["other violations:"];

  if (otherViolations.length === 0) {
    lines.push("  none");
    return lines;
  }

  for (const violation of otherViolations) {
    const location = violation.location ? ` ${violation.location.filePath}:${violation.location.line}` : "";
    lines.push(`  ${violation.code}${location}: ${violation.message}`);
    lines.push(...formatGraphDiagnosticDetails(violation, "    "));
  }

  return lines;
}

function formatSetupIssues(graph: GraphJsonResult): string[] {
  const setupIssues = getSetupIssues(graph);
  const lines = ["setup issues:"];

  if (setupIssues.length === 0) {
    lines.push("  none");
    return lines;
  }

  for (const issue of setupIssues) {
    const location = issue.location ? ` ${issue.location.filePath}:${issue.location.line}` : "";
    lines.push(`  ${issue.code}${location}: ${issue.message}`);
    lines.push(...formatGraphDiagnosticDetails(issue, "    "));
  }

  return lines;
}

function getSetupIssues(graph: GraphJsonResult): GraphJsonViolation[] {
  return graph.violations.filter(isSetupIssue);
}

function getHardViolations(graph: GraphJsonResult): GraphJsonViolation[] {
  return graph.violations.filter((violation) => !isSetupIssue(violation));
}

function getOtherViolations(graph: GraphJsonResult): GraphJsonViolation[] {
  const dependencyViolationKeys = new Set(
    graph.observedDependencies.flatMap((dependency) =>
      dependency.violations.map((violation) => `${dependency.import.filePath}:${dependency.import.line}:${violation.code}`)
    )
  );

  return getHardViolations(graph).filter((violation) => {
    if (!violation.location) {
      return true;
    }

    return !dependencyViolationKeys.has(`${violation.location.filePath}:${violation.location.line}:${violation.code}`);
  });
}

function formatWarnings(graph: GraphJsonResult): string[] {
  const lines = ["warnings:"];

  if (graph.warnings.length === 0) {
    lines.push("  none");
    lines.push("  note: zero advisory signals is not proof of architecture health");
    lines.push("  note: advisory signal counts include only checks enabled for this command or config");
    lines.push(...formatAdvisorySignalCoverageDetails(graph.architectureSummary.advisorySignalCoverage));
    return lines;
  }

  lines.push("  note: advisory signals are review pressure, not a cleanup checklist or failure state");
  lines.push("  note: do not refactor solely to reduce advisory signal counts; first name the architecture hypothesis");
  lines.push(...formatAdvisorySignalCoverageDetails(graph.architectureSummary.advisorySignalCoverage));
  lines.push(...formatWarningClusters(graph.warnings));

  for (const warning of graph.warnings) {
    const location = warning.location ? ` ${warning.location.filePath}:${warning.location.line}` : "";
    lines.push(`  ${warningDisplayCode(warning)}${location}: ${warning.message}`);
    const observed = readString(warning.details?.observed);
    if (observed) {
      lines.push(`  observed: ${observed}`);
    }

    const specifier = readString(warning.details?.specifier);
    if (specifier) {
      lines.push(`  specifier: "${specifier}"`);
    }

    const dependencyKind = readString(warning.details?.dependencyKind);
    const expressionKind = readString(warning.details?.expressionKind);
    if (dependencyKind || expressionKind) {
      lines.push(`  dependency expression: ${dependencyKind ?? "unknown"} (${expressionKind ?? "unknown"})`);
    }

    const expressionPreview = readString(warning.details?.expressionPreview);
    if (expressionPreview) {
      lines.push(`  expression: ${expressionPreview}`);
    }

    const rule = readString(warning.details?.rule);
    const ruleLocation = readLocation(warning.details?.ruleLocation);
    if (rule) {
      const suffix = ruleLocation ? ` (${ruleLocation.filePath}:${ruleLocation.line})` : "";
      lines.push(`  rule: ${rule}${suffix}`);
    }

    const importedPath = readString(warning.details?.importedPath);
    if (importedPath) {
      lines.push(`  imported path: ${importedPath}`);
    }

    const publicEntrypoints = readStringArray(warning.details?.publicEntrypoints);
    if (publicEntrypoints.length > 0) {
      lines.push(`  likely entry points: ${publicEntrypoints.join(", ")}`);
    }

    const moduleEntrypoints = readStringArray(warning.details?.moduleEntrypoints);
    if (moduleEntrypoints.length > 0) {
      lines.push(`  other module entry points: ${moduleEntrypoints.join(", ")}`);
    }

    const entrypointConfidence = readString(warning.details?.entrypointConfidence);
    if (entrypointConfidence) {
      lines.push(`  entrypoint confidence: ${entrypointConfidence}`);
    }

    const entrypointReason = readString(warning.details?.entrypointReason);
    if (entrypointReason) {
      lines.push(`  entrypoint reason: ${entrypointReason}`);
    }

    const deepImportGroup = readString(warning.details?.deepImportGroup);
    if (deepImportGroup) {
      lines.push(`  deep import group: ${deepImportGroup}`);
    }

    const internalTargets = readStringArray(warning.details?.internalTargets);
    if (internalTargets.length > 0) {
      lines.push(`  internal targets: ${internalTargets.join(", ")}`);
    }

    const threshold = readRecord(warning.details?.threshold);
    const fanInThreshold = readNumber(threshold?.fanInModules);
    const fanOutThreshold = readNumber(threshold?.fanOutModules);
    const internalTargetsThreshold = readNumber(threshold?.internalTargets);
    const lineThreshold = readNumber(threshold?.lines);
    if (
      fanInThreshold !== undefined ||
      fanOutThreshold !== undefined ||
      internalTargetsThreshold !== undefined ||
      lineThreshold !== undefined
    ) {
      lines.push(
        `  threshold: ${[
          fanInThreshold === undefined ? undefined : `fan-in >= ${fanInThreshold}`,
          fanOutThreshold === undefined ? undefined : `fan-out >= ${fanOutThreshold}`,
          internalTargetsThreshold === undefined ? undefined : `internal targets >= ${internalTargetsThreshold}`,
          lineThreshold === undefined ? undefined : `lines >= ${lineThreshold}`
        ]
          .filter((item): item is string => item !== undefined)
          .join(" or ")}`
      );
    }

    const lineCount = readNumber(warning.details?.lineCount);
    if (lineCount !== undefined) {
      lines.push(`  line count: ${lineCount}`);
    }

    const importsScanned = readNumber(warning.details?.importsScanned);
    const exportsScanned = readNumber(warning.details?.exportsScanned);
    const functionLikeCount = readNumber(warning.details?.functionLikeCount);
    const classCount = readNumber(warning.details?.classCount);
    if (
      importsScanned !== undefined ||
      exportsScanned !== undefined ||
      functionLikeCount !== undefined ||
      classCount !== undefined
    ) {
      lines.push(
        `  file shape: ${importsScanned ?? 0} imports, ${exportsScanned ?? 0} exports, ${
          functionLikeCount ?? 0
        } functions, ${classCount ?? 0} classes`
      );
    }

    const nameTokenClusters = formatNameTokenClusters(warning.details?.nameTokenClusters, (value) => value);
    if (nameTokenClusters) {
      lines.push(`  name clusters: ${nameTokenClusters}`);
    }

    const responsibilityHint = readString(warning.details?.responsibilityHint);
    if (responsibilityHint) {
      lines.push(`  responsibility hint: ${responsibilityHint}`);
    }

    const scope = readString(warning.details?.scope);
    if (scope) {
      lines.push(`  scope: ${scope}`);
    }

    const pathScope = readString(warning.details?.pathScope);
    if (pathScope) {
      lines.push(`  path scope: ${pathScope}`);
    }

    const incomingModules = readStringArray(warning.details?.incomingModules);
    if (incomingModules.length > 0) {
      lines.push(`  fan-in modules: ${incomingModules.join(", ")}`);
    }

    const outgoingModules = readStringArray(warning.details?.outgoingModules);
    if (outgoingModules.length > 0) {
      lines.push(`  fan-out modules: ${outgoingModules.join(", ")}`);
    }

    const reviewKind = readString(warning.details?.reviewKind);
    if (reviewKind) {
      lines.push(`  review kind: ${reviewKind}`);
    }

    const roleHint = readString(warning.details?.roleHint);
    if (roleHint) {
      lines.push(`  role hint: ${roleHint}`);
    }

    const entryFiles = readStringArray(warning.details?.entryFiles);
    if (entryFiles.length > 0) {
      lines.push(`  entry files: ${entryFiles.join(", ")}`);
    }

    const entryFileFanOutModules = readNumber(warning.details?.entryFileFanOutModules);
    const entryFileImportSites = readNumber(warning.details?.entryFileImportSites);
    if (entryFileFanOutModules !== undefined || entryFileImportSites !== undefined) {
      lines.push(
        `  entry file fan-out: ${entryFileFanOutModules ?? "unknown"} modules, ${
          entryFileImportSites ?? "unknown"
        } import sites`
      );
    }

    const note = readString(warning.details?.note);
    if (note) {
      lines.push(`  note: ${note}`);
    }

    const expiresOn = readString(warning.details?.expiresOn);
    const daysUntilExpiration = readNumber(warning.details?.daysUntilExpiration);
    if (expiresOn) {
      const suffix = daysUntilExpiration === undefined ? "" : ` (${formatExpirationDistance(daysUntilExpiration)})`;
      lines.push(`  expires: ${expiresOn}${suffix}`);
    }

    const reason = readString(warning.details?.reason);
    if (reason) {
      lines.push(`  reason: ${reason}`);
    }

    if (warning.suggestion) {
      lines.push(`  fix: ${warning.suggestion}`);
    }
  }

  return lines;
}

function formatGraphDiagnosticDetails(violation: GraphJsonViolation, indent: string): string[] {
  const details = violation.details;
  if (!details) {
    return [];
  }

  const lines: string[] = [];
  const sourceFileCount = readNumber(details.sourceFiles);
  const importsScanned = readNumber(details.importsScanned);
  if (sourceFileCount !== undefined || importsScanned !== undefined) {
    lines.push(`${indent}scan: ${sourceFileCount ?? "unknown"} source files, ${importsScanned ?? "unknown"} imports scanned`);
  }

  const topLargestFiles = readRecordArray(details.topLargestFiles);
  if (topLargestFiles.length > 0) {
    lines.push(`${indent}top largest files:`);
    for (const file of topLargestFiles) {
      const filePath = readString(file.filePath) ?? "unknown";
      const lineCount = readNumber(file.lineCount) ?? 0;
      const importCount = readNumber(file.imports) ?? 0;
      const functionCount = readNumber(file.functions) ?? 0;
      const classCount = readNumber(file.classes) ?? 0;
      lines.push(`${indent}  ${filePath} (${lineCount} lines, ${importCount} imports, ${functionCount} functions, ${classCount} classes)`);
    }
  }

  const inferredModuleCandidates = readRecordArray(details.inferredModuleCandidates);
  if (inferredModuleCandidates.length > 0) {
    lines.push(`${indent}inferred module candidates:`);
    for (const candidate of inferredModuleCandidates) {
      const name = readString(candidate.name) ?? "Module";
      const candidatePath = readString(candidate.path) ?? "unknown";
      const fileCount = readNumber(candidate.fileCount) ?? 0;
      lines.push(`${indent}  ${name}: ${candidatePath} (${fileCount} files)`);
    }
  }

  const scopeHints = readRecordArray(details.scopeHints);
  if (scopeHints.length > 0) {
    lines.push(`${indent}scope guidance:`);
    for (const hint of scopeHints) {
      const message = readString(hint.message);
      if (message) {
        lines.push(`${indent}  ${message}`);
      }

      const matchedFolders = readStringArray(hint.matchedFolders);
      if (matchedFolders.length > 0) {
        lines.push(`${indent}  matched folders: ${matchedFolders.join(", ")}`);
      }

      const samplePaths = readStringArray(hint.samplePaths);
      if (samplePaths.length > 0) {
        lines.push(`${indent}  examples: ${samplePaths.join(", ")}`);
      }

      const suggestion = readString(hint.suggestion);
      if (suggestion) {
        lines.push(`${indent}  try: ${suggestion}`);
      }
    }
  }

  const note = readString(details.note);
  if (note) {
    lines.push(`${indent}note: ${note}`);
  }

  if (violation.suggestion) {
    lines.push(`${indent}fix: ${violation.suggestion}`);
  }

  return lines;
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

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function readRecordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(readRecord(item)))
    : [];
}

function formatNameTokenClusters(value: unknown, formatValue: (value: string) => string): string | undefined {
  const clusters = readRecordArray(value)
    .map((cluster) => {
      const token = readString(cluster.token);
      const count = readNumber(cluster.count);
      const samples = readStringArray(cluster.samples);
      if (!token || count === undefined) {
        return undefined;
      }

      const sampleText =
        samples.length > 0 ? `: ${samples.slice(0, 3).map(formatValue).join(", ")}` : "";
      return `${formatValue(token)} (${count}${sampleText})`;
    })
    .filter((cluster): cluster is string => cluster !== undefined);

  return clusters.length > 0 ? clusters.join("; ") : undefined;
}

function readLocation(value: unknown): GraphJsonLocation | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const location = value as Partial<GraphJsonLocation>;
  if (typeof location.filePath !== "string" || typeof location.line !== "number") {
    return undefined;
  }

  return {
    filePath: location.filePath,
    line: location.line,
    column: location.column
  };
}

function formatExpirationDistance(daysUntilExpiration: number): string {
  if (daysUntilExpiration === 0) {
    return "today";
  }

  if (daysUntilExpiration === 1) {
    return "in 1 day";
  }

  return `in ${daysUntilExpiration} days`;
}

function pluralize(count: number): string {
  return count === 1 ? "" : "s";
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
      return [key, typeof item === "string" ? relativePath(root, item) : item];
    }

    return [key, normalizeValue(root, item)];
  });

  return Object.fromEntries(entries);
}

function isSourceLocation(value: object): value is SourceLocation {
  const maybeLocation = value as Partial<SourceLocation>;
  return typeof maybeLocation.filePath === "string" && typeof maybeLocation.line === "number";
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
