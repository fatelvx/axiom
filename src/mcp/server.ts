#!/usr/bin/env node
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import {
  AXIOM_MCP_TOOL_NAMES,
  buildAxiomMcpCliInvocation,
  createAxiomMcpRootsToolResult,
  createAxiomMcpToolResult,
  listAxiomMcpTools,
  type AxiomMcpExecutionResult,
  type AxiomMcpToolName
} from "./tools.js";

const MCP_PROTOCOL_VERSION = "2025-11-25";
const DEFAULT_TIMEOUT_MS = 60_000;

interface JsonRpcRequest {
  id?: JsonRpcRequestId;
  jsonrpc?: "2.0";
  method?: string;
  params?: unknown;
}

type JsonRpcRequestId = number | string | null;

interface ServerConfig {
  allowedRoots: string[];
  cliPath: string;
  timeoutMs: number;
}

const serverConfig = parseServerArgs(process.argv.slice(2));
const serverInfo = readServerInfo();
const input = readline.createInterface({
  crlfDelay: Infinity,
  input: process.stdin
});

input.on("line", (line) => {
  void handleMessageLine(line);
});

async function handleMessageLine(line: string): Promise<void> {
  if (line.trim().length === 0) {
    return;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(line) as unknown;
  } catch {
    writeJsonRpcError(null, -32700, "Parse error");
    return;
  }

  if (!isRecord(payload)) {
    writeJsonRpcError(null, -32600, "Invalid Request");
    return;
  }

  const request = payload as JsonRpcRequest;
  if (request.jsonrpc !== "2.0" || typeof request.method !== "string") {
    writeJsonRpcError(readRequestId(request), -32600, "Invalid Request");
    return;
  }

  const id = readRequestId(request);
  if (id === undefined) {
    handleNotification(request.method);
    return;
  }

  try {
    const result = await handleRequest(request.method, request.params);
    writeJsonRpcResult(id, result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (error instanceof JsonRpcMethodNotFoundError) {
      writeJsonRpcError(id, -32601, message);
      return;
    }

    writeJsonRpcError(id, message.startsWith("Invalid params:") ? -32602 : -32603, message);
  }
}

function handleNotification(method: string): void {
  if (method === "notifications/initialized" || method.startsWith("notifications/")) {
    return;
  }

  log(`Ignoring notification '${method}'.`);
}

async function handleRequest(method: string, params: unknown): Promise<unknown> {
  switch (method) {
    case "initialize":
      return {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: {
          tools: {
            listChanged: false
          }
        },
        serverInfo
      };
    case "ping":
      return {};
    case "tools/list":
      return {
        tools: listAxiomMcpTools()
      };
    case "tools/call":
      return callTool(params);
    default:
      throw new JsonRpcMethodNotFoundError(method);
  }
}

async function callTool(params: unknown): Promise<unknown> {
  const call = readToolCallParams(params);
  if (call.name === "axiom_roots") {
    assertNoArguments(call.arguments, call.name);
    return createAxiomMcpRootsToolResult(serverConfig.allowedRoots);
  }

  validateToolInputPaths(call.arguments);
  const invocation = buildAxiomMcpCliInvocation(call.name, call.arguments, {
    cliPath: serverConfig.cliPath
  });
  const execution = await runInvocation(invocation.executable, invocation.args, {
    timeoutMs: serverConfig.timeoutMs
  });

  return createAxiomMcpToolResult(invocation, execution);
}

function readToolCallParams(params: unknown): { arguments: Record<string, unknown>; name: AxiomMcpToolName } {
  if (!isRecord(params)) {
    throw new Error("Invalid params: tools/call params must be an object.");
  }

  const rawName = params.name;
  if (typeof rawName !== "string" || !isAxiomMcpToolName(rawName)) {
    throw new Error(`Invalid params: unsupported Axiom tool '${String(rawName)}'.`);
  }

  const rawArguments = params.arguments ?? {};
  if (!isRecord(rawArguments)) {
    throw new Error("Invalid params: tools/call arguments must be an object.");
  }

  return {
    arguments: rawArguments,
    name: rawName
  };
}

function assertNoArguments(input: Record<string, unknown>, toolName: AxiomMcpToolName): void {
  const keys = Object.keys(input);
  if (keys.length > 0) {
    throw new Error(`Invalid params: ${toolName} does not accept input fields: ${keys.join(", ")}.`);
  }
}

function validateToolInputPaths(input: Record<string, unknown>): void {
  const root = readRequiredPathInput(input, "root");
  const resolvedRoot = path.resolve(root);
  assertAllowedPath(resolvedRoot, "root");

  const configPath = readOptionalPathInput(input, "configPath");
  if (configPath) {
    assertAllowedPath(resolvePathFromRoot(configPath, resolvedRoot), "configPath");
  }

  const baselinePath = readOptionalPathInput(input, "baselinePath");
  if (baselinePath) {
    assertAllowedPath(resolveCliArtifactPath(baselinePath, resolvedRoot), "baselinePath");
  }

  const specPaths = input.specPaths;
  if (specPaths !== undefined) {
    if (!Array.isArray(specPaths) || specPaths.some((specPath) => typeof specPath !== "string" || specPath.length === 0)) {
      throw new Error("Invalid params: specPaths must be an array of non-empty strings.");
    }

    for (const specPath of specPaths) {
      assertAllowedPath(resolveCliArtifactPath(specPath, resolvedRoot), "specPaths");
    }
  }
}

function runInvocation(
  executable: string,
  args: string[],
  options: { timeoutMs: number }
): Promise<AxiomMcpExecutionResult> {
  return new Promise((resolve) => {
    const child = spawn(executable, args, {
      cwd: process.cwd(),
      shell: false,
      windowsHide: true
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, options.timeoutMs);

    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });

    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({
        exitCode: 1,
        stderr: error.message,
        stdout
      });
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({
        exitCode: timedOut ? 124 : code ?? 1,
        stderr: timedOut ? `${stderr}${stderr ? "\n" : ""}Axiom CLI timed out after ${options.timeoutMs}ms.` : stderr,
        stdout
      });
    });
  });
}

function parseServerArgs(args: string[]): ServerConfig {
  const allowedRoots: string[] = [];
  let cliPath = defaultCliPath();
  let timeoutMs = DEFAULT_TIMEOUT_MS;

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index];

    if (value === "--help" || value === "-h") {
      printHelp();
      process.exit(0);
    }

    if (value === "--allow-root") {
      const root = args[index + 1];
      if (!root) {
        failStartup("Missing value for --allow-root.");
      }
      allowedRoots.push(resolveAllowedRoot(root));
      index += 1;
      continue;
    }

    if (value === "--cli") {
      const nextCliPath = args[index + 1];
      if (!nextCliPath) {
        failStartup("Missing value for --cli.");
      }
      cliPath = path.resolve(nextCliPath);
      index += 1;
      continue;
    }

    if (value === "--timeout-ms") {
      const rawTimeout = args[index + 1];
      const parsedTimeout = Number(rawTimeout);
      if (!rawTimeout || !Number.isInteger(parsedTimeout) || parsedTimeout < 1) {
        failStartup("--timeout-ms must be a positive integer.");
      }
      timeoutMs = parsedTimeout;
      index += 1;
      continue;
    }

    failStartup(`Unknown option '${value}'.`);
  }

  return {
    allowedRoots: allowedRoots.length > 0 ? allowedRoots : [resolveAllowedRoot(process.cwd())],
    cliPath,
    timeoutMs
  };
}

function defaultCliPath(): string {
  return fileURLToPath(new URL("../cli.js", import.meta.url));
}

function readServerInfo(): { name: string; version: string } {
  try {
    const packageJsonPath = fileURLToPath(new URL("../../package.json", import.meta.url));
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8")) as unknown;
    if (isRecord(packageJson) && typeof packageJson.name === "string" && typeof packageJson.version === "string") {
      return {
        name: `${packageJson.name}-mcp`,
        version: packageJson.version
      };
    }
  } catch {
    // Fall through to a stable default. Startup should not fail because package metadata is unavailable.
  }

  return {
    name: "axiom-mcp",
    version: "0.0.0"
  };
}

function readRequestId(request: JsonRpcRequest): JsonRpcRequestId | undefined {
  const id = request.id;
  if (typeof id === "string" || typeof id === "number" || id === null) {
    return id;
  }

  return undefined;
}

function writeJsonRpcResult(id: JsonRpcRequestId, result: unknown): void {
  writeMessage({
    jsonrpc: "2.0",
    id,
    result
  });
}

function writeJsonRpcError(id: JsonRpcRequestId | undefined, code: number, message: string): void {
  writeMessage({
    jsonrpc: "2.0",
    id: id ?? null,
    error: {
      code,
      message
    }
  });
}

function writeMessage(message: unknown): void {
  process.stdout.write(`${JSON.stringify(message)}\n`);
}

function printHelp(): void {
  process.stderr.write(`Axiom MCP stdio server

Usage:
  axi-mcp [--allow-root <path>] [--timeout-ms <ms>] [--cli <dist/cli.js>]

The server is read-only. It exposes tools/list and tools/call wrappers over existing Axiom JSON commands.
`);
}

function log(message: string): void {
  process.stderr.write(`[axiom-mcp] ${message}\n`);
}

function failStartup(message: string): never {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

function readRequiredPathInput(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid params: ${key} must be a non-empty string.`);
  }

  return value;
}

function readOptionalPathInput(input: Record<string, unknown>, key: string): string | undefined {
  const value = input[key];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`Invalid params: ${key} must be a non-empty string when provided.`);
  }

  return value;
}

function resolveAllowedRoot(root: string): string {
  return normalizeDirectoryPath(path.resolve(root));
}

function resolvePathFromRoot(filePath: string, root: string): string {
  return path.isAbsolute(filePath) ? path.resolve(filePath) : path.resolve(root, filePath);
}

function resolveCliArtifactPath(filePath: string, root: string): string {
  if (path.isAbsolute(filePath)) {
    return path.resolve(filePath);
  }

  const fromCwd = path.resolve(filePath);
  if (fs.existsSync(fromCwd)) {
    return fromCwd;
  }

  return path.resolve(root, filePath);
}

function assertAllowedPath(filePath: string, label: string): void {
  const resolvedPath = normalizeDirectoryPath(path.resolve(filePath));
  const allowed = serverConfig.allowedRoots.some((allowedRoot) => isWithinRoot(resolvedPath, allowedRoot));
  if (!allowed) {
    throw new Error(`Invalid params: ${label} is outside allowed MCP roots.`);
  }
}

function isWithinRoot(candidate: string, root: string): boolean {
  const relativePath = path.relative(root, candidate);
  return relativePath === "" || (!relativePath.startsWith("..") && !path.isAbsolute(relativePath));
}

function normalizeDirectoryPath(value: string): string {
  return path.normalize(value);
}

function isAxiomMcpToolName(value: string): value is AxiomMcpToolName {
  return (AXIOM_MCP_TOOL_NAMES as readonly string[]).includes(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

class JsonRpcMethodNotFoundError extends Error {
  constructor(method: string) {
    super(`Method not found: ${method}`);
  }
}
