import path from "node:path";
import type { ModuleRef, PathRef, SourceLocation, Violation, ViolationCode } from "../axi/types.js";
import type { CheckResult } from "../validator/check.js";

export const graphJsonSchemaVersion = "axiom.graph.v12";

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
    pathScope?: string;
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

interface GraphJsonArchitectureSummary {
  model: "declared_intent_vs_observed_imports";
  mode: "graph" | "graph_attention" | "observe" | "diff";
  status: "clear" | "needs_contract" | "failing_contract" | "needs_review" | "drift_detected";
  gate: {
    command: "axi check";
    currentCommandIsGate: false;
    hardViolationsFailCheck: true;
  };
  reviewFocus: string;
  interpretation: GraphJsonArchitectureInterpretation;
  reviewStory: GraphJsonArchitectureReviewStory;
  topSignals: GraphJsonArchitectureSignal[];
  suggestedNextActions: string[];
}

interface GraphJsonArchitectureInterpretation {
  headline: string;
  quickRead: string[];
  lookFirst: string[];
  centralModules: GraphJsonArchitectureCentralModule[];
  caveat: string;
}

interface GraphJsonArchitectureCentralModule {
  module: string;
  role: "fan_in_hub" | "fan_out_hub" | "mixed_hub";
  incomingModules: number;
  outgoingModules: number;
  incomingImportSites: number;
  outgoingImportSites: number;
  totalImportSites: number;
}

interface GraphJsonArchitectureReviewStory {
  summary: string;
  setup: string;
  pressures: GraphJsonArchitecturePressure[];
  nextStep: string;
  caveat: string;
}

interface GraphJsonArchitecturePressure {
  kind: "setup_issue" | "hard_violation" | "visible_debt" | "advisory_warning_root" | "baseline_drift" | "graph_center";
  title: string;
  description: string;
  severity: "gate" | "review" | "advisory" | "info";
  count?: number;
  code?: string;
  modules?: string[];
}

interface GraphJsonArchitectureSignal {
  kind: "setup_issue" | "hard_violation" | "visible_debt" | "advisory_warning" | "baseline_drift";
  code: string;
  message: string;
  location?: GraphJsonLocation;
  edge?: {
    fromModule: string;
    toModule: string;
  };
  acceptedUntil?: string;
  reason?: string;
}

export interface GraphJsonResult {
  schemaVersion: typeof graphJsonSchemaVersion;
  root: string;
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
    "warning scope: advisory warning counts include only checks enabled for this command or config"
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

function formatGraphInterpretation(graph: GraphJsonResult): string[] {
  const interpretation = graph.architectureSummary.interpretation;
  const story = graph.architectureSummary.reviewStory;
  const lines = [`interpretation: ${interpretation.headline}`];
  lines.push(`story: ${story.summary}`);

  if (interpretation.centralModules.length > 0) {
    lines.push(`center: ${formatCentralModulesInline(interpretation.centralModules)}`);
  }

  if (story.pressures.length > 0) {
    lines.push("review story:");
    for (const pressure of story.pressures.slice(0, 3)) {
      lines.push(`  - ${pressure.title}: ${pressure.description}`);
    }
    lines.push(`  next: ${story.nextStep}`);
  }

  lines.push("look first:");
  interpretation.lookFirst.forEach((item, index) => {
    lines.push(`  ${index + 1}. ${item}`);
  });

  return lines;
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
    ...formatMarkdownObservedDependencySummary(graph),
    ...formatMarkdownViolationSummary(graph),
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
  lines.push(...formatMarkdownInterpretation(graph));
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
    `%% Summary: modules=${graph.summary.modules}, ${formatMermaidObservedDependencySummary(
      graph
    )}, violations=${graph.summary.violations}, intentionalViolations=${graph.summary.intentionalViolations}, warnings=${graph.summary.warnings}.`,
    "%% Warning counts include only advisory checks enabled for this command or config.",
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

  return {
    schemaVersion: graphJsonSchemaVersion,
    root: normalizePath(result.root),
    filters,
    architectureSummary: buildArchitectureSummary({
      filters,
      summary,
      allObservedDependencies,
      violations,
      intentionalDebt,
      warnings,
      drift,
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

function buildArchitectureSummary(input: {
  filters: GraphJsonResult["filters"];
  summary: GraphJsonResult["summary"];
  allObservedDependencies: GraphJsonObservedDependency[];
  violations: GraphJsonViolation[];
  intentionalDebt: GraphJsonIntentionalDebt[];
  warnings: GraphJsonViolation[];
  drift?: GraphJsonDrift;
  options: GraphFormatOptions;
}): GraphJsonArchitectureSummary {
  return {
    model: "declared_intent_vs_observed_imports",
    mode: formatArchitectureSummaryMode(input.options),
    status: formatArchitectureSummaryStatus(input),
    gate: {
      command: "axi check",
      currentCommandIsGate: false,
      hardViolationsFailCheck: true
    },
    reviewFocus: formatArchitectureSummaryFocus(input),
    interpretation: buildArchitectureInterpretation(input),
    reviewStory: buildArchitectureReviewStory(input),
    topSignals: formatArchitectureSummarySignals(input),
    suggestedNextActions: formatArchitectureSummaryNextActions(input)
  };
}

function formatArchitectureSummaryMode(options: GraphFormatOptions): GraphJsonArchitectureSummary["mode"] {
  if (options.driftOnly) {
    return "diff";
  }

  if (options.observe) {
    return "observe";
  }

  if (options.attention || options.violationsOnly) {
    return "graph_attention";
  }

  return "graph";
}

function formatArchitectureSummaryStatus(input: {
  violations: GraphJsonViolation[];
  intentionalDebt: GraphJsonIntentionalDebt[];
  warnings: GraphJsonViolation[];
  drift?: GraphJsonDrift;
}): GraphJsonArchitectureSummary["status"] {
  if (input.violations.some((violation) => violation.code === "no_spec_files")) {
    return "needs_contract";
  }

  if (input.violations.length > 0) {
    return "failing_contract";
  }

  if (input.intentionalDebt.length > 0 || input.warnings.length > 0) {
    return "needs_review";
  }

  const driftCount = (input.drift?.newObservedEdges.length ?? 0) + (input.drift?.removedObservedEdges.length ?? 0);
  if (driftCount > 0) {
    return "drift_detected";
  }

  return "clear";
}

function formatArchitectureSummaryFocus(input: {
  filters: GraphJsonResult["filters"];
  summary: GraphJsonResult["summary"];
  drift?: GraphJsonDrift;
  options: GraphFormatOptions;
}): string {
  if (input.options.driftOnly) {
    return "New and removed observed module edges since the baseline; unchanged edges are omitted.";
  }

  if (input.options.observe) {
    return "Hard violations, visible intentional debt, advisory warnings, and optional baseline drift.";
  }

  if (input.filters.violationsOnly) {
    return `${input.summary.shownObservedDependencies} of ${input.summary.observedDependencies} observed dependency edges are shown because they have hard violations or accepted debt.`;
  }

  if (input.drift) {
    return "Full observed module graph with advisory baseline drift.";
  }

  return "Full declared and observed module graph.";
}

function buildArchitectureInterpretation(input: {
  summary: GraphJsonResult["summary"];
  allObservedDependencies: GraphJsonObservedDependency[];
  violations: GraphJsonViolation[];
  intentionalDebt: GraphJsonIntentionalDebt[];
  warnings: GraphJsonViolation[];
  drift?: GraphJsonDrift;
}): GraphJsonArchitectureInterpretation {
  const centralModules = findCentralModules(input.allObservedDependencies);

  return {
    headline: formatArchitectureHeadline(input, centralModules),
    quickRead: formatArchitectureQuickRead(input, centralModules),
    lookFirst: formatArchitectureLookFirst(centralModules),
    centralModules,
    caveat:
      "This is a graph interpretation over static imports, not proof of semantic architecture health. Compare it with the architecture you intended."
  };
}

function buildArchitectureReviewStory(input: {
  summary: GraphJsonResult["summary"];
  allObservedDependencies: GraphJsonObservedDependency[];
  violations: GraphJsonViolation[];
  intentionalDebt: GraphJsonIntentionalDebt[];
  warnings: GraphJsonViolation[];
  drift?: GraphJsonDrift;
}): GraphJsonArchitectureReviewStory {
  const centralModules = findCentralModules(input.allObservedDependencies);
  const pressures: GraphJsonArchitecturePressure[] = [];
  const noSpecViolations = input.violations.filter((violation) => violation.code === "no_spec_files");
  const otherViolations = input.violations.filter((violation) => violation.code !== "no_spec_files");

  if (noSpecViolations.length > 0) {
    pressures.push({
      kind: "setup_issue",
      title: "Setup issue: no spec found",
      description:
        "Axiom can observe imports, but it cannot compare them with architecture intent until a `.axi` spec exists or `--spec` is provided.",
      severity: "review",
      count: noSpecViolations.length,
      code: "no_spec_files"
    });
  }

  if (otherViolations.length > 0) {
    pressures.push({
      kind: "hard_violation",
      title: "Hard contract failures",
      description: `${otherViolations.length} hard violation${pluralize(
        otherViolations.length
      )} should be fixed or explicitly accepted before treating this graph as stable.`,
      severity: "gate",
      count: otherViolations.length
    });
  }

  if (input.intentionalDebt.length > 0) {
    pressures.push({
      kind: "visible_debt",
      title: "Visible accepted architecture debt",
      description: `${input.intentionalDebt.length} accepted debt item${pluralize(
        input.intentionalDebt.length
      )} remain visible and should be reviewed before expiration.`,
      severity: "review",
      count: input.intentionalDebt.length
    });
  }

  for (const cluster of buildWarningClusters(input.warnings).slice(0, 3)) {
    pressures.push(warningClusterToReviewPressure(cluster));
  }

  const driftCount = readDriftCount(input.drift);
  if (driftCount > 0 && input.drift) {
    pressures.push({
      kind: "baseline_drift",
      title: "Observed graph drift",
      description: `${input.drift.newObservedEdges.length} new and ${
        input.drift.removedObservedEdges.length
      } removed observed module edge${pluralize(driftCount)} changed since the baseline.`,
      severity: "advisory",
      count: driftCount
    });
  }

  if (pressures.length === 0 && centralModules[0]) {
    pressures.push({
      kind: "graph_center",
      title: `Quiet graph center: ${centralModules[0].module}`,
      description:
        "No hard failures, visible debt, advisory warnings, or drift were reported; compare this center with the architecture you expected before saving a baseline.",
      severity: "info",
      modules: [centralModules[0].module]
    });
  }

  return {
    summary: formatReviewStorySummary(input, pressures),
    setup: formatReviewStorySetup(input.summary),
    pressures,
    nextStep: formatReviewStoryNextStep(input, pressures),
    caveat:
      "This story is a review aid over static imports. It points to likely pressure, not proof that the architecture is good or bad; a quiet import graph can still hide intra-file responsibility concentration."
  };
}

function formatReviewStorySetup(summary: GraphJsonResult["summary"]): string {
  return `Scanned ${summary.modules} declared module${pluralize(summary.modules)} and ${
    summary.observedDependencies
  } observed import edge${pluralize(summary.observedDependencies)}. This report is advisory unless you run ` +
    "`axi check` as the gate.";
}

function formatReviewStorySummary(
  input: {
    summary: GraphJsonResult["summary"];
    violations: GraphJsonViolation[];
    intentionalDebt: GraphJsonIntentionalDebt[];
    warnings: GraphJsonViolation[];
    drift?: GraphJsonDrift;
  },
  pressures: GraphJsonArchitecturePressure[]
): string {
  if (input.violations.some((violation) => violation.code === "no_spec_files")) {
    return "Axiom can scan this repository, but it cannot judge declared-vs-observed drift until architecture intent is supplied.";
  }

  if (input.violations.length > 0) {
    return "The contract is failing. Treat the listed hard violations as the first repair target before using this graph as a baseline.";
  }

  if (input.intentionalDebt.length > 0 || input.warnings.length > 0) {
    const firstPressure = pressures[0];
    return firstPressure
      ? `No hard gate failures. Start review with ${firstPressure.title}: ${firstPressure.description}`
      : "No hard gate failures, but advisory review signals are present.";
  }

  const driftCount = readDriftCount(input.drift);
  if (driftCount > 0) {
    return "No hard gate failures. Start review with the observed graph drift before updating any baseline.";
  }

  if (input.summary.observedDependencies === 0) {
    return "This scoped import graph is quiet and observed no cross-module import edges. Confirm the scope covers the architecture you care about; this does not inspect intra-file responsibility concentration unless large-file warnings are enabled.";
  }

  return "This scoped import graph is quiet. Confirm the graph center matches intended architecture before saving or updating a baseline; quiet imports do not prove intra-file responsibilities are healthy.";
}

function formatReviewStoryNextStep(
  input: {
    violations: GraphJsonViolation[];
    intentionalDebt: GraphJsonIntentionalDebt[];
    warnings: GraphJsonViolation[];
    drift?: GraphJsonDrift;
  },
  pressures: GraphJsonArchitecturePressure[]
): string {
  if (input.violations.some((violation) => violation.code === "no_spec_files")) {
    return "Run `axi infer` or pass `--spec`, then review the generated comments before treating the draft as intent.";
  }

  if (input.violations.length > 0) {
    return "Fix hard violations first, or add visible temporary `accepts ... [at \"path\"] until ... because ...` debt only after review.";
  }

  if (input.intentionalDebt.length > 0 || input.warnings.length > 0) {
    const firstPressure = pressures[0];
    return firstPressure
      ? `Inspect ${firstPressure.title}; decide whether to change code, clarify .axi visibility rules, or keep the signal advisory.`
      : "Inspect advisory signals; decide whether to change code, clarify the contract, or keep them as visible review notes.";
  }

  if (readDriftCount(input.drift) > 0) {
    return "Inspect new and removed observed edges, then update the baseline only if the drift matches intended architecture.";
  }

  return "Confirm scan scope and intended graph shape, then save a baseline with `axi graph --json` if this is the shape to watch.";
}

function warningClusterToReviewPressure(cluster: WarningCluster): GraphJsonArchitecturePressure {
  const modules = readWarningClusterModules(cluster);

  if (cluster.code === "deep_internal_import") {
    const moduleName = modules[0] ?? "module";
    if (cluster.subject.includes("state/store leakage")) {
      return {
        kind: "advisory_warning_root",
        title: `State/store leakage into ${moduleName}`,
        description: `${cluster.count} deep import${pluralize(
          cluster.count
        )} target state or store internals; review whether state should be injected, evented, or exposed through an explicit boundary.`,
        severity: "review",
        count: cluster.count,
        code: cluster.code,
        modules
      };
    }

    if (cluster.subject.includes("tool boundary pressure")) {
      return {
        kind: "advisory_warning_root",
        title: `Tool boundary pressure in ${moduleName}`,
        description: `${cluster.count} deep import${pluralize(
          cluster.count
        )} touch tool or tooling internals; review whether contracts/types should move to a smaller shared boundary.`,
        severity: "review",
        count: cluster.count,
        code: cluster.code,
        modules
      };
    }

    if (cluster.subject.includes("ambiguous public boundary")) {
      return {
        kind: "advisory_warning_root",
        title: `Ambiguous public boundary in ${moduleName}`,
        description: `${cluster.count} deep import${pluralize(
          cluster.count
        )} have no clear same-source-group entrypoint; split the module or declare explicit exposure rules before rewriting imports.`,
        severity: "review",
        count: cluster.count,
        code: cluster.code,
        modules
      };
    }

    return {
      kind: "advisory_warning_root",
      title: `Public-entry bypass in ${moduleName}`,
      description: `${cluster.count} deep import${pluralize(
        cluster.count
      )} bypass a likely source-group entrypoint; review whether the import should use the public boundary or be declared intentional.`,
      severity: "review",
      count: cluster.count,
      code: cluster.code,
      modules
    };
  }

  if (cluster.code === "composition_root_pressure") {
    const moduleName =
      modules[0] ??
      cluster.subject
        .replace(" composition root imports", "")
        .replace(" composition root fan-out", "");
    return {
      kind: "advisory_warning_root",
      title: `Composition root pressure in ${moduleName}`,
      description: `${cluster.count} concentration warning${pluralize(
        cluster.count
      )} likely comes from entry-point wiring; review whether the entry file only composes modules or is also accumulating product logic.`,
      severity: "review",
      count: cluster.count,
      code: cluster.code,
      modules
    };
  }

  if (cluster.code === "coupling_concentration") {
    if (
      cluster.subject.includes("composition root fan-out") ||
      cluster.subject.includes("composition root imports")
    ) {
      const moduleName =
        modules[0] ??
        cluster.subject
          .replace(" composition root fan-out", "")
          .replace(" composition root imports", "");
      return {
        kind: "advisory_warning_root",
        title: `Composition root pressure in ${moduleName}`,
        description: `${cluster.count} concentration warning${pluralize(
          cluster.count
        )} likely comes from entry-point wiring; review whether the entry file only composes modules or is also accumulating product logic.`,
        severity: "review",
        count: cluster.count,
        code: cluster.code,
        modules
      };
    }

    return {
      kind: "advisory_warning_root",
      title: `Coupling concentration around ${cluster.subject}`,
      description: `${cluster.count} concentration warning${pluralize(
        cluster.count
      )} suggest this module may be becoming a coordination hub.`,
      severity: "review",
      count: cluster.count,
      code: cluster.code,
      modules
    };
  }

  if (cluster.code === "large_module_file") {
    return {
      kind: "advisory_warning_root",
      title: "Intra-file responsibility pressure",
      description: `${cluster.count} large source file${pluralize(
        cluster.count
      )} may hide architecture pressure that import graphs cannot see.`,
      severity: "review",
      count: cluster.count,
      code: cluster.code,
      modules
    };
  }

  return {
    kind: "advisory_warning_root",
    title: `${cluster.code} around ${cluster.subject}`,
    description: `${cluster.count} advisory warning${pluralize(cluster.count)} share this root.`,
    severity: "review",
    count: cluster.count,
    code: cluster.code,
    modules
  };
}

function readWarningClusterModules(cluster: WarningCluster): string[] {
  if (cluster.code === "large_module_file") {
    return [];
  }

  const subject = cluster.subject;
  const arrowModules = subject.includes(" -> ")
    ? subject
        .split(" -> ")
        .map((part) => part.trim())
        .filter(Boolean)
    : [];
  if (arrowModules.length > 0) {
    return arrowModules;
  }

  const markers = [
    " state/store leakage",
    " tool boundary pressure",
    " ambiguous public boundary",
    " public-entry bypass",
    " composition root imports",
    " composition root fan-out"
  ];
  for (const marker of markers) {
    const index = subject.indexOf(marker);
    if (index > 0) {
      return [subject.slice(0, index)];
    }
  }

  const beforeColon = subject.split(":")[0]?.trim();
  return beforeColon ? [beforeColon] : [];
}

function formatArchitectureHeadline(
  input: {
    summary: GraphJsonResult["summary"];
    violations: GraphJsonViolation[];
    intentionalDebt: GraphJsonIntentionalDebt[];
    warnings: GraphJsonViolation[];
    drift?: GraphJsonDrift;
  },
  centralModules: GraphJsonArchitectureCentralModule[]
): string {
  if (input.violations.some((violation) => violation.code === "no_spec_files")) {
    return "No `.axi` contract was found, so Axiom can scan the code but cannot compare it with declared architecture intent yet.";
  }

  if (input.violations.length > 0) {
    return `Contract is failing: ${input.violations.length} hard violation${pluralize(
      input.violations.length
    )} should be repaired or explicitly accepted before treating the graph as stable.`;
  }

  if (input.intentionalDebt.length > 0 || input.warnings.length > 0) {
    const reviewSignalTotal = input.intentionalDebt.length + input.warnings.length;
    return `No hard contract failures, but ${formatReviewSignalCount(
      input.intentionalDebt.length,
      input.warnings.length
    )} ${reviewSignalTotal === 1 ? "needs" : "need"} review${formatCentralHeadlineSuffix(centralModules)}.`;
  }

  const driftCount = readDriftCount(input.drift);
  if (driftCount > 0) {
    return `No hard contract failures, but baseline drift changed ${driftCount} observed module edge${pluralize(
      driftCount
    )}${formatCentralHeadlineSuffix(centralModules)}.`;
  }

  if (input.summary.observedDependencies === 0) {
    return "No hard contract failures were reported, and this scoped import graph did not observe cross-module imports. Confirm the scan scope covers the architecture you care about; quiet imports do not prove intra-file responsibilities are healthy.";
  }

  return `This scoped import graph is quiet: no hard failures, visible debt, advisory warnings, or baseline drift were reported${formatCentralHeadlineReviewPrompt(
    centralModules
  )}. Quiet imports do not prove intra-file responsibilities are healthy.`;
}

function formatArchitectureQuickRead(
  input: {
    summary: GraphJsonResult["summary"];
    violations: GraphJsonViolation[];
    intentionalDebt: GraphJsonIntentionalDebt[];
    warnings: GraphJsonViolation[];
    drift?: GraphJsonDrift;
  },
  centralModules: GraphJsonArchitectureCentralModule[]
): string[] {
  const lines: string[] = [];

  if (input.violations.some((violation) => violation.code === "no_spec_files")) {
    lines.push("Contract: missing; run `axi infer` or pass `--spec` before judging declared-vs-observed drift.");
  } else if (input.violations.length > 0) {
    lines.push(`Contract: ${input.violations.length} hard violation${pluralize(input.violations.length)}.`);
  } else {
    lines.push("Contract: no hard failures in this command output.");
  }

  const centralSummary = formatCentralModulesInline(centralModules);
  lines.push(
    centralSummary
      ? `Graph center: ${centralSummary}.`
      : "Graph center: no cross-module import center was observed in this scope."
  );

  if (input.intentionalDebt.length > 0 || input.warnings.length > 0) {
    lines.push(`Review pressure: ${formatReviewSignalCount(input.intentionalDebt.length, input.warnings.length)}.`);
  } else {
    lines.push("Review pressure: no visible debt or advisory warnings.");
  }

  const driftCount = readDriftCount(input.drift);
  if (driftCount > 0 && input.drift) {
    lines.push(
      `Baseline drift: ${input.drift.newObservedEdges.length} new and ${input.drift.removedObservedEdges.length} removed observed module edge${pluralize(
        driftCount
      )}.`
    );
  }

  return lines;
}

function formatArchitectureLookFirst(centralModules: GraphJsonArchitectureCentralModule[]): string[] {
  return [
    "Hard signals: read `violations[]`, `intentionalDebt[]`, and `warnings[]` before judging the diagram.",
    centralModules.length > 0
      ? `Graph center: inspect ${centralModules[0]?.module}; it carries the strongest observed coupling in this scan.`
      : "Graph center: if no center appears, confirm the scan scope actually covers the architecture you care about.",
    "Shape fit: compare central modules, deep imports, drift, and any intra-file pressure warnings with the architecture you expected for this repository."
  ];
}

function findCentralModules(
  dependencies: GraphJsonObservedDependency[]
): GraphJsonArchitectureCentralModule[] {
  const modules = new Map<
    string,
    {
      incomingModules: Set<string>;
      outgoingModules: Set<string>;
      incomingImportSites: number;
      outgoingImportSites: number;
    }
  >();

  for (const dependency of dependencies) {
    const from = readCentrality(modules, dependency.fromModule);
    from.outgoingModules.add(dependency.toModule);
    from.outgoingImportSites += 1;

    const to = readCentrality(modules, dependency.toModule);
    to.incomingModules.add(dependency.fromModule);
    to.incomingImportSites += 1;
  }

  return [...modules.entries()]
    .map(([module, metrics]) => ({
      module,
      role: formatCentralRole(metrics.incomingModules.size, metrics.outgoingModules.size),
      incomingModules: metrics.incomingModules.size,
      outgoingModules: metrics.outgoingModules.size,
      incomingImportSites: metrics.incomingImportSites,
      outgoingImportSites: metrics.outgoingImportSites,
      totalImportSites: metrics.incomingImportSites + metrics.outgoingImportSites
    }))
    .filter((module) => module.totalImportSites > 0)
    .sort(compareCentralModules)
    .slice(0, 3);
}

function readCentrality(
  modules: Map<
    string,
    {
      incomingModules: Set<string>;
      outgoingModules: Set<string>;
      incomingImportSites: number;
      outgoingImportSites: number;
    }
  >,
  moduleName: string
): {
  incomingModules: Set<string>;
  outgoingModules: Set<string>;
  incomingImportSites: number;
  outgoingImportSites: number;
} {
  const existing = modules.get(moduleName);
  if (existing) {
    return existing;
  }

  const created = {
    incomingModules: new Set<string>(),
    outgoingModules: new Set<string>(),
    incomingImportSites: 0,
    outgoingImportSites: 0
  };
  modules.set(moduleName, created);
  return created;
}

function formatCentralRole(
  incomingModules: number,
  outgoingModules: number
): GraphJsonArchitectureCentralModule["role"] {
  if (incomingModules > outgoingModules) {
    return "fan_in_hub";
  }

  if (outgoingModules > incomingModules) {
    return "fan_out_hub";
  }

  return "mixed_hub";
}

function compareCentralModules(
  left: GraphJsonArchitectureCentralModule,
  right: GraphJsonArchitectureCentralModule
): number {
  const scoreDifference = scoreCentralModule(right) - scoreCentralModule(left);
  if (scoreDifference !== 0) {
    return scoreDifference;
  }

  return left.module.localeCompare(right.module);
}

function scoreCentralModule(module: GraphJsonArchitectureCentralModule): number {
  return module.totalImportSites + (module.incomingModules + module.outgoingModules) * 4;
}

function formatCentralModulesInline(centralModules: GraphJsonArchitectureCentralModule[]): string {
  return centralModules
    .slice(0, 2)
    .map((module) => `${module.module} (${formatCentralModuleMetrics(module)})`)
    .join(", ");
}

function formatCentralModuleMetrics(module: GraphJsonArchitectureCentralModule): string {
  return `${module.totalImportSites} import site${pluralize(module.totalImportSites)}, fan-in ${module.incomingModules}, fan-out ${module.outgoingModules}`;
}

function formatCentralHeadlineSuffix(centralModules: GraphJsonArchitectureCentralModule[]): string {
  const module = centralModules[0];
  return module ? `; graph center is ${module.module}` : "";
}

function formatCentralHeadlineReviewPrompt(centralModules: GraphJsonArchitectureCentralModule[]): string {
  const module = centralModules[0];
  return module
    ? `; graph center is ${module.module}, so compare that center with your intended architecture before saving a baseline`
    : "; confirm the scan scope covers the architecture you care about before saving a baseline";
}

function formatReviewSignalCount(intentionalDebt: number, warnings: number): string {
  const parts = [
    intentionalDebt > 0 ? `${intentionalDebt} visible debt item${pluralize(intentionalDebt)}` : undefined,
    warnings > 0 ? `${warnings} advisory warning${pluralize(warnings)}` : undefined
  ].filter((item): item is string => item !== undefined);

  return parts.join(" and ");
}

function readDriftCount(drift: GraphJsonDrift | undefined): number {
  return (drift?.newObservedEdges.length ?? 0) + (drift?.removedObservedEdges.length ?? 0);
}

function isSetupIssue(violation: GraphJsonViolation): boolean {
  return violation.code === "no_spec_files";
}

function formatArchitectureSummarySignals(input: {
  violations: GraphJsonViolation[];
  intentionalDebt: GraphJsonIntentionalDebt[];
  warnings: GraphJsonViolation[];
  drift?: GraphJsonDrift;
}): GraphJsonArchitectureSignal[] {
  const signals: GraphJsonArchitectureSignal[] = [];

  for (const violation of input.violations) {
    signals.push({
      kind: isSetupIssue(violation) ? "setup_issue" : "hard_violation",
      code: violation.code,
      message: violation.message,
      ...(violation.location ? { location: violation.location } : {}),
      ...edgeFromDetails(violation.details)
    });
  }

  for (const debt of input.intentionalDebt) {
    signals.push({
      kind: "visible_debt",
      code: debt.code,
      message: debt.message,
      ...(debt.location ? { location: debt.location } : {}),
      edge: {
        fromModule: debt.fromModule,
        toModule: debt.toModule
      },
      acceptedUntil: debt.acceptedUntil,
      reason: debt.reason
    });
  }

  for (const warning of input.warnings) {
    signals.push({
      kind: "advisory_warning",
      code: warning.code,
      message: warning.message,
      ...(warning.location ? { location: warning.location } : {}),
      ...edgeFromDetails(warning.details)
    });
  }

  if (input.drift) {
    for (const edge of input.drift.newObservedEdges) {
      signals.push({
        kind: "baseline_drift",
        code: input.drift.kind,
        message: `New observed edge ${edge.fromModule} -> ${edge.toModule}.`,
        ...(edge.imports[0] ? { location: pickImportLocation(edge.imports[0]) } : {}),
        edge: {
          fromModule: edge.fromModule,
          toModule: edge.toModule
        }
      });
    }

    for (const edge of input.drift.removedObservedEdges) {
      signals.push({
        kind: "baseline_drift",
        code: input.drift.kind,
        message: `Removed observed edge ${edge.fromModule} -> ${edge.toModule}.`,
        ...(edge.imports[0] ? { location: pickImportLocation(edge.imports[0]) } : {}),
        edge: {
          fromModule: edge.fromModule,
          toModule: edge.toModule
        }
      });
    }
  }

  return signals.slice(0, 5);
}

function formatArchitectureSummaryNextActions(input: {
  violations: GraphJsonViolation[];
  intentionalDebt: GraphJsonIntentionalDebt[];
  warnings: GraphJsonViolation[];
  drift?: GraphJsonDrift;
}): string[] {
  if (input.violations.some((violation) => violation.code === "no_spec_files")) {
    return [
      "Run `axi infer --root . > axiom/main.axi` to create a reviewed starter contract.",
      "Run `axi observe --root . --spec axiom/main.axi --markdown` before promoting the contract into a CI gate."
    ];
  }

  const actions: string[] = [];
  if (input.violations.length > 0) {
    actions.push("Use `axi check --json` as the hard gate and repair the listed `violations[]` first.");
    actions.push(
      "If a violation is truly temporary, propose a visible `.axi` `accepts ... [at \"path\"] until ... because ...` entry for review."
    );
  }

  if (input.intentionalDebt.length > 0) {
    actions.push("Review `intentionalDebt[]` as accepted architecture debt; remove entries when the migration is done.");
  }

  if (input.warnings.length > 0) {
    actions.push("Treat `warnings[]` as advisory architecture pressure before turning any signal into a hard rule.");
  }

  const driftCount = (input.drift?.newObservedEdges.length ?? 0) + (input.drift?.removedObservedEdges.length ?? 0);
  if (driftCount > 0) {
    actions.push("Review `drift` as baseline-aware architecture change before updating the baseline or contract.");
  } else if (actions.length === 0) {
    actions.push("Save an unfiltered `axi graph --json` baseline if you want future PRs to show architecture drift.");
  }

  return actions;
}

function edgeFromDetails(details: Record<string, unknown> | undefined): Pick<GraphJsonArchitectureSignal, "edge"> {
  const fromModule = readString(details?.fromModule);
  const toModule = readString(details?.toModule);

  return fromModule && toModule
    ? {
        edge: {
          fromModule,
          toModule
        }
      }
    : {};
}

function pickImportLocation(importSite: GraphJsonImportSite): GraphJsonLocation {
  return {
    filePath: importSite.filePath,
    line: importSite.line
  };
}

function formatObservedDependencyCount(graph: GraphJsonResult): string {
  if (!graph.filters.violationsOnly) {
    return String(graph.summary.observedDependencies);
  }

  return `${graph.summary.shownObservedDependencies} of ${graph.summary.observedDependencies}`;
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

function formatMermaidObservedDependencySummary(graph: GraphJsonResult): string {
  if (!graph.filters.violationsOnly) {
    return `observedDependencies=${graph.summary.observedDependencies}`;
  }

  return `shownDependencyEdges=${graph.summary.shownObservedDependencies}, fullObservedDependencies=${graph.summary.observedDependencies}`;
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
    "- Intentional violations, warnings, and drift are visible debt or advisory signals.",
    "- Advisory warning counts include only warning checks enabled for this command or config.",
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
  const lines = ["### Advisory Warnings"];

  if (graph.warnings.length === 0) {
    lines.push("- None");
    return lines;
  }

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
    lines.push("  note: advisory warning counts include only checks enabled for this command or config");
    return lines;
  }

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

interface WarningCluster {
  key: string;
  code: string;
  subject: string;
  count: number;
}

function formatWarningClusters(warnings: GraphJsonViolation[]): string[] {
  const clusters = buildWarningClusters(warnings);
  if (warnings.length <= 1) {
    return [];
  }

  const lines = ["  likely roots:"];
  for (const cluster of clusters.slice(0, 8)) {
    lines.push(`    ${cluster.code} ${cluster.subject}: ${cluster.count} warning${pluralize(cluster.count)}`);
  }
  if (clusters.length > 8) {
    lines.push(`    ... ${clusters.length - 8} more cluster${pluralize(clusters.length - 8)}`);
  }
  return lines;
}

function formatMarkdownWarningClusters(warnings: GraphJsonViolation[]): string[] {
  const clusters = buildWarningClusters(warnings);
  if (warnings.length <= 1) {
    return [];
  }

  const lines = ["- Likely warning roots:"];
  for (const cluster of clusters.slice(0, 8)) {
    lines.push(
      `  - ${markdownCode(cluster.code)} ${markdownCode(cluster.subject)}: ${cluster.count} warning${pluralize(
        cluster.count
      )}`
    );
  }
  if (clusters.length > 8) {
    lines.push(`  - ${clusters.length - 8} more cluster${pluralize(clusters.length - 8)}`);
  }
  return lines;
}

function buildWarningClusters(warnings: GraphJsonViolation[]): WarningCluster[] {
  const clusters = new Map<string, WarningCluster>();

  for (const warning of warnings) {
    const subject = warningClusterSubject(warning);
    const code = warningDisplayCode(warning);
    const key = `${code}\0${subject}`;
    const existing = clusters.get(key) ?? {
      key,
      code,
      subject,
      count: 0
    };
    existing.count += 1;
    clusters.set(key, existing);
  }

  return [...clusters.values()].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return `${left.code}\0${left.subject}`.localeCompare(`${right.code}\0${right.subject}`);
  });
}

function warningClusterSubject(warning: GraphJsonViolation): string {
  if (warning.code === "deep_internal_import") {
    return deepInternalImportClusterSubject(warning);
  }

  if (warning.code === "large_module_file") {
    return "intra-file responsibility pressure";
  }

  if (
    warning.code === "coupling_concentration" &&
    readString(warning.details?.reviewKind) === "composition_root_pressure"
  ) {
    const moduleName = readString(warning.details?.module);
    return moduleName ? `${moduleName} composition root imports` : "composition root imports";
  }

  const fromModule = readString(warning.details?.fromModule);
  const toModule = readString(warning.details?.toModule);
  if (fromModule && toModule) {
    return `${fromModule} -> ${toModule}`;
  }

  const moduleName = readString(warning.details?.module);
  if (moduleName) {
    return moduleName;
  }

  const target = readString(warning.details?.target);
  if (target) {
    return target;
  }

  return "general";
}

function warningDisplayCode(warning: GraphJsonViolation): string {
  if (
    warning.code === "coupling_concentration" &&
    readString(warning.details?.reviewKind) === "composition_root_pressure"
  ) {
    return "composition_root_pressure";
  }

  return warning.code;
}

function deepInternalImportClusterSubject(warning: GraphJsonViolation): string {
  const toModule = readString(warning.details?.toModule) ?? "unknown module";
  const deepImportGroup = readString(warning.details?.deepImportGroup);
  const importedPath = readString(warning.details?.importedPath);
  const entrypointConfidence = readString(warning.details?.entrypointConfidence);
  const group = deepImportGroup ?? "unknown source group";
  const label = classifyDeepInternalRoot(importedPath, entrypointConfidence);

  return `${toModule} ${label}: ${group}`;
}

function classifyDeepInternalRoot(importedPath: string | undefined, entrypointConfidence: string | undefined): string {
  const segments = (importedPath ?? "").split("/").filter(Boolean);
  if (segments.includes("store")) {
    return "state/store leakage";
  }

  if (segments.includes("tooling") || segments.includes("tools")) {
    return "tool boundary pressure";
  }

  if (entrypointConfidence === "ambiguous_entrypoints") {
    return "ambiguous public boundary";
  }

  return "public-entry bypass";
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
  return `${diagnosticKey(violation)}\0${violation.contract.acceptedUntil}\0${violation.contract.reason}\0${
    violation.contract.pathScope ?? ""
  }\0${violation.contract.ruleLocation.filePath}:${violation.contract.ruleLocation.line}`;
}

function compareDriftEdges(left: GraphJsonDriftEdge, right: GraphJsonDriftEdge): number {
  return `${left.fromModule}->${left.toModule}`.localeCompare(`${right.fromModule}->${right.toModule}`);
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
      "Use axi graph --json for machine-readable data",
      "Warnings shown only when checks are enabled"
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
