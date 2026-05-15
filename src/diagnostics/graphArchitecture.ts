import type {
  GraphFormatOptions,
  GraphJsonDrift,
  GraphJsonIntentionalDebt,
  GraphJsonObservedDependency,
  GraphJsonResult,
  GraphJsonViolation
} from "./graph.js";
import {
  formatArchitectureSummaryNextActions,
  formatArchitectureSummarySignals,
  type GraphJsonArchitectureSignal
} from "./graphArchitectureSignals.js";
import { buildWarningClusters, warningClusterToReviewPressure } from "./graphWarnings.js";

export interface GraphJsonArchitectureSummary {
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

export interface GraphJsonArchitectureInterpretation {
  headline: string;
  quickRead: string[];
  lookFirst: string[];
  centralModules: GraphJsonArchitectureCentralModule[];
  caveat: string;
}

export interface GraphJsonArchitectureCentralModule {
  module: string;
  role: "fan_in_hub" | "fan_out_hub" | "mixed_hub";
  incomingModules: number;
  outgoingModules: number;
  incomingImportSites: number;
  outgoingImportSites: number;
  totalImportSites: number;
}

export interface GraphJsonArchitectureReviewStory {
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

export function buildArchitectureSummary(input: {
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

export function formatGraphReviewModel(graph: GraphJsonResult, options: GraphFormatOptions): string[] {
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

export function formatGraphInterpretation(graph: GraphJsonResult): string[] {
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

export function formatCentralModuleMetrics(module: GraphJsonArchitectureCentralModule): string {
  return `${module.totalImportSites} import site${pluralize(module.totalImportSites)}, fan-in ${module.incomingModules}, fan-out ${module.outgoingModules}`;
}

export function isSetupIssue(violation: GraphJsonViolation): boolean {
  return violation.code === "no_spec_files";
}

function formatAttentionFocus(graph: GraphJsonResult): string {
  if (!graph.filters.violationsOnly) {
    return "showing the full observed module graph";
  }

  return `showing ${formatObservedDependencyCount(
    graph
  )} observed dependency edge${pluralize(graph.summary.shownObservedDependencies)} with hard violations or accepted debt; clean edges omitted`;
}

function formatObservedDependencyCount(graph: GraphJsonResult): string {
  if (!graph.filters.violationsOnly) {
    return String(graph.summary.observedDependencies);
  }

  return `${graph.summary.shownObservedDependencies} of ${graph.summary.observedDependencies}`;
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
    return "Hard violations, visible intentional debt, advisory signals, and optional baseline drift.";
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
        "No hard failures, visible debt, advisory signals, or drift were reported; compare this center with the architecture you expected before saving a baseline.",
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

  return `This scoped import graph is quiet: no hard failures, visible debt, advisory signals, or baseline drift were reported${formatCentralHeadlineReviewPrompt(
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
    lines.push("Review pressure: no visible debt or advisory signals.");
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
    "Hard signals: read `violations[]`, `intentionalDebt[]`, and advisory `warnings[]` before judging the diagram.",
    centralModules.length > 0
      ? `Graph center: inspect ${centralModules[0]?.module}; it carries the strongest observed coupling in this scan.`
      : "Graph center: if no center appears, confirm the scan scope actually covers the architecture you care about.",
    "Shape fit: compare central modules, deep imports, drift, and any intra-file pressure signals with the architecture you expected for this repository."
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
    warnings > 0 ? `${warnings} advisory signal${pluralize(warnings)}` : undefined
  ].filter((item): item is string => item !== undefined);

  return parts.join(" and ");
}

function readDriftCount(drift: GraphJsonDrift | undefined): number {
  return (drift?.newObservedEdges.length ?? 0) + (drift?.removedObservedEdges.length ?? 0);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function pluralize(count: number): string {
  return count === 1 ? "" : "s";
}
