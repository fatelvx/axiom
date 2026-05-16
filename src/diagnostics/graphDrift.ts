import type { GraphBaseline, GraphBaselineObservedDependency, GraphJsonObservedDependency, GraphJsonResult } from "./graph.js";
import { formatImportSiteHuman, formatImportSiteMarkdown } from "./graphValues.js";

type GraphJsonDrift = NonNullable<GraphJsonResult["drift"]>;
type GraphJsonDriftEdge = GraphJsonDrift["newObservedEdges"][number];
type GraphJsonDependencyViolation = GraphJsonObservedDependency["violations"][number];
type GraphJsonIntentionalDependencyViolation = GraphJsonObservedDependency["intentionalViolations"][number];
type GraphJsonImportSite = GraphJsonObservedDependency["import"];

export function formatMarkdownDrift(drift: GraphJsonDrift): string[] {
  const baselineLabel = drift.baseline.path ?? "provided baseline";
  const schemaSuffix = drift.baseline.schemaVersion ? `, ${drift.baseline.schemaVersion}` : "";
  const lines = [
    "### Architecture Drift (Advisory)",
    `- Kind: ${markdownCode(drift.kind)}`,
    `- Baseline: ${markdownCode(baselineLabel)} (${drift.baseline.observedDependencies} observed dependencies${schemaSuffix})`,
    "- Note: Import kinds describe observed source syntax; they are not contract rules.",
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

export function formatDriftOnly(graph: GraphJsonResult): string[] {
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

export function formatDrift(drift: GraphJsonDrift): string[] {
  const baselineLabel = drift.baseline.path ?? "provided baseline";
  const schemaSuffix = drift.baseline.schemaVersion ? `, ${drift.baseline.schemaVersion}` : "";
  const lines = [
    "architecture drift (advisory):",
    `  baseline: ${baselineLabel} (${drift.baseline.observedDependencies} observed dependencies${schemaSuffix})`,
    "  note: import kinds describe observed source syntax; they are not contract rules",
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

export function computeDrift(
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

function formatDriftEdge(edge: GraphJsonDriftEdge, importPrefix: "via" | "previously via"): string[] {
  const attentionCodes = [
    ...edge.violations.map((violation) => violation.code),
    ...edge.intentionalViolations.map((violation) => `${violation.code} intentional`)
  ];
  const suffix = attentionCodes.length > 0 ? ` [${attentionCodes.join(", ")}]` : "";
  const lines = [`    ${edge.fromModule} -> ${edge.toModule}${suffix}`];

  for (const importSite of edge.imports) {
    lines.push(`      ${importPrefix} ${formatImportSiteHuman(importSite)}`);
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

function formatMarkdownImport(importSite: GraphJsonImportSite): string {
  return formatImportSiteMarkdown(importSite, markdownCode);
}

function markdownCode(value: string | number): string {
  return `\`${String(value).replace(/`/g, "\\`")}\``;
}
