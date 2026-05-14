import process from "node:process";

export const AXIOM_MCP_TOOL_NAMES = [
  "axiom_check",
  "axiom_observe",
  "axiom_graph",
  "axiom_diff",
  "axiom_infer_contract"
] as const;

export type AxiomMcpToolName = (typeof AXIOM_MCP_TOOL_NAMES)[number];

type AxiomMcpCommand = "check" | "diff" | "graph" | "infer" | "observe";
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
    tool: AxiomMcpToolName;
  };
}

export interface AxiomMcpInvocationOptions {
  cliPath?: string;
  nodeExecutable?: string;
}

const OUTPUT_SCHEMA: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["tool", "command", "exitCode"],
  properties: {
    tool: { type: "string" },
    command: { type: "string" },
    exitCode: { type: "integer" },
    schemaVersion: { type: "string" },
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
    tool: invocation.toolName
  };

  return {
    content: [{ type: "text", text: JSON.stringify(structuredContent, null, 2) }],
    structuredContent
  };
}

function mcpToolToCliCommand(toolName: AxiomMcpToolName): Exclude<AxiomMcpCommand, "infer"> {
  switch (toolName) {
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
    ["couplingConcentration", "deepInternalImports", "largeFiles", "publicApiSurface", "unresolvedImports"],
    "warnings"
  );

  appendBooleanFlag(args, warnings, "unresolvedImports", "--warn-unresolved-imports");
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
    tool: invocation.toolName
  };

  return {
    content: [{ type: "text", text: JSON.stringify(structuredContent, null, 2) }],
    isError: true,
    structuredContent
  };
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
