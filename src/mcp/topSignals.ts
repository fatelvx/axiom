export interface AxiomMcpTopSignal {
  count?: number;
  detail?: string;
  fromModule?: string;
  kind: string;
  location?: string;
  module?: string;
  severity?: "error" | "info" | "warning";
  title: string;
  toModule?: string;
}

const topSignalLimit = 6;

export function buildPayloadTopSignals(payload: Record<string, unknown>): AxiomMcpTopSignal[] {
  return limitTopSignals([
    ...buildViolationSignals(readRecordArray(payload, "violations")),
    ...buildWarningSignals(readRecordArray(payload, "warnings")),
    ...buildInferenceSignals(payload),
    ...buildDriftSignals(readRecordProperty(payload, "drift")),
    ...buildDependencyPressureSignals(payload)
  ]);
}

export function buildInferObserveTopSignals(
  inferenceRecord: Record<string, unknown>,
  observeRecord: Record<string, unknown>
): AxiomMcpTopSignal[] {
  const warningSignals = buildWarningSignals(readRecordArray(observeRecord, "warnings"));
  const hasLargeFileWarnings = warningSignals.some((signal) => signal.kind === "large_module_file");

  return limitTopSignals([
    ...buildViolationSignals(readRecordArray(observeRecord, "violations")),
    ...buildInferenceSignals(inferenceRecord, { includeLargeFiles: !hasLargeFileWarnings }),
    ...warningSignals,
    ...buildDriftSignals(readRecordProperty(observeRecord, "drift")),
    ...buildDependencyPressureSignals(inferenceRecord),
    ...buildDependencyPressureSignals(observeRecord)
  ]);
}

function buildViolationSignals(violations: Record<string, unknown>[]): AxiomMcpTopSignal[] {
  const groups = new Map<string, { count: number; first: Record<string, unknown> }>();

  for (const violation of violations) {
    const code = readStringProperty(violation, "code") ?? "unknown_violation";
    const existing = groups.get(code) ?? { count: 0, first: violation };
    existing.count += 1;
    groups.set(code, existing);
  }

  return [...groups.entries()]
    .sort((left, right) => right[1].count - left[1].count || left[0].localeCompare(right[0]))
    .map(([code, group]) => ({
      count: group.count,
      detail: readStringProperty(group.first, "message"),
      kind: code,
      location: formatRecordLocation(readRecordProperty(group.first, "location")),
      severity: "error",
      title: `${group.count} ${code} hard violation${group.count === 1 ? "" : "s"}`
    }));
}

function buildWarningSignals(warnings: Record<string, unknown>[]): AxiomMcpTopSignal[] {
  const largeFileSignals = warnings
    .filter((warning) => readStringProperty(warning, "code") === "large_module_file")
    .sort(
      (left, right) =>
        (readNumberProperty(readRecordProperty(right, "details"), "lineCount") ?? 0) -
        (readNumberProperty(readRecordProperty(left, "details"), "lineCount") ?? 0)
    )
    .map((warning) => {
      const details = readRecordProperty(warning, "details");
      const filePath = readStringProperty(details, "filePath") ??
        formatRecordLocation(readRecordProperty(warning, "location")) ??
        "large source file";
      const lineCount = readNumberProperty(details, "lineCount");
      const functionLikeCount = readNumberProperty(details, "functionLikeCount");
      const clusterSummary = formatNameTokenClusters(readRecordArray(details, "nameTokenClusters"));
      return {
        detail: joinDetails([
          lineCount === undefined ? undefined : `${lineCount} lines`,
          functionLikeCount === undefined ? undefined : `${functionLikeCount} function-like nodes`,
          clusterSummary
        ]),
        kind: "large_module_file",
        location: formatRecordLocation(readRecordProperty(warning, "location")),
        severity: "warning",
        title: `Large file: ${filePath}`
      } satisfies AxiomMcpTopSignal;
    });

  const groupedWarnings = buildGroupedWarningSignals(
    warnings.filter((warning) => readStringProperty(warning, "code") !== "large_module_file")
  );

  return [...groupedWarnings.slice(0, 3), ...largeFileSignals.slice(0, 3)];
}

function buildGroupedWarningSignals(warnings: Record<string, unknown>[]): AxiomMcpTopSignal[] {
  const groups = new Map<string, { code: string; count: number; first: Record<string, unknown>; subject: string }>();

  for (const warning of warnings) {
    const code = warningDisplayCode(warning);
    const subject = warningSubject(warning);
    const key = `${code}\0${subject}`;
    const existing = groups.get(key) ?? { code, count: 0, first: warning, subject };
    existing.count += 1;
    groups.set(key, existing);
  }

  return [...groups.values()]
    .sort((left, right) =>
      right.count - left.count || `${left.code}\0${left.subject}`.localeCompare(`${right.code}\0${right.subject}`)
    )
    .map((group) => {
      const details = readRecordProperty(group.first, "details");
      return {
        count: group.count,
        detail: readStringProperty(details, "observed") ?? readStringProperty(group.first, "message"),
        fromModule: readStringProperty(details, "fromModule"),
        kind: group.code,
        location: formatRecordLocation(readRecordProperty(group.first, "location")),
        module: readStringProperty(details, "module"),
        severity: "warning",
        title: warningTitle(group.code, group.subject),
        toModule: readStringProperty(details, "toModule")
      };
    });
}

function buildInferenceSignals(
  inferenceRecord: Record<string, unknown>,
  options: { includeLargeFiles?: boolean } = {}
): AxiomMcpTopSignal[] {
  const includeLargeFiles = options.includeLargeFiles ?? true;
  const collapsedCycleSignals = readRecordArray(inferenceRecord, "collapsedCycles").map((cycle) => {
    const moduleName = readStringProperty(cycle, "module") ?? "merged module";
    const sourceGroups = readStringArrayProperty(cycle, "sourceGroups");
    const firstCandidate = readRecordArray(cycle, "cycleBreakingCandidates")[0];
    return {
      count: sourceGroups.length || undefined,
      detail: joinDetails([
        sourceGroups.length > 0 ? `source groups: ${sourceGroups.slice(0, 5).join(", ")}` : undefined,
        firstCandidate
          ? `first candidate: ${readStringProperty(firstCandidate, "fromGroup") ?? "?"} -> ${readStringProperty(firstCandidate, "toGroup") ?? "?"}`
          : undefined
      ]),
      kind: "collapsed_cycle",
      module: moduleName,
      severity: "warning",
      title: `Collapsed cycle: ${moduleName}`
    } satisfies AxiomMcpTopSignal;
  });

  const largeFileSignals = includeLargeFiles
    ? readRecordArray(inferenceRecord, "architecturePressureNotes")
        .filter((note) => readStringProperty(note, "kind") === "large_source_file")
        .sort((left, right) => (readNumberProperty(right, "lineCount") ?? 0) - (readNumberProperty(left, "lineCount") ?? 0))
        .map((note) => ({
          detail: joinDetails([
            readNumberProperty(note, "lineCount") === undefined ? undefined : `${readNumberProperty(note, "lineCount")} lines`,
            readNumberProperty(note, "functionLikeCount") === undefined
              ? undefined
              : `${readNumberProperty(note, "functionLikeCount")} function-like nodes`
          ]),
          kind: "large_source_file",
          location: readStringProperty(note, "filePath"),
          severity: "warning",
          title: `Large source file: ${readStringProperty(note, "filePath") ?? "source file"}`
        } satisfies AxiomMcpTopSignal))
    : [];

  return [...collapsedCycleSignals.slice(0, 2), ...largeFileSignals.slice(0, 3)];
}

function buildDriftSignals(drift: Record<string, unknown> | undefined): AxiomMcpTopSignal[] {
  if (!drift) {
    return [];
  }

  const newEdges = readArrayCount(drift, "newObservedEdges") ?? 0;
  const removedEdges = readArrayCount(drift, "removedObservedEdges") ?? 0;
  if (newEdges === 0 && removedEdges === 0) {
    return [];
  }

  return [
    {
      count: newEdges + removedEdges,
      detail: `${newEdges} new observed edge${newEdges === 1 ? "" : "s"}, ${removedEdges} removed observed edge${removedEdges === 1 ? "" : "s"}`,
      kind: readStringProperty(drift, "kind") ?? "observed_edge_drift",
      severity: "info",
      title: "Observed-edge drift"
    }
  ];
}

function buildDependencyPressureSignals(payload: Record<string, unknown>): AxiomMcpTopSignal[] {
  const dependencies = readRecordArray(payload, "allObservedDependencies");
  const visibleDependencies = dependencies.length > 0 ? dependencies : readRecordArray(payload, "observedDependencies");
  const grouped = new Map<string, { count: number; fromModule: string; toModule: string }>();

  for (const dependency of visibleDependencies) {
    const fromModule = readStringProperty(dependency, "fromModule");
    const toModule = readStringProperty(dependency, "toModule");
    if (!fromModule || !toModule || fromModule === toModule) {
      continue;
    }

    const count = readNumberProperty(dependency, "count") ?? 1;
    const key = `${fromModule}\0${toModule}`;
    const existing = grouped.get(key) ?? { count: 0, fromModule, toModule };
    existing.count += count;
    grouped.set(key, existing);
  }

  return [...grouped.values()]
    .sort((left, right) =>
      right.count - left.count ||
      `${left.fromModule}\0${left.toModule}`.localeCompare(`${right.fromModule}\0${right.toModule}`)
    )
    .slice(0, 2)
    .map((dependency) => ({
      count: dependency.count,
      detail: `${dependency.count} observed import site${dependency.count === 1 ? "" : "s"}`,
      fromModule: dependency.fromModule,
      kind: "dependency_pressure",
      severity: "info",
      title: `Dependency pressure: ${dependency.fromModule} -> ${dependency.toModule}`,
      toModule: dependency.toModule
    }));
}

function limitTopSignals(signals: AxiomMcpTopSignal[]): AxiomMcpTopSignal[] {
  const seen = new Set<string>();
  const limited: AxiomMcpTopSignal[] = [];

  for (const signal of signals) {
    const key = `${signal.kind}\0${signal.title}\0${signal.location ?? ""}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    limited.push(signal);
    if (limited.length >= topSignalLimit) {
      break;
    }
  }

  return limited;
}

function warningDisplayCode(warning: Record<string, unknown>): string {
  const code = readStringProperty(warning, "code") ?? "warning";
  const details = readRecordProperty(warning, "details");
  if (code === "coupling_concentration" && readStringProperty(details, "reviewKind") === "composition_root_pressure") {
    return "composition_root_pressure";
  }

  return code;
}

function warningSubject(warning: Record<string, unknown>): string {
  const details = readRecordProperty(warning, "details");
  const code = readStringProperty(warning, "code");

  if (code === "deep_internal_import") {
    const toModule = readStringProperty(details, "toModule") ?? "unknown module";
    const deepImportGroup = readStringProperty(details, "deepImportGroup") ??
      readStringProperty(details, "importedPath") ??
      "unknown source group";
    const confidence = readStringProperty(details, "entrypointConfidence");
    const label = confidence === "single_likely_entrypoint" ? "public-entry bypass" : "ambiguous public boundary";
    return `${toModule} ${label}: ${deepImportGroup}`;
  }

  const fromModule = readStringProperty(details, "fromModule");
  const toModule = readStringProperty(details, "toModule");
  if (fromModule && toModule) {
    return `${fromModule} -> ${toModule}`;
  }

  return readStringProperty(details, "module") ??
    readStringProperty(details, "target") ??
    readStringProperty(details, "filePath") ??
    "general";
}

function warningTitle(code: string, subject: string): string {
  if (code === "deep_internal_import") {
    return `Deep internal imports: ${subject}`;
  }

  if (code === "composition_root_pressure") {
    return `Composition root pressure: ${subject}`;
  }

  if (code === "coupling_concentration") {
    return `Coupling concentration: ${subject}`;
  }

  if (code === "unresolved_import") {
    return `Unresolved imports: ${subject}`;
  }

  if (code === "broad_public_surface" || code === "public_entrypoint_coupling") {
    return `Public API surface: ${subject}`;
  }

  return `${code}: ${subject}`;
}

function formatNameTokenClusters(clusters: Record<string, unknown>[]): string | undefined {
  if (clusters.length === 0) {
    return undefined;
  }

  return `lexical clusters: ${clusters
    .slice(0, 3)
    .map((cluster) => {
      const token = readStringProperty(cluster, "token") ?? "unknown";
      const count = readNumberProperty(cluster, "count");
      return count === undefined ? token : `${token} x${count}`;
    })
    .join(", ")}`;
}

function formatRecordLocation(location: Record<string, unknown> | undefined): string | undefined {
  const filePath = readStringProperty(location, "filePath");
  if (!filePath) {
    return undefined;
  }

  const line = readNumberProperty(location, "line");
  return line === undefined ? filePath : `${filePath}:${line}`;
}

function joinDetails(parts: Array<string | undefined>): string | undefined {
  const detail = parts.filter((part): part is string => typeof part === "string" && part.length > 0).join("; ");
  return detail.length > 0 ? detail : undefined;
}

function readArrayCount(record: Record<string, unknown> | undefined, key: string): number | undefined {
  const value = record?.[key];
  return Array.isArray(value) ? value.length : undefined;
}

function readRecordArray(record: Record<string, unknown> | undefined, key: string): Record<string, unknown>[] {
  const value = record?.[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isRecord);
}

function readNumberProperty(record: Record<string, unknown> | undefined, key: string): number | undefined {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readRecordProperty(record: Record<string, unknown> | undefined, key: string): Record<string, unknown> | undefined {
  const value = record?.[key];
  return isRecord(value) ? value : undefined;
}

function readStringProperty(record: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === "string" ? value : undefined;
}

function readStringArrayProperty(record: Record<string, unknown> | undefined, key: string): string[] {
  const value = record?.[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
