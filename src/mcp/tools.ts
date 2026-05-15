import process from "node:process";
import { buildInferObserveTopSignals, buildPayloadTopSignals, type AxiomMcpTopSignal } from "./topSignals.js";

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
type AxiomMcpAdoptionMode = "loose" | "strict" | "warn-unowned";
type AxiomMcpGraphView = "attention" | "full" | "violationsOnly";
type AxiomMcpGroupBy = "folder" | "workspace";

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
    importsScanned?: number;
    intentionalDebt?: number;
    modules?: number;
    newObservedEdges?: number;
    observedDependencies?: number;
    removedObservedEdges?: number;
    shownObservedDependencies?: number;
    sourceFiles?: number;
    violations?: number;
    warnings?: number;
  };
  drift?: {
    kind?: string;
    newObservedEdges: number;
    removedObservedEdges: number;
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

const SUMMARY_SCHEMA: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "agentHint"],
  properties: {
    kind: { type: "string" },
    agentHint: { type: "string" },
    ok: { type: "boolean" },
    status: { type: "string" },
    gate: {
      type: "object",
      additionalProperties: false,
      required: ["command", "currentCommandIsGate", "hardViolationsFailCheck"],
      properties: {
        command: { type: "string" },
        currentCommandIsGate: { type: "boolean" },
        hardViolationsFailCheck: { type: "boolean" }
      }
    },
    counts: {
      type: "object",
      additionalProperties: false,
      properties: {
        allowedRoots: { type: "integer" },
        architecturePressureNotes: { type: "integer" },
        collapsedCycles: { type: "integer" },
        importsScanned: { type: "integer" },
        intentionalDebt: { type: "integer" },
        modules: { type: "integer" },
        newObservedEdges: { type: "integer" },
        observedDependencies: { type: "integer" },
        removedObservedEdges: { type: "integer" },
        shownObservedDependencies: { type: "integer" },
        sourceFiles: { type: "integer" },
        violations: { type: "integer" },
        warnings: { type: "integer" }
      }
    },
    drift: {
      type: "object",
      additionalProperties: false,
      required: ["newObservedEdges", "removedObservedEdges"],
      properties: {
        kind: { type: "string" },
        newObservedEdges: { type: "integer" },
        removedObservedEdges: { type: "integer" }
      }
    },
    reviewStory: {
      type: "object",
      additionalProperties: false,
      properties: {
        caveat: { type: "string" },
        firstPressure: {
          type: "object",
          additionalProperties: false,
          properties: {
            kind: { type: "string" },
            severity: { type: "string" },
            title: { type: "string" }
          }
        },
        nextStep: { type: "string" },
        summary: { type: "string" }
      }
    },
    topSignals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "title"],
        properties: {
          count: { type: "integer" },
          detail: { type: "string" },
          fromModule: { type: "string" },
          kind: { type: "string" },
          location: { type: "string" },
          module: { type: "string" },
          severity: { type: "string" },
          title: { type: "string" },
          toModule: { type: "string" }
        }
      }
    }
  }
};

const OUTPUT_SCHEMA: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["tool", "command", "exitCode", "summary"],
  properties: {
    tool: { type: "string" },
    command: { type: "string" },
    exitCode: { type: "integer" },
    schemaVersion: { type: "string" },
    summary: SUMMARY_SCHEMA,
    payload: { type: "object" },
    error: {
      type: "object",
      additionalProperties: false,
      required: ["message"],
      properties: {
        message: { type: "string" },
        stderr: { type: "string" },
        stdout: { type: "string" }
      }
    }
  }
};

const COMMON_TOOL_PROPERTIES: Record<string, JsonSchema> = {
  root: {
    type: "string",
    description: "Project root to scan. Paths inside .axi specs are resolved relative to this root."
  },
  configPath: {
    type: "string",
    description: "Optional axiom.config.json path."
  },
  include: {
    type: "array",
    description: "Optional source include globs, matching repeated CLI --include flags.",
    items: { type: "string" }
  },
  exclude: {
    type: "array",
    description: "Optional source exclude globs, matching repeated CLI --exclude flags.",
    items: { type: "string" }
  },
  specPaths: {
    type: "array",
    description: "Optional explicit .axi spec files or directories, matching repeated CLI --spec flags.",
    items: { type: "string" }
  },
  adoptionMode: {
    type: "string",
    description: "Ownership adoption mode for unowned source files.",
    enum: ["loose", "warn-unowned", "strict"]
  },
  intentionalViolationWarningDays: {
    type: "integer",
    minimum: 0,
    description: "Warn when visible intentional debt expires within this many days."
  },
  warnings: {
    type: "object",
    additionalProperties: false,
    description: "Opt-in advisory warning families. These never become MCP-only gates.",
    properties: {
      couplingConcentration: { type: "boolean" },
      deepInternalImports: { type: "boolean" },
      dynamicImports: { type: "boolean" },
      largeFiles: { type: "boolean" },
      publicApiSurface: { type: "boolean" },
      unresolvedImports: { type: "boolean" }
    }
  }
};

const BASELINE_PROPERTY: JsonSchema = {
  type: "string",
  description: "Path to an unfiltered axi graph --json baseline."
};

const TOOL_DESCRIPTORS: AxiomMcpToolDescriptor[] = [
  {
    name: "axiom_roots",
    title: "List Allowed Axiom Roots",
    description: "List the local roots this MCP server is allowed to scan. Use this before choosing a root for other Axiom MCP tools.",
    inputSchema: objectSchema({}, []),
    outputSchema: OUTPUT_SCHEMA,
    annotations: readOnlyAnnotations()
  },
  {
    name: "axiom_check",
    title: "Run Axiom Check",
    description: "Run `axi check --json` as the hard contract gate. Exit code 1 from hard violations is returned as structured evidence, not a tool crash.",
    inputSchema: objectSchema(COMMON_TOOL_PROPERTIES, ["root"]),
    outputSchema: OUTPUT_SCHEMA,
    annotations: readOnlyAnnotations()
  },
  {
    name: "axiom_observe",
    title: "Run Axiom Observe",
    description: "Run `axi observe --json` for review context, warnings, visible debt, and optional baseline drift. This is not a gate.",
    inputSchema: objectSchema(
      {
        ...COMMON_TOOL_PROPERTIES,
        baselinePath: BASELINE_PROPERTY
      },
      ["root"]
    ),
    outputSchema: OUTPUT_SCHEMA,
    annotations: readOnlyAnnotations()
  },
  {
    name: "axiom_graph",
    title: "Run Axiom Graph",
    description: "Run `axi graph --json` for the declared and observed dependency graph, optionally focused as attention output.",
    inputSchema: objectSchema(
      {
        ...COMMON_TOOL_PROPERTIES,
        baselinePath: BASELINE_PROPERTY,
        view: {
          type: "string",
          description: "Graph view. Full is the unfiltered graph; attention and violationsOnly match the CLI focus flags.",
          enum: ["full", "attention", "violationsOnly"]
        }
      },
      ["root"]
    ),
    outputSchema: OUTPUT_SCHEMA,
    annotations: readOnlyAnnotations()
  },
  {
    name: "axiom_diff",
    title: "Run Axiom Diff",
    description: "Run `axi diff --json` against an existing unfiltered graph baseline. Drift remains advisory.",
    inputSchema: objectSchema(
      {
        ...COMMON_TOOL_PROPERTIES,
        baselinePath: BASELINE_PROPERTY
      },
      ["root", "baselinePath"]
    ),
    outputSchema: OUTPUT_SCHEMA,
    annotations: readOnlyAnnotations()
  },
  {
    name: "axiom_infer_contract",
    title: "Infer Axiom Contract",
    description: "Run `axi infer --json` to produce a current-graph starter contract draft. This is authoring evidence, not declared intent.",
    inputSchema: objectSchema(
      {
        root: COMMON_TOOL_PROPERTIES.root,
        configPath: COMMON_TOOL_PROPERTIES.configPath,
        include: COMMON_TOOL_PROPERTIES.include,
        exclude: COMMON_TOOL_PROPERTIES.exclude,
        groupBy: {
          type: "string",
          description: "Inference grouping strategy.",
          enum: ["folder", "workspace"]
        },
        groupDepth: {
          type: "integer",
          minimum: 1,
          description: "Folder grouping depth for inferred modules."
        }
      },
      ["root"]
    ),
    outputSchema: OUTPUT_SCHEMA,
    annotations: readOnlyAnnotations()
  },
  {
    name: "axiom_observe_inferred_contract",
    title: "Observe With Inferred Contract",
    description: "Run `axi infer --json`, then run `axi observe --json` with a server-managed temporary inferred spec. This is advisory review evidence, not declared architecture intent.",
    inputSchema: objectSchema(
      {
        root: COMMON_TOOL_PROPERTIES.root,
        configPath: COMMON_TOOL_PROPERTIES.configPath,
        include: COMMON_TOOL_PROPERTIES.include,
        exclude: COMMON_TOOL_PROPERTIES.exclude,
        adoptionMode: COMMON_TOOL_PROPERTIES.adoptionMode,
        intentionalViolationWarningDays: COMMON_TOOL_PROPERTIES.intentionalViolationWarningDays,
        warnings: COMMON_TOOL_PROPERTIES.warnings,
        groupBy: {
          type: "string",
          description: "Inference grouping strategy used for the temporary starter contract.",
          enum: ["folder", "workspace"]
        },
        groupDepth: {
          type: "integer",
          minimum: 1,
          description: "Folder grouping depth used for the temporary starter contract."
        }
      },
      ["root"]
    ),
    outputSchema: OUTPUT_SCHEMA,
    annotations: readOnlyAnnotations()
  }
];

const TOOL_BY_NAME = new Map(TOOL_DESCRIPTORS.map((tool) => [tool.name, tool]));

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

export function buildAxiomMcpCliInvocation(
  toolName: AxiomMcpToolName,
  rawInput: unknown,
  options: AxiomMcpInvocationOptions = {}
): AxiomMcpCliInvocation {
  if (toolName === "axiom_roots") {
    throw new Error("axiom_roots is a server-native MCP tool and does not map to an Axiom CLI invocation.");
  }

  if (toolName === "axiom_observe_inferred_contract") {
    throw new Error("axiom_observe_inferred_contract is a server workflow and does not map to one Axiom CLI invocation.");
  }

  const input = readInput(rawInput);
  const cliPath = options.cliPath ?? "dist/cli.js";
  const executable = options.nodeExecutable ?? process.execPath;

  if (toolName === "axiom_infer_contract") {
    assertKnownKeys(input, ["configPath", "exclude", "groupBy", "groupDepth", "include", "root"], toolName);
    const args = [cliPath, "infer", "--root", readRequiredString(input, "root"), "--json"];
    appendScopeArgs(args, input);
    appendConfigArg(args, input);

    const groupBy = readOptionalEnum<AxiomMcpGroupBy>(input, "groupBy", ["folder", "workspace"]);
    if (groupBy) {
      args.push("--group-by", groupBy);
    }

    const groupDepth = readOptionalInteger(input, "groupDepth", { minimum: 1 });
    if (groupDepth !== undefined) {
      args.push("--group-depth", String(groupDepth));
    }

    return {
      acceptedExitCodes: [0],
      args,
      command: "infer",
      executable,
      payloadSchemaPrefix: "axiom.infer.",
      readOnly: true,
      toolName
    };
  }

  assertKnownKeys(
    input,
    [
      "adoptionMode",
      "baselinePath",
      "configPath",
      "exclude",
      "include",
      "intentionalViolationWarningDays",
      "root",
      "specPaths",
      "view",
      "warnings"
    ],
    toolName
  );

  const command = mcpToolToCliCommand(toolName);
  const root = readRequiredString(input, "root");
  const args = [cliPath, command];

  if (command === "diff") {
    args.push("--baseline", readRequiredString(input, "baselinePath"));
  }

  args.push("--root", root, "--json");
  appendScopeArgs(args, input);
  appendConfigArg(args, input);
  appendSpecArgs(args, input);
  appendAdoptionModeArgs(args, input);
  appendIntentionalDebtArgs(args, input);
  appendWarningArgs(args, input);

  if (command !== "diff") {
    const baselinePath = readOptionalString(input, "baselinePath");
    if (baselinePath) {
      args.push("--baseline", baselinePath);
    }
  }

  if (command === "graph") {
    const view = readOptionalEnum<AxiomMcpGraphView>(input, "view", ["attention", "full", "violationsOnly"]) ?? "full";
    if (view === "attention") {
      args.push("--attention");
    } else if (view === "violationsOnly") {
      args.push("--violations-only");
    }
  }

  return {
    acceptedExitCodes: command === "check" ? [0, 1] : [0],
    args,
    command,
    executable,
    payloadSchemaPrefix: command === "check" ? "axiom.check." : "axiom.graph.",
    readOnly: true,
    toolName
  };
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

function mcpToolToCliCommand(toolName: AxiomMcpToolName): Exclude<AxiomMcpCommand, "infer" | "infer_observe" | "roots"> {
  switch (toolName) {
    case "axiom_roots":
      throw new Error("axiom_roots is served by the MCP server without invoking the Axiom CLI.");
    case "axiom_check":
      return "check";
    case "axiom_diff":
      return "diff";
    case "axiom_graph":
      return "graph";
    case "axiom_observe":
      return "observe";
    case "axiom_infer_contract":
      throw new Error("axiom_infer_contract maps to infer through its dedicated branch.");
    case "axiom_observe_inferred_contract":
      throw new Error("axiom_observe_inferred_contract is served as an MCP workflow.");
  }
}

function appendScopeArgs(args: string[], input: Record<string, unknown>): void {
  for (const include of readOptionalStringArray(input, "include")) {
    args.push("--include", include);
  }

  for (const exclude of readOptionalStringArray(input, "exclude")) {
    args.push("--exclude", exclude);
  }
}

function appendConfigArg(args: string[], input: Record<string, unknown>): void {
  const configPath = readOptionalString(input, "configPath");
  if (configPath) {
    args.push("--config", configPath);
  }
}

function appendSpecArgs(args: string[], input: Record<string, unknown>): void {
  for (const specPath of readOptionalStringArray(input, "specPaths")) {
    args.push("--spec", specPath);
  }
}

function appendAdoptionModeArgs(args: string[], input: Record<string, unknown>): void {
  const adoptionMode = readOptionalEnum<AxiomMcpAdoptionMode>(input, "adoptionMode", ["loose", "strict", "warn-unowned"]);
  if (adoptionMode === "strict") {
    args.push("--strict");
  } else if (adoptionMode === "warn-unowned") {
    args.push("--warn-unowned");
  }
}

function appendIntentionalDebtArgs(args: string[], input: Record<string, unknown>): void {
  const warningDays = readOptionalInteger(input, "intentionalViolationWarningDays", { minimum: 0 });
  if (warningDays !== undefined) {
    args.push("--intentional-violation-warning-days", String(warningDays));
  }
}

function appendWarningArgs(args: string[], input: Record<string, unknown>): void {
  const warnings = readOptionalRecord(input, "warnings");
  if (!warnings) {
    return;
  }

  assertKnownKeys(
    warnings,
    ["couplingConcentration", "deepInternalImports", "dynamicImports", "largeFiles", "publicApiSurface", "unresolvedImports"],
    "warnings"
  );

  appendBooleanFlag(args, warnings, "unresolvedImports", "--warn-unresolved-imports");
  appendBooleanFlag(args, warnings, "dynamicImports", "--warn-dynamic-imports");
  appendBooleanFlag(args, warnings, "publicApiSurface", "--warn-public-api-surface");
  appendBooleanFlag(args, warnings, "couplingConcentration", "--warn-coupling-concentration");
  appendBooleanFlag(args, warnings, "deepInternalImports", "--warn-deep-internal-imports");
  appendBooleanFlag(args, warnings, "largeFiles", "--warn-large-files");
}

function appendBooleanFlag(args: string[], record: Record<string, unknown>, key: string, flag: string): void {
  const value = record[key];
  if (value === undefined) {
    return;
  }

  if (typeof value !== "boolean") {
    throw new Error(`${key} must be a boolean.`);
  }

  if (value) {
    args.push(flag);
  }
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
  const topSignals = buildPayloadTopSignals(payloadRecord);

  return {
    agentHint: buildAgentHint(invocation.command, ok),
    ...(Object.keys(counts).length > 0 ? { counts } : {}),
    ...(drift ? { drift } : {}),
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
  addCount(counts, "sourceFiles", readNumberProperty(inferenceSummary, "sourceFiles"));

  const reviewStory = buildReviewStorySummary(readRecordProperty(architectureSummary, "reviewStory")) ??
    buildReviewStorySummary(readRecordProperty(inferenceRecord, "reviewStory"));
  const topSignals = buildInferObserveTopSignals(inferenceRecord, observeRecord);
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
    agentHint: "Use this as advisory review evidence produced from a temporary inferred contract. The inferred contract mirrors the current graph and is not declared architecture intent; do not save it, update baselines, accept debt, or use it as a hard gate without human review.",
    ...(Object.keys(counts).length > 0 ? { counts } : {}),
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

function buildAgentHint(command: AxiomMcpCommand, ok: boolean | undefined): string {
  if (command === "check") {
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

  return "Use this as advisory review evidence. The hard gate remains axiom_check / axi check.";
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
  addCount(counts, "shownObservedDependencies", readNumberProperty(payloadSummary, "shownObservedDependencies"));
  addCount(counts, "sourceFiles", readNumberProperty(payloadSummary, "sourceFiles"));
  addCount(counts, "violations", readNumberProperty(payloadSummary, "violations"));
  addCount(counts, "warnings", readNumberProperty(payloadSummary, "warnings"));

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

function readInput(rawInput: unknown): Record<string, unknown> {
  if (!isRecord(rawInput)) {
    throw new Error("MCP tool input must be an object.");
  }

  return rawInput;
}

function readRequiredString(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${key} must be a non-empty string.`);
  }

  return value;
}

function readOptionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`${key} must be a non-empty string when provided.`);
  }

  return value;
}

function readOptionalStringArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  if (value === undefined) {
    return [];
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.length === 0)) {
    throw new Error(`${key} must be an array of non-empty strings when provided.`);
  }

  return [...value];
}

function readOptionalRecord(record: Record<string, unknown>, key: string): Record<string, unknown> | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }

  if (!isRecord(value)) {
    throw new Error(`${key} must be an object when provided.`);
  }

  return value;
}

function readOptionalEnum<T extends string>(record: Record<string, unknown>, key: string, allowed: readonly T[]): T | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || !allowed.includes(value as T)) {
    throw new Error(`${key} must be one of: ${allowed.join(", ")}.`);
  }

  return value as T;
}

function readOptionalInteger(
  record: Record<string, unknown>,
  key: string,
  options: { minimum: number }
): number | undefined {
  const value = record[key];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < options.minimum) {
    throw new Error(`${key} must be an integer >= ${options.minimum}.`);
  }

  return value;
}

function assertKnownKeys(record: Record<string, unknown>, allowed: string[], label: string): void {
  const allowedSet = new Set(allowed);
  const unknownKeys = Object.keys(record).filter((key) => !allowedSet.has(key));
  if (unknownKeys.length > 0) {
    throw new Error(`${label} received unsupported input field${unknownKeys.length === 1 ? "" : "s"}: ${unknownKeys.join(", ")}.`);
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

function readStringProperty(record: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = record?.[key];
  return typeof value === "string" ? value : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function objectSchema(properties: Record<string, JsonSchema>, required: string[]): JsonSchema {
  return {
    type: "object",
    additionalProperties: false,
    properties,
    required
  };
}

function readOnlyAnnotations(): AxiomMcpToolDescriptor["annotations"] {
  return {
    destructiveHint: false,
    openWorldHint: false,
    readOnlyHint: true
  };
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}
