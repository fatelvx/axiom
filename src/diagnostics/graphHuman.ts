import {
  formatAdvisorySignalCoverageDetails,
  formatAdvisorySignalCoverageSummary
} from "./advisorySignalCoverage.js";
import {
  formatGraphInterpretation,
  formatGraphReviewModel,
  isSetupIssue
} from "./graphArchitecture.js";
import { formatDrift, formatDriftOnly } from "./graphDrift.js";
import { formatWarningClusters, warningDisplayCode } from "./graphWarnings.js";
import {
  formatExpirationDistance,
  formatImportSiteHuman,
  formatNameTokenClusters,
  readLocation,
  readNumber,
  readRecord,
  readRecordArray,
  readString,
  readStringArray
} from "./graphValues.js";
import type { GraphFormatOptions, GraphJsonResult, GraphJsonViolation } from "./graph.js";

type GraphJsonModule = GraphJsonResult["modules"][number];
type GraphJsonEdge = GraphJsonResult["declaredDependencies"][number];
type GraphJsonVisibilityRule = GraphJsonResult["exposedPaths"][number];

// Human CLI graph rendering only; graph.ts stays the public CheckResult-facing API and JSON assembler.

export function formatGraphResultFromGraph(graph: GraphJsonResult, options: GraphFormatOptions = {}): string {
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
        `  ${dependency.fromModule} -> ${dependency.toModule} via ${formatImportSiteHuman(
          dependency.import
        )}${violationSuffix}`
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

function formatObservedDependencySummaryLines(graph: GraphJsonResult): string[] {
  if (!graph.filters.violationsOnly) {
    return [`observed dependencies: ${graph.summary.observedDependencies}`];
  }

  return [
    `shown dependency edges: ${graph.summary.shownObservedDependencies}`,
    `full observed dependencies: ${graph.summary.observedDependencies}`
  ];
}

function formatViolationSummaryLines(graph: GraphJsonResult): string[] {
  const setupIssueCount = getSetupIssues(graph).length;
  if (setupIssueCount === 0) {
    return [`violations: ${graph.summary.violations}`];
  }

  return [`setup issues: ${setupIssueCount}`, `hard violations: ${getHardViolations(graph).length}`];
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
      `  ${dependency.fromModule} -> ${dependency.toModule} via ${formatImportSiteHuman(dependency.import)}`
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

function pluralize(count: number): string {
  return count === 1 ? "" : "s";
}
