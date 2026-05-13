import path from "node:path";
import type { ModuleRef, PathRef, SourceLocation, Violation, ViolationCode } from "../axi/types.js";
import type { CheckResult } from "../validator/check.js";

export const graphJsonSchemaVersion = "axiom.graph.v9";

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

interface GraphJsonImportSite {
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

interface GraphJsonViolation {
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
    ruleLocation: GraphJsonLocation;
  };
}

interface GraphJsonIntentionalDebt {
  kind: "intentional_violation";
  code: ViolationCode;
  message: string;
  fromModule: string;
  toModule: string;
  acceptedUntil: string;
  reason: string;
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

interface GraphJsonDrift {
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
  filters: {
    violationsOnly: boolean;
    attention: boolean;
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
    `modules: ${graph.summary.modules}`,
    `declared dependencies: ${graph.summary.declaredDependencies}`,
    `forbidden dependencies: ${graph.summary.forbiddenDependencies}`,
    `observed dependencies: ${formatObservedDependencyCount(graph)}`,
    `violations: ${graph.summary.violations}`,
    `intentional violations: ${graph.summary.intentionalViolations}`,
    `warnings: ${graph.summary.warnings}`,
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

function formatGraphReviewModel(graph: GraphJsonResult, options: GraphFormatOptions): string[] {
  if (options.driftOnly) {
    return [
      "review mode: baseline drift (advisory, exits 0)",
      "model: current observed source imports vs saved axi graph --json baseline",
      "gate: use axi check for CI failures; diff is for review and drift visibility",
      "focus: showing new and removed observed module edges since the baseline"
    ];
  }

  if (options.observe) {
    return [
      "review mode: architecture attention (advisory, exits 0)",
      "model: declared .axi intent vs observed source imports",
      "gate: use axi check for CI failures; observe is for review and drift visibility",
      `focus: ${formatAttentionFocus(graph)}`
    ];
  }

  if (options.attention) {
    return [
      "review mode: graph attention (advisory)",
      "model: declared .axi intent vs observed source imports",
      `focus: ${formatAttentionFocus(graph)}`
    ];
  }

  if (options.violationsOnly) {
    return [
      "review mode: violations-only graph (presentation filter)",
      "model: declared .axi intent vs observed source imports",
      `focus: ${formatAttentionFocus(graph)}`
    ];
  }

  return [];
}

function formatAttentionFocus(graph: GraphJsonResult): string {
  if (!graph.filters.violationsOnly) {
    return "showing the full observed module graph";
  }

  return `showing ${formatObservedDependencyCount(
    graph
  )} observed dependency edge${pluralize(graph.summary.shownObservedDependencies)} with hard violations or accepted debt; clean edges omitted`;
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
    `- Observed dependencies: ${formatObservedDependencyCount(graph)}`,
    `- Hard violations: ${graph.summary.violations}`,
    `- Intentional violations: ${graph.summary.intentionalViolations}`,
    `- Advisory warnings: ${graph.summary.warnings}`
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
  lines.push(...formatMarkdownReviewNotes(graph));
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
    `- Observed dependencies: ${graph.summary.observedDependencies}`,
    `- Hard violations in current graph: ${graph.summary.violations}`,
    `- Intentional violations in current graph: ${graph.summary.intentionalViolations}`,
    `- Advisory warnings in current graph: ${graph.summary.warnings}`
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
  lines.push("### Review Notes");
  lines.push("- This is review output; use `axi check` when you want a CI gate.");
  lines.push("- Diff compares current observed module edges with an unfiltered `axi graph --json` baseline.");
  lines.push("- New and removed edges are advisory drift signals until your team promotes a policy explicitly.");
  lines.push("- Run `axi observe --markdown` when you also want hard violations, visible debt, and advisory warnings.");
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
  const moduleIds = new Map(graph.modules.map((module) => [module.name, mermaidId("module", module.name)]));
  const edges = aggregateMermaidEdges(graph, options);
  const lines = [
    `%% Generated by ${formatMermaidCommandName(options)} --mermaid.`,
    "%% Observed module dependencies are shown; use axi graph --json for the full machine-readable graph.",
    `%% Summary: modules=${graph.summary.modules}, observedDependencies=${formatObservedDependencyCount(
      graph
    )}, violations=${graph.summary.violations}, intentionalViolations=${graph.summary.intentionalViolations}, warnings=${graph.summary.warnings}.`,
    "flowchart TB"
  ];

  lines.push(...formatMermaidLegend(graph, options));

  const moduleGroups = groupModulesForMermaid(graph.modules);
  if (moduleGroups.length === 0) {
    lines.push("  %% no modules");
  }

  for (const group of moduleGroups) {
    if (group.layer) {
      lines.push(`  subgraph ${mermaidId("layer", group.layer)}["${escapeMermaidLabel(`layer ${group.layer}`)}"]`);
      for (const module of group.modules) {
        lines.push(`    ${readMermaidModuleId(moduleIds, module.name)}["${formatMermaidModuleLabel(module)}"]`);
      }
      lines.push("  end");
    } else {
      for (const module of group.modules) {
        lines.push(`  ${readMermaidModuleId(moduleIds, module.name)}["${formatMermaidModuleLabel(module)}"]`);
      }
    }
  }

  if (options.driftOnly && graph.drift) {
    const knownModules = new Set(graph.modules.map((module) => module.name));
    const driftModules = new Set<string>();
    for (const edge of [...graph.drift.newObservedEdges, ...graph.drift.removedObservedEdges]) {
      driftModules.add(edge.fromModule);
      driftModules.add(edge.toModule);
    }
    const extraModules = [...driftModules].filter((moduleName) => !knownModules.has(moduleName)).sort();
    for (const moduleName of extraModules) {
      lines.push(`  ${readMermaidModuleId(moduleIds, moduleName)}["${escapeMermaidLabel(moduleName)}"]`);
    }
  }

  if (edges.length === 0) {
    lines.push("  %% no observed module dependencies");
  } else {
    for (const edge of edges) {
      const label = formatMermaidEdgeLabel(edge);
      lines.push(
        `  ${readMermaidModuleId(moduleIds, edge.fromModule)} -->|${escapeMermaidEdgeLabel(label)}| ${readMermaidModuleId(
          moduleIds,
          edge.toModule
        )}`
      );
    }
  }

  return lines.join("\n");
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

  return {
    schemaVersion: graphJsonSchemaVersion,
    root: normalizePath(result.root),
    filters: {
      violationsOnly: options.violationsOnly === true,
      attention: options.attention === true
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
    allObservedDependencies,
    shownObservedDependencies: observedDependencies,
    observedDependencies,
    violations: result.violations.map((violation) => toJsonViolation(result.root, violation)),
    intentionalDebt,
    warnings: result.warnings.map((warning) => toJsonViolation(result.root, warning)),
    ...(drift ? { drift } : {})
  };
}

function formatObservedDependencyCount(graph: GraphJsonResult): string {
  if (!graph.filters.violationsOnly) {
    return String(graph.summary.observedDependencies);
  }

  return `${graph.summary.shownObservedDependencies} of ${graph.summary.observedDependencies}`;
}

function formatMarkdownReviewStatus(graph: GraphJsonResult): string {
  if (graph.summary.violations > 0) {
    return "failing contract";
  }

  const driftCount = (graph.drift?.newObservedEdges.length ?? 0) + (graph.drift?.removedObservedEdges.length ?? 0);
  if (graph.summary.intentionalViolations > 0 || graph.summary.warnings > 0 || driftCount > 0) {
    return "needs review";
  }

  return "clear";
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

function formatMarkdownReviewNotes(graph: GraphJsonResult): string[] {
  const lines = [
    "### Review Notes",
    "- This is review output; use `axi check` when you want a CI gate.",
    "- Hard violations are contract failures.",
    "- Intentional violations, warnings, and drift are visible debt or advisory signals.",
    "- Axiom does not auto-accept debt; accepted debt must be declared in `.axi` with an expiration date and reason.",
    "- Expired or invalid intentional violations are hard contract failures in `axi check`."
  ];

  if (graph.filters.violationsOnly) {
    lines.push("- Observed dependencies are filtered to attention edges; the summary keeps the full count.");
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
    lines.push(`  - Contract: ${markdownCode(formatLocation(debt.contractLocation))}`);
    lines.push(`  - Reason: ${debt.reason}`);
    if (debt.suggestion) {
      lines.push(`  - Fix: ${debt.suggestion}`);
    }
  }

  return lines;
}

function formatMarkdownWarnings(graph: GraphJsonResult): string[] {
  const lines = ["### Advisory Warnings"];

  if (graph.warnings.length === 0) {
    lines.push("- None");
    return lines;
  }

  for (const warning of graph.warnings) {
    const location = warning.location ? ` at ${markdownCode(formatLocation(warning.location))}` : "";
    lines.push(`- ${markdownCode(warning.code)}${location}: ${warning.message}`);
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

  const internalTargets = readStringArray(warning.details?.internalTargets);
  if (internalTargets.length > 0) {
    appendMarkdownDetail(lines, "Internal targets", internalTargets.map(markdownCode).join(", "));
  }

  const threshold = readRecord(warning.details?.threshold);
  const fanInThreshold = readNumber(threshold?.fanInModules);
  const fanOutThreshold = readNumber(threshold?.fanOutModules);
  const internalTargetsThreshold = readNumber(threshold?.internalTargets);
  if (fanInThreshold !== undefined || fanOutThreshold !== undefined || internalTargetsThreshold !== undefined) {
    appendMarkdownDetail(
      lines,
      "Threshold",
      [
        fanInThreshold === undefined ? undefined : `fan-in >= ${fanInThreshold}`,
        fanOutThreshold === undefined ? undefined : `fan-out >= ${fanOutThreshold}`,
        internalTargetsThreshold === undefined ? undefined : `internal targets >= ${internalTargetsThreshold}`
      ]
        .filter((item): item is string => item !== undefined)
        .join(" or ")
    );
  }

  const incomingModules = readStringArray(warning.details?.incomingModules);
  if (incomingModules.length > 0) {
    appendMarkdownDetail(lines, "Fan-in modules", incomingModules.join(", "));
  }

  const outgoingModules = readStringArray(warning.details?.outgoingModules);
  if (outgoingModules.length > 0) {
    appendMarkdownDetail(lines, "Fan-out modules", outgoingModules.join(", "));
  }

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

function appendMarkdownDetail(lines: string[], label: string, value: string | undefined): void {
  if (value) {
    lines.push(`  - ${label}: ${value}`);
  }
}

function formatMarkdownDrift(drift: GraphJsonDrift): string[] {
  const baselineLabel = drift.baseline.path ?? "provided baseline";
  const schemaSuffix = drift.baseline.schemaVersion ? `, ${drift.baseline.schemaVersion}` : "";
  const lines = [
    "### Architecture Drift (Advisory)",
    `- Kind: ${markdownCode(drift.kind)}`,
    `- Baseline: ${markdownCode(baselineLabel)} (${drift.baseline.observedDependencies} observed dependencies${schemaSuffix})`,
    "- New observed edges:"
  ];

  if (drift.newObservedEdges.length === 0) {
    lines.push("  - None");
  } else {
    for (const edge of drift.newObservedEdges) {
      lines.push(...formatMarkdownDriftEdge(edge, "via"));
    }
  }

  lines.push("- Removed observed edges:");
  if (drift.removedObservedEdges.length === 0) {
    lines.push("  - None");
  } else {
    for (const edge of drift.removedObservedEdges) {
      lines.push(...formatMarkdownDriftEdge(edge, "previously via"));
    }
  }

  return lines;
}

function formatMarkdownDriftEdge(edge: GraphJsonDriftEdge, importPrefix: "via" | "previously via"): string[] {
  const attentionCodes = [
    ...edge.violations.map((violation) => violation.code),
    ...edge.intentionalViolations.map((violation) => `${violation.code} intentional`)
  ];
  const suffix = attentionCodes.length > 0 ? ` (${attentionCodes.map((code) => markdownCode(code)).join(", ")})` : "";
  const lines = [`  - ${markdownCode(`${edge.fromModule} -> ${edge.toModule}`)}${suffix}`];

  for (const importSite of edge.imports) {
    lines.push(`    - ${importPrefix} ${formatMarkdownImport(importSite)}`);
  }

  for (const violation of edge.violations) {
    lines.push(`    - ${markdownCode(violation.code)}: ${violation.message}`);
    if (violation.suggestion) {
      lines.push(`    - Fix: ${violation.suggestion}`);
    }
  }

  for (const violation of edge.intentionalViolations) {
    lines.push(`    - Intentional ${markdownCode(violation.code)}: ${violation.message}`);
  }

  return lines;
}

function formatMarkdownImport(importSite: GraphJsonImportSite): string {
  return `${markdownCode(formatLocation(importSite))} importing ${markdownCode(importSite.specifier)}`;
}

function formatLocation(location: GraphJsonLocation | GraphJsonImportSite): string {
  return `${location.filePath}:${location.line}`;
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
  }

  return lines;
}

function getOtherViolations(graph: GraphJsonResult): GraphJsonViolation[] {
  const dependencyViolationKeys = new Set(
    graph.observedDependencies.flatMap((dependency) =>
      dependency.violations.map((violation) => `${dependency.import.filePath}:${dependency.import.line}:${violation.code}`)
    )
  );

  return graph.violations.filter((violation) => {
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
    return lines;
  }

  for (const warning of graph.warnings) {
    const location = warning.location ? ` ${warning.location.filePath}:${warning.location.line}` : "";
    lines.push(`  ${warning.code}${location}: ${warning.message}`);
    const observed = readString(warning.details?.observed);
    if (observed) {
      lines.push(`  observed: ${observed}`);
    }

    const specifier = readString(warning.details?.specifier);
    if (specifier) {
      lines.push(`  specifier: "${specifier}"`);
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

    const internalTargets = readStringArray(warning.details?.internalTargets);
    if (internalTargets.length > 0) {
      lines.push(`  internal targets: ${internalTargets.join(", ")}`);
    }

    const threshold = readRecord(warning.details?.threshold);
    const fanInThreshold = readNumber(threshold?.fanInModules);
    const fanOutThreshold = readNumber(threshold?.fanOutModules);
    const internalTargetsThreshold = readNumber(threshold?.internalTargets);
    if (fanInThreshold !== undefined || fanOutThreshold !== undefined || internalTargetsThreshold !== undefined) {
      lines.push(
        `  threshold: ${[
          fanInThreshold === undefined ? undefined : `fan-in >= ${fanInThreshold}`,
          fanOutThreshold === undefined ? undefined : `fan-out >= ${fanOutThreshold}`,
          internalTargetsThreshold === undefined ? undefined : `internal targets >= ${internalTargetsThreshold}`
        ]
          .filter((item): item is string => item !== undefined)
          .join(" or ")}`
      );
    }

    const incomingModules = readStringArray(warning.details?.incomingModules);
    if (incomingModules.length > 0) {
      lines.push(`  fan-in modules: ${incomingModules.join(", ")}`);
    }

    const outgoingModules = readStringArray(warning.details?.outgoingModules);
    if (outgoingModules.length > 0) {
      lines.push(`  fan-out modules: ${outgoingModules.join(", ")}`);
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

function formatDriftOnly(graph: GraphJsonResult): string[] {
  if (!graph.drift) {
    return ["architecture drift (advisory):", "  no baseline provided"];
  }

  const lines = formatDrift(graph.drift);
  lines.push("");
  lines.push("next:");
  lines.push("  use axi observe --baseline <graph-json> when you also want violations, visible debt, and warnings");
  lines.push("  use axi check when you want a CI gate");
  return lines;
}

function formatDrift(drift: GraphJsonDrift): string[] {
  const baselineLabel = drift.baseline.path ?? "provided baseline";
  const schemaSuffix = drift.baseline.schemaVersion ? `, ${drift.baseline.schemaVersion}` : "";
  const lines = [
    "architecture drift (advisory):",
    `  baseline: ${baselineLabel} (${drift.baseline.observedDependencies} observed dependencies${schemaSuffix})`,
    "  new observed edges:"
  ];

  if (drift.newObservedEdges.length === 0) {
    lines.push("    none");
  } else {
    for (const edge of drift.newObservedEdges) {
      lines.push(...formatDriftEdge(edge, "via"));
    }
  }

  lines.push("  removed observed edges:");
  if (drift.removedObservedEdges.length === 0) {
    lines.push("    none");
  } else {
    for (const edge of drift.removedObservedEdges) {
      lines.push(...formatDriftEdge(edge, "previously via"));
    }
  }

  return lines;
}

function formatDriftEdge(edge: GraphJsonDriftEdge, importPrefix: "via" | "previously via"): string[] {
  const attentionCodes = [
    ...edge.violations.map((violation) => violation.code),
    ...edge.intentionalViolations.map((violation) => `${violation.code} intentional`)
  ];
  const suffix = attentionCodes.length > 0 ? ` [${attentionCodes.join(", ")}]` : "";
  const lines = [`    ${edge.fromModule} -> ${edge.toModule}${suffix}`];

  for (const importSite of edge.imports) {
    lines.push(`      ${importPrefix} ${importSite.filePath}:${importSite.line} "${importSite.specifier}"`);
  }

  for (const violation of edge.violations) {
    lines.push(`      ${violation.code}: ${violation.message}`);
    if (violation.suggestion) {
      lines.push(`      fix: ${violation.suggestion}`);
    }
  }

  for (const violation of edge.intentionalViolations) {
    lines.push(`      intentional violation ${violation.code}: ${violation.message}`);
  }

  return lines;
}

function computeDrift(
  baseline: GraphBaseline,
  currentDependencies: GraphJsonObservedDependency[]
): GraphJsonDrift {
  const baselineEdges = groupObservedEdges(baseline.observedDependencies);
  const currentEdges = groupObservedEdges(currentDependencies);
  const newObservedEdges = [...currentEdges.entries()]
    .filter(([key]) => !baselineEdges.has(key))
    .map(([, edge]) => edge)
    .sort(compareDriftEdges);
  const removedObservedEdges = [...baselineEdges.entries()]
    .filter(([key]) => !currentEdges.has(key))
    .map(([, edge]) => edge)
    .sort(compareDriftEdges);

  return {
    kind: "advisory_observed_edge_drift",
    baseline: {
      ...(baseline.path ? { path: baseline.path } : {}),
      ...(baseline.schemaVersion ? { schemaVersion: baseline.schemaVersion } : {}),
      observedDependencies: baseline.observedDependencies.length
    },
    newObservedEdges,
    removedObservedEdges
  };
}

function groupObservedEdges(
  dependencies: ReadonlyArray<GraphBaselineObservedDependency | GraphJsonObservedDependency>
): Map<string, GraphJsonDriftEdge> {
  const edges = new Map<string, GraphJsonDriftEdge>();

  for (const dependency of dependencies) {
    const key = observedEdgeKey(dependency.fromModule, dependency.toModule);
    const existing = edges.get(key);
    const edge =
      existing ??
      {
        fromModule: dependency.fromModule,
        toModule: dependency.toModule,
        imports: [],
        violations: [],
        intentionalViolations: []
      };
    edge.imports.push(dependency.import);
    if ("violations" in dependency) {
      addUniqueViolations(edge.violations, dependency.violations);
      addUniqueIntentionalViolations(edge.intentionalViolations, dependency.intentionalViolations);
    }
    edges.set(key, edge);
  }

  return edges;
}

function observedEdgeKey(fromModule: string, toModule: string): string {
  return `${fromModule}\0${toModule}`;
}

function addUniqueViolations(target: GraphJsonDependencyViolation[], incoming: GraphJsonDependencyViolation[]): void {
  const existing = new Set(target.map((violation) => diagnosticKey(violation)));
  for (const violation of incoming) {
    const key = diagnosticKey(violation);
    if (!existing.has(key)) {
      target.push(violation);
      existing.add(key);
    }
  }
}

function addUniqueIntentionalViolations(
  target: GraphJsonIntentionalDependencyViolation[],
  incoming: GraphJsonIntentionalDependencyViolation[]
): void {
  const existing = new Set(target.map((violation) => intentionalDiagnosticKey(violation)));
  for (const violation of incoming) {
    const key = intentionalDiagnosticKey(violation);
    if (!existing.has(key)) {
      target.push(violation);
      existing.add(key);
    }
  }
}

function diagnosticKey(violation: GraphJsonDependencyViolation): string {
  return `${violation.code}\0${violation.message}\0${violation.suggestion ?? ""}`;
}

function intentionalDiagnosticKey(violation: GraphJsonIntentionalDependencyViolation): string {
  return `${diagnosticKey(violation)}\0${violation.contract.acceptedUntil}\0${violation.contract.reason}\0${violation.contract.ruleLocation.filePath}:${violation.contract.ruleLocation.line}`;
}

function compareDriftEdges(left: GraphJsonDriftEdge, right: GraphJsonDriftEdge): number {
  return `${left.fromModule}->${left.toModule}`.localeCompare(`${right.fromModule}->${right.toModule}`);
}

function compareIntentionalDebt(left: GraphJsonIntentionalDebt, right: GraphJsonIntentionalDebt): number {
  return `${left.acceptedUntil}\0${left.fromModule}->${left.toModule}\0${left.code}`.localeCompare(
    `${right.acceptedUntil}\0${right.fromModule}->${right.toModule}\0${right.code}`
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

interface MermaidModuleGroup {
  layer?: string;
  modules: GraphJsonModule[];
}

interface MermaidEdge {
  fromModule: string;
  toModule: string;
  importCount: number;
  violationCodes: string[];
  intentionalViolationCodes: string[];
  driftKind?: "new" | "removed";
}

function groupModulesForMermaid(modules: GraphJsonModule[]): MermaidModuleGroup[] {
  const groups: MermaidModuleGroup[] = [];
  const indexByLayer = new Map<string, number>();
  const unlayeredModules: GraphJsonModule[] = [];

  for (const module of modules) {
    if (!module.layer) {
      unlayeredModules.push(module);
      continue;
    }

    const groupIndex = indexByLayer.get(module.layer);
    if (groupIndex !== undefined) {
      groups[groupIndex]?.modules.push(module);
      continue;
    }

    indexByLayer.set(module.layer, groups.length);
    groups.push({ layer: module.layer, modules: [module] });
  }

  if (unlayeredModules.length > 0) {
    groups.push({ modules: unlayeredModules });
  }

  return groups;
}

function aggregateMermaidEdges(graph: GraphJsonResult, options: GraphFormatOptions): MermaidEdge[] {
  if (options.driftOnly && graph.drift) {
    return aggregateMermaidDriftEdges(graph.drift);
  }

  const byPair = new Map<string, MermaidEdge>();

  for (const dependency of graph.observedDependencies) {
    const key = `${dependency.fromModule}\0${dependency.toModule}`;
    const edge = byPair.get(key) ?? {
      fromModule: dependency.fromModule,
      toModule: dependency.toModule,
      importCount: 0,
      violationCodes: [],
      intentionalViolationCodes: []
    };

    edge.importCount += 1;
    edge.violationCodes = mergeUnique(edge.violationCodes, dependency.violations.map((violation) => violation.code));
    edge.intentionalViolationCodes = mergeUnique(
      edge.intentionalViolationCodes,
      dependency.intentionalViolations.map((violation) => violation.code)
    );
    byPair.set(key, edge);
  }

  return [...byPair.values()].sort((left, right) =>
    `${left.fromModule}\0${left.toModule}`.localeCompare(`${right.fromModule}\0${right.toModule}`)
  );
}

function aggregateMermaidDriftEdges(drift: GraphJsonDrift): MermaidEdge[] {
  const edges = [
    ...drift.newObservedEdges.map((edge): MermaidEdge => ({
      fromModule: edge.fromModule,
      toModule: edge.toModule,
      importCount: edge.imports.length,
      violationCodes: edge.violations.map((violation) => violation.code),
      intentionalViolationCodes: edge.intentionalViolations.map((violation) => violation.code),
      driftKind: "new"
    })),
    ...drift.removedObservedEdges.map((edge): MermaidEdge => ({
      fromModule: edge.fromModule,
      toModule: edge.toModule,
      importCount: edge.imports.length,
      violationCodes: edge.violations.map((violation) => violation.code),
      intentionalViolationCodes: edge.intentionalViolations.map((violation) => violation.code),
      driftKind: "removed"
    }))
  ];

  return edges.sort((left, right) =>
    `${left.driftKind}\0${left.fromModule}\0${left.toModule}`.localeCompare(
      `${right.driftKind}\0${right.fromModule}\0${right.toModule}`
    )
  );
}

function formatMermaidModuleLabel(module: GraphJsonModule): string {
  const purpose = module.purpose ? `<br/>${escapeMermaidLabel(module.purpose)}` : "";
  return `${escapeMermaidLabel(module.name)}${purpose}`;
}

function formatMermaidEdgeLabel(edge: MermaidEdge): string {
  const parts = [`${edge.importCount} import${pluralize(edge.importCount)}`];
  if (edge.driftKind) {
    parts.push(`${edge.driftKind} edge`);
  }

  const codes = [
    ...edge.violationCodes,
    ...edge.intentionalViolationCodes.map((code) => `${code} intentional`)
  ];

  if (codes.length > 0) {
    parts.push(codes.join(", "));
  }

  return parts.join("; ");
}

function formatMermaidLegend(graph: GraphJsonResult, options: GraphFormatOptions): string[] {
  const viewLabel = options.driftOnly && graph.drift
    ? `Diff view: ${graph.drift.newObservedEdges.length} new, ${graph.drift.removedObservedEdges.length} removed observed module edge${pluralize(
        graph.drift.newObservedEdges.length + graph.drift.removedObservedEdges.length
      )}`
    : graph.filters.violationsOnly
    ? `${options.observe ? "FILTERED observe view" : "FILTERED graph view"}: ${formatObservedDependencyCount(
        graph
      )} observed dependency edges shown`
    : `Full observed view: ${graph.summary.observedDependencies} observed dependency edge${pluralize(
        graph.summary.observedDependencies
      )} shown`;
  const filterLabel = options.driftOnly
    ? "Only baseline drift edges are shown; unchanged edges are omitted"
    : graph.filters.violationsOnly
    ? "Clean observed dependencies are omitted"
    : "Clean and debt edges are both shown";

  return [
    `  subgraph axiom_legend["Axiom graph legend"]`,
    `    axiom_legend_scope["${formatMermaidMultilineLabel([viewLabel, filterLabel])}"]`,
    `    axiom_legend_nodes["${formatMermaidMultilineLabel([
      "Nodes: declared .axi modules",
      "Grouped by declared layer when present"
    ])}"]`,
    `    axiom_legend_edges["${formatMermaidMultilineLabel([
      "Edges: observed imports",
      "Labels show import counts and drift/debt codes"
    ])}"]`,
    `    axiom_legend_output["${formatMermaidMultilineLabel([
      "Presentation output only",
      "Use axi graph --json for machine-readable data"
    ])}"]`,
    "  end"
  ];
}

function formatMermaidCommandName(options: GraphFormatOptions): string {
  if (options.driftOnly) {
    return "axi diff";
  }

  return options.observe ? "axi observe" : "axi graph";
}

function formatMermaidMultilineLabel(lines: string[]): string {
  return lines.map(escapeMermaidLabel).join("<br/>");
}

function readMermaidModuleId(moduleIds: Map<string, string>, moduleName: string): string {
  const existing = moduleIds.get(moduleName);
  if (existing) {
    return existing;
  }

  const generated = mermaidId("module", moduleName);
  moduleIds.set(moduleName, generated);
  return generated;
}

function mermaidId(prefix: string, value: string): string {
  const normalized = value.replace(/[^A-Za-z0-9_]/g, "_");
  return `${prefix}_${normalized.length > 0 ? normalized : "item"}`;
}

function escapeMermaidLabel(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\r?\n/g, " ");
}

function escapeMermaidEdgeLabel(value: string): string {
  return escapeMermaidLabel(value).replace(/\|/g, "&#124;");
}

function mergeUnique(existing: string[], additions: string[]): string[] {
  return [...new Set([...existing, ...additions])].sort();
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

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
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
