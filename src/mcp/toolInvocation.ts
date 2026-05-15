import process from "node:process";
import type { AxiomMcpCliInvocation, AxiomMcpInvocationOptions, AxiomMcpToolName } from "./tools.js";

type AxiomMcpCommand = AxiomMcpCliInvocation["command"];
type AxiomMcpCliCommand = Exclude<AxiomMcpCommand, "infer" | "infer_observe" | "roots">;
type AxiomMcpAdoptionMode = "loose" | "strict" | "warn-unowned";
type AxiomMcpGraphView = "attention" | "full" | "violationsOnly";
type AxiomMcpGroupBy = "folder" | "workspace";

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
      "portable",
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
    const portable = readOptionalBoolean(input, "portable");
    if (portable && view !== "full") {
      throw new Error("portable graph output requires view to be full.");
    }
    if (portable && readOptionalString(input, "baselinePath")) {
      throw new Error("portable graph output cannot be combined with baselinePath.");
    }
    if (portable) {
      args.push("--portable");
    }
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

function mcpToolToCliCommand(toolName: AxiomMcpToolName): AxiomMcpCliCommand {
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

function readOptionalBoolean(record: Record<string, unknown>, key: string): boolean {
  const value = record[key];
  if (value === undefined) {
    return false;
  }

  if (typeof value !== "boolean") {
    throw new Error(`${key} must be a boolean when provided.`);
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
