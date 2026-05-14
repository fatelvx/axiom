import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
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
  await runInvalidInputSmoke();
  await runExecutionFailureSmoke();

  console.log("MCP stdio smoke passed.");
  console.log("- initialized the local stdio server");
  console.log("- listed 5 read-only Axiom tools");
  console.log("- exercised all 5 read-only Axiom tools through tools/call");
  console.log("- included agent-readable summary fields for gate, review, drift, inference, and tool errors");
  console.log("- checked the current repository through axiom_check");
  console.log("- treated fixture contract violations as structured evidence");
  console.log("- rejected a tool call outside the configured allow-root");
  console.log("- returned stable JSON-RPC errors for invalid tool input");
  console.log("- wrapped CLI execution failures and timeouts as structured tool errors");
}

async function runMainSmoke() {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "axiom-mcp-baseline-smoke-"));
  const baselinePath = path.join(tempRoot, "baseline.graph.json");
  const fixtureRoot = path.join(repoRoot, "fixtures/basic-ts-valid");
  const server = startServer(["--allow-root", repoRoot, "--allow-root", tempRoot, "--timeout-ms", "20000"]);

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
    assertEqual(selfCheck.result?.structuredContent?.summary?.kind, "check", "self check summary kind");
    assertEqual(selfCheck.result?.structuredContent?.summary?.gate?.currentCommandIsGate, true, "self check summary gate");

    const failingCheck = await callTool(server, "axiom_check", {
      root: path.join(repoRoot, "fixtures/basic-ts-invalid")
    });
    assertEqual(failingCheck.result?.isError, undefined, "failing check is not a tool error");
    assertEqual(failingCheck.result?.structuredContent?.exitCode, 1, "failing check exit code");
    assertEqual(failingCheck.result?.structuredContent?.payload?.ok, false, "failing check ok flag");
    assertEqual(failingCheck.result?.structuredContent?.summary?.ok, false, "failing check summary ok");
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
    assertEqual(observe.result?.structuredContent?.summary?.kind, "review", "observe summary kind");
    assertEqual(observe.result?.structuredContent?.summary?.gate?.currentCommandIsGate, false, "observe summary gate");

    const graph = await callTool(server, "axiom_graph", {
      root: fixtureRoot
    });
    assertEqual(graph.result?.isError, undefined, "graph is not a tool error");
    assertEqual(graph.result?.structuredContent?.tool, "axiom_graph", "graph tool name");
    assertEqual(graph.result?.structuredContent?.schemaVersion, "axiom.graph.v12", "graph schema");
    assertEqual(graph.result?.structuredContent?.summary?.kind, "review", "graph summary kind");
    assertEqual(
      graph.result?.structuredContent?.payload?.architectureSummary?.gate?.currentCommandIsGate,
      false,
      "graph is not a gate"
    );
    writeFileSync(baselinePath, JSON.stringify(graph.result?.structuredContent?.payload), "utf8");

    const diff = await callTool(server, "axiom_diff", {
      baselinePath,
      root: fixtureRoot
    });
    assertEqual(diff.result?.isError, undefined, "diff is not a tool error");
    assertEqual(diff.result?.structuredContent?.tool, "axiom_diff", "diff tool name");
    assertEqual(diff.result?.structuredContent?.schemaVersion, "axiom.graph.v12", "diff schema");
    assertEqual(diff.result?.structuredContent?.summary?.drift?.kind, "advisory_observed_edge_drift", "diff summary drift kind");
    assertEqual(
      diff.result?.structuredContent?.payload?.drift?.kind,
      "advisory_observed_edge_drift",
      "diff drift kind"
    );

    const infer = await callTool(server, "axiom_infer_contract", {
      root: fixtureRoot
    });
    assertEqual(infer.result?.isError, undefined, "infer is not a tool error");
    assertEqual(infer.result?.structuredContent?.tool, "axiom_infer_contract", "infer tool name");
    assertEqual(infer.result?.structuredContent?.schemaVersion, "axiom.infer.v8", "infer schema");
    assertEqual(infer.result?.structuredContent?.summary?.kind, "inference", "infer summary kind");
    assertTextIncludes(infer.result?.structuredContent?.payload?.axi ?? "", "module Physics", "infer generated contract");
  } finally {
    try {
      await server.close();
    } finally {
      rmSync(tempRoot, { force: true, recursive: true });
    }
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

async function runInvalidInputSmoke() {
  const server = startServer(["--allow-root", repoRoot, "--timeout-ms", "20000"]);

  try {
    const initialized = await server.request("initialize", {
      protocolVersion,
      capabilities: {},
      clientInfo: { name: "axiom-mcp-smoke", version: "0" }
    });
    assertNoJsonRpcError(initialized, "invalid-input initialize");

    const missingMethod = await server.request("axiom/unknown", {});
    assertEqual(missingMethod.error?.code, -32601, "unknown method error code");
    assertTextIncludes(missingMethod.error?.message ?? "", "Method not found", "unknown method error message");

    const unknownTool = await callTool(server, "axiom_write_contract", {
      root: repoRoot
    });
    assertEqual(unknownTool.error?.code, -32602, "unknown tool error code");
    assertTextIncludes(unknownTool.error?.message ?? "", "unsupported Axiom tool", "unknown tool error message");

    const missingRoot = await callTool(server, "axiom_check", {});
    assertEqual(missingRoot.error?.code, -32602, "missing root error code");
    assertTextIncludes(missingRoot.error?.message ?? "", "root must be a non-empty string", "missing root error message");

    const badArguments = await server.request("tools/call", {
      name: "axiom_check",
      arguments: []
    });
    assertEqual(badArguments.error?.code, -32602, "bad arguments error code");
    assertTextIncludes(badArguments.error?.message ?? "", "arguments must be an object", "bad arguments error message");

    const escapedSpecPath = await callTool(server, "axiom_check", {
      root: repoRoot,
      specPaths: [path.dirname(repoRoot)]
    });
    assertEqual(escapedSpecPath.error?.code, -32602, "outside spec path error code");
    assertTextIncludes(
      escapedSpecPath.error?.message ?? "",
      "specPaths is outside allowed MCP roots",
      "outside spec path error message"
    );
  } finally {
    await server.close();
  }
}

async function runExecutionFailureSmoke() {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "axiom-mcp-failure-smoke-"));
  const missingCliPath = path.join(tempRoot, "missing-cli.js");

  try {
    const badCliServer = startServer(["--allow-root", repoRoot, "--timeout-ms", "20000", "--cli", missingCliPath]);

    try {
      const initialized = await badCliServer.request("initialize", {
        protocolVersion,
        capabilities: {},
        clientInfo: { name: "axiom-mcp-smoke", version: "0" }
      });
      assertNoJsonRpcError(initialized, "bad-cli initialize");

      const badCli = await callTool(badCliServer, "axiom_observe", {
        root: repoRoot
      });
      assertNoJsonRpcError(badCli, "bad-cli tool response");
      assertEqual(badCli.result?.isError, true, "bad-cli tool error flag");
      assertEqual(badCli.result?.structuredContent?.summary?.kind, "tool_error", "bad-cli summary kind");
      assertEqual(badCli.result?.structuredContent?.tool, "axiom_observe", "bad-cli tool name");
      assertEqual(badCli.result?.structuredContent?.exitCode, 1, "bad-cli exit code");
      assertTextIncludes(
        badCli.result?.structuredContent?.error?.message ?? "",
        "unexpected status 1",
        "bad-cli tool error message"
      );
      assertTextIncludes(
        badCli.result?.structuredContent?.error?.stderr ?? "",
        "Cannot find module",
        "bad-cli stderr"
      );
    } finally {
      await badCliServer.close();
    }

    const slowCliPath = path.join(tempRoot, "slow-cli.js");
    writeFileSync(slowCliPath, "setTimeout(() => {}, 10000);\n", "utf8");
    const timeoutServer = startServer(["--allow-root", repoRoot, "--timeout-ms", "50", "--cli", slowCliPath]);

    try {
      const initialized = await timeoutServer.request("initialize", {
        protocolVersion,
        capabilities: {},
        clientInfo: { name: "axiom-mcp-smoke", version: "0" }
      });
      assertNoJsonRpcError(initialized, "timeout initialize");

      const timedOut = await callTool(timeoutServer, "axiom_observe", {
        root: repoRoot
      });
      assertNoJsonRpcError(timedOut, "timeout tool response");
      assertEqual(timedOut.result?.isError, true, "timeout tool error flag");
      assertEqual(timedOut.result?.structuredContent?.summary?.kind, "tool_error", "timeout summary kind");
      assertEqual(timedOut.result?.structuredContent?.tool, "axiom_observe", "timeout tool name");
      assertEqual(timedOut.result?.structuredContent?.exitCode, 124, "timeout exit code");
      assertTextIncludes(
        timedOut.result?.structuredContent?.error?.message ?? "",
        "unexpected status 124",
        "timeout tool error message"
      );
      assertTextIncludes(
        timedOut.result?.structuredContent?.error?.stderr ?? "",
        "timed out after 50ms",
        "timeout stderr"
      );
    } finally {
      await timeoutServer.close();
    }
  } finally {
    rmSync(tempRoot, { force: true, recursive: true });
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
