import { TOOL_DESCRIPTORS } from "./toolDescriptors.js";
import { buildInferObserveTopSignals, buildPayloadTopSignals, type AxiomMcpTopSignal } from "./topSignals.js";
export { buildAxiomMcpCliInvocation } from "./toolInvocation.js";

export const AXIOM_MCP_TOOL_NAMES = [
  "axiom_roots",
  "axiom_check",
  "axiom_observe",
  "axiom_graph",
  "axiom_diff",
  "axiom_infer_contract",
  "axiom_observe_inferred_contract"
] as const;

export type AxiomMcpToolName = (typeof AXIOM_MCP_TOOL_NAMES)[number];

type AxiomMcpCommand = "check" | "diff" | "graph" | "infer" | "infer_observe" | "observe" | "roots";

interface JsonSchema {
  additionalProperties?: boolean;
  description?: string;
  enum?: string[];
  items?: JsonSchema;
  minimum?: number;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  type: "array" | "boolean" | "integer" | "number" | "object" | "string";
}

export interface AxiomMcpToolDescriptor {
  annotations: {
    destructiveHint: false;
    openWorldHint: false;
    readOnlyHint: true;
  };
  description: string;
  inputSchema: JsonSchema;
  name: AxiomMcpToolName;
  outputSchema: JsonSchema;
  title: string;
}

export interface AxiomMcpCliInvocation {
  acceptedExitCodes: number[];
  args: string[];
  command: AxiomMcpCommand;
  executable: string;
  payloadSchemaPrefix: "axiom.check." | "axiom.graph." | "axiom.infer.";
  readOnly: true;
  toolName: AxiomMcpToolName;
}

export interface AxiomMcpExecutionResult {
  exitCode: number;
  stderr: string;
  stdout: string;
}

export interface AxiomMcpToolResult {
  content: Array<{ text: string; type: "text" }>;
  isError?: true;
  structuredContent: {
    command: AxiomMcpCommand;
    error?: {
      message: string;
      stderr?: string;
      stdout?: string;
    };
    exitCode: number;
    payload?: unknown;
    schemaVersion?: string;
    summary: AxiomMcpResultSummary;
    tool: AxiomMcpToolName;
  };
}

export interface AxiomMcpInvocationOptions {
  cliPath?: string;
  nodeExecutable?: string;
}

export interface AxiomMcpResultSummary {
  agentHint: string;
  counts?: {
    allowedRoots?: number;
    architecturePressureNotes?: number;
    collapsedCycles?: number;
    hardViolations?: number;
    importsScanned?: number;
    intentionalDebt?: number;
    modules?: number;
    newObservedEdges?: number;
    observedDependencies?: number;
    observedImportSites?: number;
    observedModuleEdges?: number;
    removedObservedEdges?: number;
    shownObservedDependencies?: number;
    sourceFiles?: number;
    setupIssues?: number;
    violations?: number;
    warnings?: number;
  };
  drift?: {
    kind?: string;
    newObservedEdges: number;
    removedObservedEdges: number;
  };
  advisorySignalCoverage?: {
    checkedNoFindings: string[];
    findingsReported: string[];
    notEvaluated: string[];
    caveat?: string;
  };
  gate?: {
    command: string;
    currentCommandIsGate: boolean;
    hardViolationsFailCheck: boolean;
  };
  kind: "check" | "inference" | "review" | "roots" | "tool_error";
  ok?: boolean;
  reviewStory?: {
    caveat?: string;
    firstPressure?: {
      kind?: string;
      severity?: string;
      title?: string;
    };
    nextStep?: string;
    summary?: string;
  };
  status?: string;
  topSignals?: AxiomMcpTopSignal[];
}

const TOOL_BY_NAME = new Map(TOOL_DESCRIPTORS.map((tool) => [tool.name, tool]));
const ADVISORY_REFACTOR_GUARDRAIL =
  "Advisory signals are review pressure, not a cleanup checklist; do not refactor solely to reduce signal counts. State a refactor hypothesis before changing code.";

export function listAxiomMcpTools(): AxiomMcpToolDescriptor[] {
  return TOOL_DESCRIPTORS.map((tool) => cloneJson(tool));
}

export function getAxiomMcpToolDescriptor(name: AxiomMcpToolName): AxiomMcpToolDescriptor {
  const tool = TOOL_BY_NAME.get(name);
  if (!tool) {
    throw new Error(`Unknown Axiom MCP tool '${name}'.`);
  }

  return cloneJson(tool);
}

export function createAxiomMcpToolResult(
  invocation: AxiomMcpCliInvocation,
  execution: AxiomMcpExecutionResult
): AxiomMcpToolResult {
  const acceptedExit = invocation.acceptedExitCodes.includes(execution.exitCode);
  if (!acceptedExit) {
    return errorResult(invocation, execution, `Axiom CLI exited with unexpected status ${execution.exitCode}.`);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(execution.stdout);
  } catch {
    return errorResult(invocation, execution, "Axiom CLI did not return parseable JSON.");
  }

  const schemaVersion = readSchemaVersion(payload);
  if (!schemaVersion?.startsWith(invocation.payloadSchemaPrefix)) {
    return errorResult(
      invocation,
      execution,
      `Axiom CLI returned schemaVersion ${JSON.stringify(schemaVersion)}, expected prefix ${invocation.payloadSchemaPrefix}.`
    );
  }

  const structuredContent: AxiomMcpToolResult["structuredContent"] = {
    command: invocation.command,
    exitCode: execution.exitCode,
    payload,
    schemaVersion,
    summary: createResultSummary(invocation, payload),
    tool: invocation.toolName
  };

  return {
    content: [{ type: "text", text: JSON.stringify(structuredContent, null, 2) }],
    structuredContent
  };
}

export function createAxiomMcpRootsToolResult(allowedRoots: string[]): AxiomMcpToolResult {
  const payload = {
    allowedRoots: [...allowedRoots]
  };
  const structuredContent: AxiomMcpToolResult["structuredContent"] = {
    command: "roots",
    exitCode: 0,
    payload,
    summary: {
      agentHint: "Use these allowed roots when choosing the root for axiom_check, axiom_observe, axiom_graph, axiom_diff, or axiom_infer_contract. Re-register or restart the MCP client to add roots.",
      counts: {
        allowedRoots: allowedRoots.length
      },
      kind: "roots"
    },
    tool: "axiom_roots"
  };

  return {
    content: [{ type: "text", text: JSON.stringify(structuredContent, null, 2) }],
    structuredContent
  };
}

export function createAxiomMcpInferObserveToolResult(inferencePayload: unknown, observePayload: unknown): AxiomMcpToolResult {
  const schemaVersion = "axiom.mcp.infer_observe.v1";
  const payload = {
    schemaVersion,
    root: readStringProperty(isRecord(observePayload) ? observePayload : undefined, "root") ??
      readStringProperty(isRecord(inferencePayload) ? inferencePayload : undefined, "root"),
    contractSource: {
      kind: "temporary_inferred_contract",
      persisted: false,
      notice: [
        "This workflow used a server-managed temporary inferred contract.",
        "The inferred contract mirrors the current graph; it is not declared architecture intent.",
        "Do not save it, update baselines, accept debt, or treat this result as a hard gate without human review."
      ]
    },
    inference: inferencePayload,
    observe: observePayload
  };

  const structuredContent: AxiomMcpToolResult["structuredContent"] = {
    command: "infer_observe",
    exitCode: 0,
    payload,
    schemaVersion,
    summary: createInferObserveSummary(inferencePayload, observePayload),
    tool: "axiom_observe_inferred_contract"
  };

  return {
    content: [{ type: "text", text: JSON.stringify(structuredContent, null, 2) }],
    structuredContent
  };
}

export function createAxiomMcpWorkflowErrorResult(
  toolName: AxiomMcpToolName,
  command: AxiomMcpCommand,
  execution: AxiomMcpExecutionResult,
  message: string
): AxiomMcpToolResult {
  const structuredContent: AxiomMcpToolResult["structuredContent"] = {
    command,
    error: {
      message,
      ...(execution.stderr ? { stderr: execution.stderr } : {}),
      ...(execution.stdout ? { stdout: execution.stdout } : {})
    },
    exitCode: execution.exitCode,
    summary: {
      agentHint: "Treat this as an MCP workflow execution failure, not architecture evidence.",
      kind: "tool_error"
    },
    tool: toolName
  };

  return {
    content: [{ type: "text", text: JSON.stringify(structuredContent, null, 2) }],
    isError: true,
    structuredContent
  };
}

function errorResult(
  invocation: AxiomMcpCliInvocation,
  execution: AxiomMcpExecutionResult,
  message: string
): AxiomMcpToolResult {
  const structuredContent: AxiomMcpToolResult["structuredContent"] = {
    command: invocation.command,
    error: {
      message,
      ...(execution.stderr ? { stderr: execution.stderr } : {}),
      ...(execution.stdout ? { stdout: execution.stdout } : {})
    },
    exitCode: execution.exitCode,
    summary: {
      agentHint: "Treat this as an Axiom CLI or MCP execution failure, not architecture evidence.",
      kind: "tool_error"
    },
    tool: invocation.toolName
  };

  return {
    content: [{ type: "text", text: JSON.stringify(structuredContent, null, 2) }],
    isError: true,
    structuredContent
  };
}

function createResultSummary(invocation: AxiomMcpCliInvocation, payload: unknown): AxiomMcpResultSummary {
  const payloadRecord = isRecord(payload) ? payload : {};
  const payloadSummary = readRecordProperty(payloadRecord, "summary");
  const architectureSummary = readRecordProperty(payloadRecord, "architectureSummary");
  const ok = readBooleanProperty(payloadRecord, "ok");
  const counts = buildCounts(payloadRecord, payloadSummary);
  const reviewStory = buildReviewStorySummary(
    readRecordProperty(architectureSummary, "reviewStory") ?? readRecordProperty(payloadRecord, "reviewStory")
  );
  const drift = buildDriftSummary(readRecordProperty(payloadRecord, "drift"));
  const gate = buildGateSummary(invocation, architectureSummary);
  const advisorySignalCoverage = buildAdvisorySignalCoverageSummary(architectureSummary);
  const setupIssueCounts = countSetupAndHardViolations(payloadRecord);
  const topSignals = buildPayloadTopSignals(payloadRecord);

  return {
    agentHint: buildAgentHint(invocation, ok, setupIssueCounts),
    ...(Object.keys(counts).length > 0 ? { counts } : {}),
    ...(drift ? { drift } : {}),
    ...(advisorySignalCoverage ? { advisorySignalCoverage } : {}),
    ...(gate ? { gate } : {}),
    kind: resultSummaryKind(invocation.command),
    ...(ok !== undefined ? { ok } : {}),
    ...(reviewStory ? { reviewStory } : {}),
    ...(readStringProperty(architectureSummary, "status") ? { status: readStringProperty(architectureSummary, "status") } : {}),
    ...(topSignals.length > 0 ? { topSignals } : {})
  };
}

function createInferObserveSummary(inferencePayload: unknown, observePayload: unknown): AxiomMcpResultSummary {
  const inferenceRecord = isRecord(inferencePayload) ? inferencePayload : {};
  const observeRecord = isRecord(observePayload) ? observePayload : {};
  const inferenceSummary = readRecordProperty(inferenceRecord, "summary");
  const observeSummary = readRecordProperty(observeRecord, "summary");
  const architectureSummary = readRecordProperty(observeRecord, "architectureSummary");
  const counts = buildCounts(observeRecord, observeSummary);
  addCount(counts, "architecturePressureNotes", readNumberProperty(inferenceSummary, "architecturePressureNotes"));
  addCount(counts, "collapsedCycles", readNumberProperty(inferenceSummary, "collapsedCycles"));
  addCount(counts, "importsScanned", readNumberProperty(inferenceSummary, "importsScanned"));
  addCount(counts, "observedImportSites", readNumberProperty(inferenceSummary, "observedImportSites"));
  addCount(counts, "observedModuleEdges", readNumberProperty(inferenceSummary, "observedModuleEdges"));
  addCount(counts, "sourceFiles", readNumberProperty(inferenceSummary, "sourceFiles"));

  const reviewStory = buildReviewStorySummary(readRecordProperty(architectureSummary, "reviewStory")) ??
    buildReviewStorySummary(readRecordProperty(inferenceRecord, "reviewStory"));
  const topSignals = buildInferObserveTopSignals(inferenceRecord, observeRecord);
  const advisorySignalCoverage = buildAdvisorySignalCoverageSummary(architectureSummary);
  const gate = buildGateSummary(
    {
      acceptedExitCodes: [0],
      args: [],
      command: "infer_observe",
      executable: "",
      payloadSchemaPrefix: "axiom.graph.",
      readOnly: true,
      toolName: "axiom_observe_inferred_contract"
    },
    architectureSummary
  ) ?? {
    command: "axi check",
    currentCommandIsGate: false,
    hardViolationsFailCheck: true
  };

  return {
    agentHint: `Use this as advisory review evidence produced from a temporary inferred contract. The inferred contract mirrors the current graph and is not declared architecture intent; do not save it, update baselines, accept debt, or use it as a hard gate without human review. ${ADVISORY_REFACTOR_GUARDRAIL}`,
    ...(Object.keys(counts).length > 0 ? { counts } : {}),
    ...(advisorySignalCoverage ? { advisorySignalCoverage } : {}),
    gate,
    kind: "review",
    ...(reviewStory ? { reviewStory } : {}),
    ...(readStringProperty(architectureSummary, "status") ? { status: readStringProperty(architectureSummary, "status") } : {}),
    ...(topSignals.length > 0 ? { topSignals } : {})
  };
}

function resultSummaryKind(command: AxiomMcpCommand): AxiomMcpResultSummary["kind"] {
  if (command === "check") {
    return "check";
  }

  if (command === "infer") {
    return "inference";
  }

  if (command === "roots") {
    return "roots";
  }

  return "review";
}

function buildAgentHint(
  invocation: AxiomMcpCliInvocation,
  ok: boolean | undefined,
  setupIssueCounts?: { hardViolations: number; setupIssues: number }
): string {
  const command = invocation.command;

  if (command === "check") {
    if (ok === false && setupIssueCounts && setupIssueCounts.setupIssues > 0 && setupIssueCounts.hardViolations === 0) {
      return "This check failed because setup evidence is missing or invalid. Fix source/spec scope from payload.violations before treating this as code architecture drift; do not edit contracts or accepted debt unless the user approves.";
    }

    return ok === false
      ? "Repair hard violations from payload.violations; do not edit contracts or accepted debt unless the user approves."
      : "This is the hard gate result. Use observe, graph, or diff for advisory context when needed.";
  }

  if (command === "infer") {
    return "This is current-graph authoring evidence, not declared architecture intent. Review before saving as .axi.";
  }

  if (command === "roots") {
    return "Use these allowed roots when choosing a root for Axiom MCP scans. Re-register or restart the MCP client to add more roots.";
  }

  if (command === "graph" && invocation.args.includes("--portable")) {
    return `Use this as portable graph evidence for baseline review. This MCP call did not save or update a baseline; do not persist it as .axi/baselines/current.graph.json unless the user explicitly approves that artifact change. ${ADVISORY_REFACTOR_GUARDRAIL}`;
  }

  return `Use this as advisory review evidence. The hard gate remains axiom_check / axi check. ${ADVISORY_REFACTOR_GUARDRAIL}`;
}

function buildGateSummary(
  invocation: AxiomMcpCliInvocation,
  architectureSummary: Record<string, unknown> | undefined
): AxiomMcpResultSummary["gate"] | undefined {
  if (invocation.command === "check") {
    return {
      command: "axi check",
      currentCommandIsGate: true,
      hardViolationsFailCheck: true
    };
  }

  const gate = readRecordProperty(architectureSummary, "gate");
  if (!gate) {
    return undefined;
  }

  return {
    command: readStringProperty(gate, "command") ?? "axi check",
    currentCommandIsGate: readBooleanProperty(gate, "currentCommandIsGate") ?? false,
    hardViolationsFailCheck: readBooleanProperty(gate, "hardViolationsFailCheck") ?? true
  };
}

function countSetupAndHardViolations(payload: Record<string, unknown>): { hardViolations: number; setupIssues: number } | undefined {
  const violations = readRecordArrayProperty(payload, "violations");
  if (violations.length === 0) {
    return undefined;
  }

  const setupIssues = violations.filter(isSetupIssueCode).length;
  return {
    hardViolations: violations.length - setupIssues,
    setupIssues
  };
}

function isSetupIssueCode(violation: Record<string, unknown>): boolean {
  const code = readStringProperty(violation, "code");
  return code === "no_spec_files" || code === "no_source_files";
}

function buildCounts(
  payload: Record<string, unknown>,
  payloadSummary: Record<string, unknown> | undefined
): NonNullable<AxiomMcpResultSummary["counts"]> {
  const counts: NonNullable<AxiomMcpResultSummary["counts"]> = {};
  addCount(counts, "architecturePressureNotes", readNumberProperty(payloadSummary, "architecturePressureNotes"));
  addCount(counts, "collapsedCycles", readNumberProperty(payloadSummary, "collapsedCycles"));
  addCount(counts, "importsScanned", readNumberProperty(payloadSummary, "importsScanned"));
  addCount(counts, "intentionalDebt", readNumberProperty(payloadSummary, "intentionalViolations"));
  addCount(counts, "modules", readNumberProperty(payloadSummary, "modules"));
  addCount(counts, "observedDependencies", readNumberProperty(payloadSummary, "observedDependencies"));
  addCount(counts, "observedImportSites", readNumberProperty(payloadSummary, "observedImportSites"));
  addCount(counts, "observedModuleEdges", readNumberProperty(payloadSummary, "observedModuleEdges"));
  addCount(counts, "shownObservedDependencies", readNumberProperty(payloadSummary, "shownObservedDependencies"));
  addCount(counts, "sourceFiles", readNumberProperty(payloadSummary, "sourceFiles"));
  addCount(counts, "violations", readNumberProperty(payloadSummary, "violations"));
  addCount(counts, "warnings", readNumberProperty(payloadSummary, "warnings"));

  const setupIssueCounts = countSetupAndHardViolations(payload);
  if (setupIssueCounts) {
    addCount(counts, "setupIssues", setupIssueCounts.setupIssues);
    addCount(counts, "hardViolations", setupIssueCounts.hardViolations);
  }

  if (counts.intentionalDebt === undefined) {
    const intentionalDebtCount = readArrayCount(payload, "intentionalDebt") ?? readArrayCount(payload, "intentionalViolations");
    addCount(counts, "intentionalDebt", intentionalDebtCount);
  }

  const drift = readRecordProperty(payload, "drift");
  addCount(counts, "newObservedEdges", readArrayCount(drift, "newObservedEdges"));
  addCount(counts, "removedObservedEdges", readArrayCount(drift, "removedObservedEdges"));

  return counts;
}

function buildDriftSummary(drift: Record<string, unknown> | undefined): AxiomMcpResultSummary["drift"] | undefined {
  if (!drift) {
    return undefined;
  }

  return {
    ...(readStringProperty(drift, "kind") ? { kind: readStringProperty(drift, "kind") } : {}),
    newObservedEdges: readArrayCount(drift, "newObservedEdges") ?? 0,
    removedObservedEdges: readArrayCount(drift, "removedObservedEdges") ?? 0
  };
}

function buildAdvisorySignalCoverageSummary(
  architectureSummary: Record<string, unknown> | undefined
): AxiomMcpResultSummary["advisorySignalCoverage"] | undefined {
  const coverage = readRecordProperty(architectureSummary, "advisorySignalCoverage");
  const enabledFamilies = readRecordArrayProperty(coverage, "enabledFamilies");
  if (enabledFamilies.length === 0) {
    return undefined;
  }

  const checkedNoFindings = enabledFamilies
    .filter((entry) => readStringProperty(entry, "status") === "checked_no_findings")
    .map(formatAdvisorySignalCoverageLabel);
  const findingsReported = enabledFamilies
    .filter((entry) => readStringProperty(entry, "status") === "findings_reported")
    .map(formatAdvisorySignalCoverageLabel);
  const notEvaluated = enabledFamilies
    .filter((entry) => {
      const status = readStringProperty(entry, "status");
      return status === "not_evaluated_needs_contract" || status === "not_applicable_no_exposed_paths";
    })
    .map(formatAdvisorySignalCoverageLabel);
  const summary = {
    checkedNoFindings,
    findingsReported,
    notEvaluated,
    ...(readStringProperty(coverage, "caveat") ? { caveat: readStringProperty(coverage, "caveat") } : {})
  };

  return checkedNoFindings.length > 0 || findingsReported.length > 0 || notEvaluated.length > 0 ? summary : undefined;
}

function formatAdvisorySignalCoverageLabel(entry: Record<string, unknown>): string {
  const family = readStringProperty(entry, "family");
  const label = readStringProperty(entry, "label") ?? family ?? "unknown";
  const findings = readNumberProperty(entry, "findings");
  const suffix = findings !== undefined && findings > 0 ? ` (${findings})` : "";
  return `${label}${suffix}`;
}

function buildReviewStorySummary(
  reviewStory: Record<string, unknown> | undefined
): AxiomMcpResultSummary["reviewStory"] | undefined {
  if (!reviewStory) {
    return undefined;
  }

  const firstPressure = readFirstPressure(reviewStory);
  const summary = {
    ...(readStringProperty(reviewStory, "caveat") ? { caveat: readStringProperty(reviewStory, "caveat") } : {}),
    ...(firstPressure ? { firstPressure } : {}),
    ...(readStringProperty(reviewStory, "nextStep") ? { nextStep: readStringProperty(reviewStory, "nextStep") } : {}),
    ...(readStringProperty(reviewStory, "summary") ? { summary: readStringProperty(reviewStory, "summary") } : {})
  };

  return Object.keys(summary).length > 0 ? summary : undefined;
}

function readFirstPressure(reviewStory: Record<string, unknown>): NonNullable<AxiomMcpResultSummary["reviewStory"]>["firstPressure"] | undefined {
  const pressures = reviewStory.pressures;
  if (!Array.isArray(pressures) || !isRecord(pressures[0])) {
    return undefined;
  }

  const pressure = pressures[0];
  const firstPressure = {
    ...(readStringProperty(pressure, "kind") ? { kind: readStringProperty(pressure, "kind") } : {}),
    ...(readStringProperty(pressure, "severity") ? { severity: readStringProperty(pressure, "severity") } : {}),
    ...(readStringProperty(pressure, "title") ? { title: readStringProperty(pressure, "title") } : {})
  };

  return Object.keys(firstPressure).length > 0 ? firstPressure : undefined;
}

function addCount(
  counts: NonNullable<AxiomMcpResultSummary["counts"]>,
  key: keyof NonNullable<AxiomMcpResultSummary["counts"]>,
  value: number | undefined
): void {
  if (value !== undefined) {
    counts[key] = value;
  }
}

function readSchemaVersion(payload: unknown): string | undefined {
  if (!isRecord(payload)) {
    return undefined;
  }

  return typeof payload.schemaVersion === "string" ? payload.schemaVersion : undefined;
}

function readArrayCount(record: Record<string, unknown> | undefined, key: string): number | undefined {
  const value = record?.[key];
  return Array.isArray(value) ? value.length : undefined;
}

function readBooleanProperty(record: Record<string, unknown> | undefined, key: string): boolean | undefined {
  const value = record?.[key];
  return typeof value === "boolean" ? value : undefined;
}

function readNumberProperty(record: Record<string, unknown> | undefined, key: string): number | undefined {
  const value = record?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readRecordProperty(record: Record<string, unknown> | undefined, key: string): Record<string, unknown> | undefined {
  const value = record?.[key];
  return isRecord(value) ? value : undefined;
}

function readRecordArrayProperty(record: Record<string, unknown> | undefined, key: string): Array<Record<string, unknown>> {
  const value = record?.[key];
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => isRecord(item)) : [];
}

function readStringProperty(record: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === "string" ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
