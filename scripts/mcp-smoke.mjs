import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import readline from "node:readline";

const repoRoot = process.cwd();
const serverPath = path.join(repoRoot, "dist/mcp/server.js");

if (!existsSync(serverPath)) {
  console.error("dist/mcp/server.js was not found. Run npm run build before MCP smoke.");
  process.exit(1);
}

const protocolVersion = "2025-11-25";

async function main() {
  await runMainSmoke();
  await runAllowRootSmoke();

  console.log("MCP stdio smoke passed.");
  console.log("- initialized the local stdio server");
  console.log("- listed 5 read-only Axiom tools");
  console.log("- checked the current repository through axiom_check");
  console.log("- treated fixture contract violations as structured evidence");
  console.log("- rejected a tool call outside the configured allow-root");
}

async function runMainSmoke() {
  const server = startServer(["--allow-root", repoRoot, "--timeout-ms", "20000"]);

  try {
    const initialized = await server.request("initialize", {
      protocolVersion,
      capabilities: {},
      clientInfo: { name: "axiom-mcp-smoke", version: "0" }
    });
    assertNoJsonRpcError(initialized, "initialize");
    assertEqual(initialized.result?.protocolVersion, protocolVersion, "protocol version");
    assertEqual(initialized.result?.capabilities?.tools?.listChanged, false, "tools listChanged capability");

    server.notify("notifications/initialized", {});

    const tools = await server.request("tools/list", {});
    assertNoJsonRpcError(tools, "tools/list");
    assertEqual(tools.result?.tools?.length, 5, "tool count");
    assertEqual(
      tools.result?.tools?.every((tool) => tool.annotations?.readOnlyHint === true),
      true,
      "all tools are read-only"
    );

    const selfCheck = await callTool(server, "axiom_check", {
      root: repoRoot,
      adoptionMode: "strict"
    });
    assertEqual(selfCheck.result?.isError, undefined, "self check is not a tool error");
    assertEqual(selfCheck.result?.structuredContent?.tool, "axiom_check", "self check tool name");
    assertEqual(selfCheck.result?.structuredContent?.exitCode, 0, "self check exit code");
    assertEqual(selfCheck.result?.structuredContent?.payload?.ok, true, "self check ok");
    assertEqual(selfCheck.result?.structuredContent?.payload?.summary?.violations, 0, "self check hard violations");

    const failingCheck = await callTool(server, "axiom_check", {
      root: path.join(repoRoot, "fixtures/basic-ts-invalid")
    });
    assertEqual(failingCheck.result?.isError, undefined, "failing check is not a tool error");
    assertEqual(failingCheck.result?.structuredContent?.exitCode, 1, "failing check exit code");
    assertEqual(failingCheck.result?.structuredContent?.payload?.ok, false, "failing check ok flag");
    assertEqual(
      failingCheck.result?.structuredContent?.payload?.violations?.[0]?.code,
      "forbidden_dependency",
      "failing check first violation code"
    );

    const observe = await callTool(server, "axiom_observe", {
      root: repoRoot,
      adoptionMode: "strict"
    });
    assertEqual(observe.result?.isError, undefined, "observe is not a tool error");
    assertEqual(observe.result?.structuredContent?.schemaVersion, "axiom.graph.v12", "observe schema");
    assertEqual(observe.result?.structuredContent?.payload?.architectureSummary?.gate?.currentCommandIsGate, false, "observe is not a gate");
  } finally {
    await server.close();
  }
}

async function runAllowRootSmoke() {
  const allowedRoot = path.join(repoRoot, "fixtures/basic-ts-valid");
  const server = startServer(["--allow-root", allowedRoot, "--timeout-ms", "20000"]);

  try {
    const initialized = await server.request("initialize", {
      protocolVersion,
      capabilities: {},
      clientInfo: { name: "axiom-mcp-smoke", version: "0" }
    });
    assertNoJsonRpcError(initialized, "allow-root initialize");

    const rejected = await callTool(server, "axiom_check", {
      root: path.join(repoRoot, "fixtures/basic-ts-invalid")
    });
    assertEqual(rejected.error?.code, -32602, "outside-root rejection code");
    assertTextIncludes(rejected.error?.message ?? "", "outside allowed MCP roots", "outside-root rejection message");
  } finally {
    await server.close();
  }
}

function startServer(args) {
  const child = spawn(process.execPath, [serverPath, ...args], {
    cwd: repoRoot,
    windowsHide: true
  });

  return new McpServerHandle(child);
}

function callTool(server, name, args) {
  return server.request("tools/call", {
    name,
    arguments: args
  });
}

class McpServerHandle {
  #nextId = 1;
  #pending = new Map();
  #stderrChunks = [];
  #stdout;

  constructor(child) {
    this.child = child;
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => {
      this.#stderrChunks.push(chunk);
    });

    this.#stdout = readline.createInterface({
      crlfDelay: Infinity,
      input: child.stdout
    });
    this.#stdout.on("line", (line) => {
      const payload = JSON.parse(line);
      const id = payload.id;
      if (typeof id === "number") {
        const resolve = this.#pending.get(id);
        this.#pending.delete(id);
        resolve?.(payload);
      }
    });
  }

  request(method, params) {
    const id = this.#nextId;
    this.#nextId += 1;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(new Error(`Timed out waiting for ${method}. stderr:\n${this.#stderrChunks.join("")}`));
      }, 20_000);

      this.#pending.set(id, (response) => {
        clearTimeout(timer);
        resolve(response);
      });

      this.child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", id, method, params })}\n`);
    });
  }

  notify(method, params) {
    this.child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
  }

  async close() {
    this.child.stdin.end();
    await new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.child.kill();
        resolve();
      }, 5_000);
      this.child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }
}

function assertNoJsonRpcError(response, label) {
  if (response.error) {
    throw new Error(`Expected ${label} to succeed, got JSON-RPC error: ${JSON.stringify(response.error)}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`Expected ${label} to be ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
  }
}

function assertTextIncludes(text, expected, label) {
  if (!text.includes(expected)) {
    throw new Error(`Expected ${label} to include ${JSON.stringify(expected)}.\nActual output:\n${text}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
