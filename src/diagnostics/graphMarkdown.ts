import { formatAdvisorySignalCoverageMarkdown } from "./advisorySignalCoverage.js";
import { formatCentralModuleMetrics, isSetupIssue } from "./graphArchitecture.js";
import { formatMarkdownDrift } from "./graphDrift.js";
import {
  formatMarkdownWarningClusters,
  warningDisplayCode
} from "./graphWarnings.js";
import {
  formatExpirationDistance,
  formatNameTokenClusters,
  readLocation,
  readNumber,
  readRecord,
  readRecordArray,
  readString,
  readStringArray
} from "./graphValues.js";
import type {
  GraphFormatOptions,
  GraphJsonImportSite,
  GraphJsonLocation,
  GraphJsonResult,
  GraphJsonViolation
} from "./graph.js";

// Markdown graph review rendering only; graph.ts stays the public CheckResult-facing API.

export function formatGraphMarkdownFromGraph(graph: GraphJsonResult, options: GraphFormatOptions = {}): string {
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

function formatMarkdownObservedDependencySummary(graph: GraphJsonResult): string[] {
  if (!graph.filters.violationsOnly) {
    return [`- Observed dependencies: ${graph.summary.observedDependencies}`];
  }

  return [
    `- Shown dependency edges: ${graph.summary.shownObservedDependencies}`,
    `- Full observed dependencies: ${graph.summary.observedDependencies}`
  ];
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

function formatLocation(location: GraphJsonLocation | GraphJsonImportSite): string {
  return `${location.filePath}:${location.line}`;
}

function formatMarkdownImport(importSite: GraphJsonImportSite): string {
  return `${markdownCode(formatLocation(importSite))} importing ${markdownCode(importSite.specifier)}`;
}

function markdownCode(value: string | number): string {
  return `\`${String(value).replace(/`/g, "\\`")}\``;
}

function pluralize(count: number): string {
  return count === 1 ? "" : "s";
}
