import { spawn } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import readline from "node:readline";

const repoRoot = process.cwd();
const serverPath = path.join(repoRoot, "dist/mcp/server.js");
const exampleRoot = path.join(repoRoot, "examples/spec-first-pilot");

if (!existsSync(serverPath)) {
  console.error("dist/mcp/server.js was not found. Run npm run build before MCP agent-loop smoke.");
  process.exit(1);
}

const protocolVersion = "2025-11-25";

async function main() {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "axiom-mcp-agent-loop-"));
  const projectRoot = path.join(tempRoot, "project");

  try {
    copyDirectory(exampleRoot, projectRoot);

    const baselinePath = path.join(projectRoot, ".axi", "baselines", "current.graph.json");
    mkdirSync(path.dirname(baselinePath), { recursive: true });

    const server = startServer(["--allow-root", projectRoot, "--timeout-ms", "20000"]);

    try {
      await initializeServer(server);
      await verifyToolSurface(server, projectRoot);
      await verifyCleanGate(server, projectRoot);
      await createBaseline(server, projectRoot, baselinePath);
      introduceDrift(projectRoot);
      await verifyDriftEvidence(server, projectRoot, baselinePath);
      await verifyInferenceEvidence(server, projectRoot);
      await verifyInferredObserveEvidence(server, projectRoot);
    } finally {
      await server.close();
    }

    console.log("MCP agent-loop smoke passed.");
    console.log("- confirmed allowed roots before scanning");
    console.log("- verified clean spec-first contract through axiom_check");
    console.log("- saved an explicit graph baseline under the temp project");
    console.log("- introduced hidden import and outward layer drift in temp only");
    console.log("- verified axiom_check hard violations, observe review evidence, diff drift, and infer authoring evidence");
    console.log("- verified infer-to-observe temporary review evidence without writing a contract into the temp project");
  } finally {
    rmSync(tempRoot, { force: true, recursive: true });
  }
}

async function initializeServer(server) {
  const initialized = await server.request("initialize", {
    protocolVersion,
    capabilities: {},
    clientInfo: { name: "axiom-mcp-agent-loop-smoke", version: "0" }
  });
  assertNoJsonRpcError(initialized, "initialize");
  assertEqual(initialized.result?.protocolVersion, protocolVersion, "protocol version");
  server.notify("notifications/initialized", {});
}

async function verifyToolSurface(server, projectRoot) {
  const tools = await server.request("tools/list", {});
  assertNoJsonRpcError(tools, "tools/list");
  assertEqual(tools.result?.tools?.length, 7, "tool count");
  assertEqual(
    tools.result?.tools?.every((tool) => tool.annotations?.readOnlyHint === true),
    true,
    "all tools are read-only"
  );

  const roots = await callTool(server, "axiom_roots", {});
  assertNoJsonRpcError(roots, "axiom_roots");
  assertEqual(roots.result?.structuredContent?.summary?.kind, "roots", "roots summary kind");
  assertDeepEqual(
    roots.result?.structuredContent?.payload?.allowedRoots,
    [path.normalize(projectRoot)],
    "allowed roots payload"
  );
}

async function verifyCleanGate(server, projectRoot) {
  const cleanCheck = await callTool(server, "axiom_check", {
    root: projectRoot
  });
  assertNoJsonRpcError(cleanCheck, "clean axiom_check");
  assertEqual(cleanCheck.result?.isError, undefined, "clean check tool error");
  assertEqual(cleanCheck.result?.structuredContent?.summary?.kind, "check", "clean check summary kind");
  assertEqual(cleanCheck.result?.structuredContent?.summary?.gate?.currentCommandIsGate, true, "clean check is gate");
  assertEqual(cleanCheck.result?.structuredContent?.payload?.ok, true, "clean check ok");
  assertEqual(cleanCheck.result?.structuredContent?.payload?.summary?.violations, 0, "clean hard violations");
}

async function createBaseline(server, projectRoot, baselinePath) {
  const graph = await callTool(server, "axiom_graph", {
    portable: true,
    root: projectRoot
  });
  assertNoJsonRpcError(graph, "baseline graph");
  assertEqual(graph.result?.structuredContent?.summary?.kind, "review", "baseline graph summary kind");
  assertEqual(
    graph.result?.structuredContent?.payload?.architectureSummary?.gate?.currentCommandIsGate,
    false,
    "baseline graph is not gate"
  );
  assertTextIncludes(
    graph.result?.structuredContent?.summary?.agentHint ?? "",
    "did not save or update a baseline",
    "baseline graph portable agent hint"
  );
  assertEqual(graph.result?.structuredContent?.payload?.root, ".", "baseline graph portable root");
  assertEqual(graph.result?.structuredContent?.payload?.artifact?.kind, "graph_baseline", "baseline graph artifact kind");
  assertEqual(graph.result?.structuredContent?.payload?.artifact?.pathMode, "portable", "baseline graph artifact path mode");
  writeFileSync(baselinePath, JSON.stringify(graph.result?.structuredContent?.payload), "utf8");
}

function introduceDrift(projectRoot) {
  writeFileSync(
    path.join(projectRoot, "src", "ui", "debugPanel.ts"),
    [
      'import { readUserRecord } from "../application/internal/persistence";',
      "",
      "export function renderDebugPanel(): string {",
      "  return readUserRecord().id;",
      "}",
      ""
    ].join("\n"),
    "utf8"
  );

  writeFileSync(
    path.join(projectRoot, "src", "domain", "renderLeak.ts"),
    [
      'import { renderDashboard } from "../ui/view";',
      "",
      "export const leakedRenderer = renderDashboard;",
      ""
    ].join("\n"),
    "utf8"
  );
}

async function verifyDriftEvidence(server, projectRoot, baselinePath) {
  const failedCheck = await callTool(server, "axiom_check", {
    root: projectRoot
  });
  assertNoJsonRpcError(failedCheck, "failing axiom_check");
  assertEqual(failedCheck.result?.isError, undefined, "failing check tool error");
  assertEqual(failedCheck.result?.structuredContent?.exitCode, 1, "failing check exit code");
  assertEqual(failedCheck.result?.structuredContent?.summary?.ok, false, "failing check summary ok");
  assertSetIncludes(violationCodes(failedCheck), "hidden_import", "hidden import hard violation");
  assertSetIncludes(violationCodes(failedCheck), "layer_breach", "layer breach hard violation");
  assertSetIncludes(violationLocations(failedCheck), "src/ui/debugPanel.ts", "hidden import location");
  assertSetIncludes(violationLocations(failedCheck), "src/domain/renderLeak.ts", "layer breach location");

  const observe = await callTool(server, "axiom_observe", {
    baselinePath,
    root: projectRoot
  });
  assertNoJsonRpcError(observe, "axiom_observe");
  assertEqual(observe.result?.isError, undefined, "observe tool error");
  assertEqual(observe.result?.structuredContent?.summary?.kind, "review", "observe summary kind");
  assertEqual(observe.result?.structuredContent?.summary?.gate?.currentCommandIsGate, false, "observe is not gate");
  assertEqual(observe.result?.structuredContent?.payload?.architectureSummary?.status, "failing_contract", "observe status");
  assertMin(observe.result?.structuredContent?.summary?.drift?.newObservedEdges ?? 0, 1, "observe new drift edges");

  const diff = await callTool(server, "axiom_diff", {
    baselinePath,
    root: projectRoot
  });
  assertNoJsonRpcError(diff, "axiom_diff");
  assertEqual(diff.result?.isError, undefined, "diff tool error");
  assertEqual(diff.result?.structuredContent?.summary?.kind, "review", "diff summary kind");
  assertEqual(diff.result?.structuredContent?.summary?.drift?.kind, "advisory_observed_edge_drift", "diff drift kind");
  assertMin(diff.result?.structuredContent?.summary?.drift?.newObservedEdges ?? 0, 1, "diff new drift edges");
}

async function verifyInferenceEvidence(server, projectRoot) {
  const infer = await callTool(server, "axiom_infer_contract", {
    root: projectRoot
  });
  assertNoJsonRpcError(infer, "axiom_infer_contract");
  assertEqual(infer.result?.isError, undefined, "infer tool error");
  assertEqual(infer.result?.structuredContent?.summary?.kind, "inference", "infer summary kind");
  assertTextIncludes(infer.result?.structuredContent?.payload?.axi ?? "", "module", "inferred contract text");
  assertTextIncludes(
    infer.result?.structuredContent?.summary?.agentHint ?? "",
    "not declared architecture intent",
    "infer agent hint"
  );
}

async function verifyInferredObserveEvidence(server, projectRoot) {
  const inferredObserve = await callTool(server, "axiom_observe_inferred_contract", {
    root: projectRoot,
    warnings: {
      deepInternalImports: true,
      largeFiles: true
    }
  });
  assertNoJsonRpcError(inferredObserve, "axiom_observe_inferred_contract");
  assertEqual(inferredObserve.result?.isError, undefined, "inferred observe tool error");
  assertEqual(inferredObserve.result?.structuredContent?.schemaVersion, "axiom.mcp.infer_observe.v1", "inferred observe schema");
  assertEqual(inferredObserve.result?.structuredContent?.summary?.kind, "review", "inferred observe summary kind");
  assertEqual(
    inferredObserve.result?.structuredContent?.summary?.gate?.currentCommandIsGate,
    false,
    "inferred observe is not gate"
  );
  assertEqual(
    inferredObserve.result?.structuredContent?.payload?.contractSource?.persisted,
    false,
    "inferred observe contract persisted flag"
  );
  assertEqual(
    inferredObserve.result?.structuredContent?.payload?.inference?.starterContract?.kind,
    "current_graph_snapshot",
    "inferred observe inference payload"
  );
  assertEqual(
    inferredObserve.result?.structuredContent?.payload?.observe?.schemaVersion,
    "axiom.graph.v12",
    "inferred observe observe payload"
  );
}

function violationCodes(response) {
  return new Set((response.result?.structuredContent?.payload?.violations ?? []).map((violation) => violation.code));
}

function violationLocations(response) {
  return new Set(
    (response.result?.structuredContent?.payload?.violations ?? [])
      .map((violation) => violation.location?.filePath)
      .filter(Boolean)
  );
}

function copyDirectory(source, target) {
  mkdirSync(target, { recursive: true });

  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
      continue;
    }

    if (entry.isFile()) {
      writeFileSync(targetPath, readFileSync(sourcePath));
    }
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

function assertDeepEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Expected ${label} to be ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
  }
}

function assertMin(actual, minimum, label) {
  if (typeof actual !== "number" || actual < minimum) {
    throw new Error(`Expected ${label} to be >= ${minimum}, got ${JSON.stringify(actual)}.`);
  }
}

function assertSetIncludes(values, expected, label) {
  if (!values.has(expected)) {
    throw new Error(`Expected ${label} to include ${JSON.stringify(expected)}.`);
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
