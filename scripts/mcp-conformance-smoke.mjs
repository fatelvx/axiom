import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
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
const pythonPackageExampleRoot = path.join(repoRoot, "examples/spec-first-python-package-pilot");
const protocolVersion = "2025-11-25";
const mcpToolTimeoutMs = 60_000;
const expectedToolNames = [
  "axiom_roots",
  "axiom_check",
  "axiom_observe",
  "axiom_graph",
  "axiom_diff",
  "axiom_infer_contract",
  "axiom_observe_inferred_contract"
];
const writeToolNamePattern = /(accept|approve|edit|fix|mutate|repair|rewrite|update|write)/i;

if (!existsSync(serverPath)) {
  console.error("dist/mcp/server.js was not found. Run npm run build before MCP conformance smoke.");
  process.exit(1);
}

async function main() {
  const tempRoot = mkdtempSync(path.join(tmpdir(), "axiom-mcp-conformance-"));
  const projectRoot = path.join(tempRoot, "project");
  const pythonPackageRoot = path.join(tempRoot, "python-package-project");
  const outsideRoot = path.join(tempRoot, "outside-target");
  const baselinePath = path.join(projectRoot, ".axi", "baselines", "current.graph.json");

  try {
    copyDirectory(exampleRoot, projectRoot);
    copyDirectory(pythonPackageExampleRoot, pythonPackageRoot);
    addLiteralDynamicImportProbe(projectRoot);
    mkdirSync(path.dirname(baselinePath), { recursive: true });

    const server = startServer([
      "--allow-root",
      projectRoot,
      "--allow-root",
      pythonPackageRoot,
      "--timeout-ms",
      String(mcpToolTimeoutMs)
    ]);

    try {
      await initializeServer(server);
      await verifyToolSurface(server);
      await verifyRootsFirstPolicy(server, [projectRoot, pythonPackageRoot], outsideRoot);
      await verifyCleanCheckGate(server, projectRoot);
      await verifyObservedImportKindEvidence(server, projectRoot);
      await verifyPythonPackageCheckGate(server, pythonPackageRoot);

      await writeBaseline(server, projectRoot, baselinePath);
      const baselineHashBefore = hashFile(baselinePath);
      introduceDrift(projectRoot);

      await verifyFailingCheckGate(server, projectRoot);
      await verifyObserveAndDiffAreReviewEvidence(server, projectRoot, baselinePath);
      await verifyInferenceIsAuthoringEvidence(server, projectRoot);
      await verifyInferredObserveIsTemporaryReviewEvidence(server, projectRoot);
      assertEqual(hashFile(baselinePath), baselineHashBefore, "baseline remains unchanged");
    } finally {
      await server.close();
    }

    console.log("MCP conformance smoke passed.");
    console.log("- exposed the expected seven read-only Axiom MCP tools");
    console.log("- enforced roots-first handling and outside-root rejection");
    console.log("- treated axiom_check as the hard gate");
    console.log("- treated observe, graph, and diff as advisory review evidence");
    console.log("- treated infer output as authoring evidence, not declared intent");
    console.log("- verified infer module-edge counts stay distinct from import-site evidence");
    console.log("- treated infer-to-observe output as temporary inferred review evidence");
    console.log("- verified literal dynamic imports as observed import-kind evidence, not dynamic warnings or rules");
    console.log("- verified Python package-layout evidence flows through the MCP hard gate");
    console.log("- left the explicit graph baseline unchanged during review");
  } finally {
    rmSync(tempRoot, { force: true, recursive: true });
  }
}

function addLiteralDynamicImportProbe(projectRoot) {
  writeFileSync(
    path.join(projectRoot, "src", "ui", "lazyApplication.ts"),
    [
      "export async function loadDashboardUserName(): Promise<string> {",
      '  const application = await import("../application");',
      "  return application.getDashboardUser().name;",
      "}",
      ""
    ].join("\n"),
    "utf8"
  );
}

async function initializeServer(server) {
  const initialized = await server.request("initialize", {
    protocolVersion,
    capabilities: {},
    clientInfo: { name: "axiom-mcp-conformance-smoke", version: "0" }
  });
  assertNoJsonRpcError(initialized, "initialize");
  assertEqual(initialized.result?.protocolVersion, protocolVersion, "protocol version");
  server.notify("notifications/initialized", {});
}

async function verifyToolSurface(server) {
  const tools = await server.request("tools/list", {});
  assertNoJsonRpcError(tools, "tools/list");

  const actualNames = (tools.result?.tools ?? []).map((tool) => tool.name).sort();
  assertDeepEqual(actualNames, [...expectedToolNames].sort(), "tool names");

  for (const tool of tools.result?.tools ?? []) {
    assertEqual(tool.annotations?.readOnlyHint, true, `${tool.name} readOnlyHint`);
    assertEqual(tool.annotations?.destructiveHint, false, `${tool.name} destructiveHint`);
    assertEqual(tool.annotations?.openWorldHint, false, `${tool.name} openWorldHint`);
    assertEqual(writeToolNamePattern.test(tool.name), false, `${tool.name} is not a write tool name`);
    assertEqual(tool.inputSchema?.type, "object", `${tool.name} input schema`);
    assertEqual(tool.outputSchema?.type, "object", `${tool.name} output schema`);
  }
}

async function verifyRootsFirstPolicy(server, allowedProjectRoots, outsideRoot) {
  const roots = await callTool(server, "axiom_roots", {});
  assertNoJsonRpcError(roots, "axiom_roots");
  assertEqual(roots.result?.isError, undefined, "roots tool error");
  assertEqual(roots.result?.structuredContent?.summary?.kind, "roots", "roots summary kind");
  assertEqual(
    roots.result?.structuredContent?.summary?.counts?.allowedRoots,
    allowedProjectRoots.length,
    "allowed roots count"
  );
  assertDeepEqual(
    normalizePaths(roots.result?.structuredContent?.payload?.allowedRoots ?? []),
    normalizePaths(allowedProjectRoots),
    "allowed roots payload"
  );

  const decision = rootPolicyDecision(roots.result?.structuredContent?.payload?.allowedRoots ?? [], outsideRoot);
  assertEqual(decision, "ask_human_to_reregister", "outside-root agent decision");

  const rejected = await callTool(server, "axiom_check", {
    root: outsideRoot
  });
  assertEqual(rejected.error?.code, -32602, "outside-root rejection code");
  assertTextIncludes(rejected.error?.message ?? "", "outside allowed MCP roots", "outside-root rejection message");
}

async function verifyPythonPackageCheckGate(server, pythonPackageRoot) {
  const cleanCheck = await callTool(server, "axiom_check", {
    root: pythonPackageRoot
  });
  assertNoJsonRpcError(cleanCheck, "clean Python package axiom_check");
  assertEqual(cleanCheck.result?.isError, undefined, "clean Python package check tool error");
  assertEqual(cleanCheck.result?.structuredContent?.exitCode, 0, "clean Python package check exit code");
  assertEqual(cleanCheck.result?.structuredContent?.summary?.kind, "check", "clean Python package summary kind");
  assertEqual(
    cleanCheck.result?.structuredContent?.summary?.gate?.currentCommandIsGate,
    true,
    "clean Python package check is gate"
  );
  assertEqual(cleanCheck.result?.structuredContent?.payload?.summary?.modules, 4, "Python package module count");
  assertEqual(
    cleanCheck.result?.structuredContent?.payload?.summary?.violations,
    0,
    "clean Python package hard violations"
  );
  assertObservedDependency(
    cleanCheck,
    {
      filePath: "app/main.py",
      fromModule: "AppEntry",
      toModule: "Services",
      specifier: ".services.pricing"
    },
    "MCP Python package entry-to-services evidence"
  );
  assertObservedDependency(
    cleanCheck,
    {
      filePath: "app/ui/presenter.py",
      fromModule: "Ui",
      toModule: "Domain",
      specifier: "..domain"
    },
    "MCP Python package ui-to-domain evidence"
  );

  writeFileSync(
    path.join(pythonPackageRoot, "app", "ui", "presenter.py"),
    [
      "from ..domain import Order",
      "from ..services.pricing import quote_order",
      "",
      "",
      "def render_order(order: Order) -> str:",
      "    preview = quote_order(order.symbol)",
      "    return f\"{preview.symbol}: {preview.price}\"",
      ""
    ].join("\n"),
    "utf8"
  );

  const failedCheck = await callTool(server, "axiom_check", {
    root: pythonPackageRoot
  });
  assertNoJsonRpcError(failedCheck, "failing Python package axiom_check");
  assertEqual(failedCheck.result?.isError, undefined, "failing Python package check tool error");
  assertEqual(failedCheck.result?.structuredContent?.exitCode, 1, "failing Python package check exit code");
  assertEqual(
    failedCheck.result?.structuredContent?.summary?.gate?.currentCommandIsGate,
    true,
    "failing Python package check is gate"
  );
  assertSetIncludes(violationCodes(failedCheck), "undeclared_dependency", "Python package boundary hard violation");
  assertSetIncludes(violationLocations(failedCheck), "app/ui/presenter.py", "Python package boundary violation location");
}

async function verifyCleanCheckGate(server, projectRoot) {
  const cleanCheck = await callTool(server, "axiom_check", {
    root: projectRoot
  });
  assertNoJsonRpcError(cleanCheck, "clean axiom_check");
  assertEqual(cleanCheck.result?.isError, undefined, "clean check tool error");
  assertEqual(cleanCheck.result?.structuredContent?.exitCode, 0, "clean check exit code");
  assertEqual(cleanCheck.result?.structuredContent?.summary?.kind, "check", "clean check summary kind");
  assertEqual(cleanCheck.result?.structuredContent?.summary?.gate?.currentCommandIsGate, true, "clean check is gate");
  assertEqual(cleanCheck.result?.structuredContent?.summary?.gate?.hardViolationsFailCheck, true, "clean check hard gate");
  assertEqual(cleanCheck.result?.structuredContent?.summary?.ok, true, "clean check summary ok");
  assertEqual(cleanCheck.result?.structuredContent?.payload?.ok, true, "clean check payload ok");
  assertEqual(cleanCheck.result?.structuredContent?.payload?.summary?.violations, 0, "clean hard violations");
  assertObservedImportKind(
    cleanCheck,
    "src/ui/lazyApplication.ts",
    "dynamic_import",
    "clean check literal dynamic import evidence"
  );
}

async function verifyObservedImportKindEvidence(server, projectRoot) {
  const graph = await callTool(server, "axiom_graph", {
    root: projectRoot
  });
  assertNoJsonRpcError(graph, "import-kind graph");
  assertEqual(graph.result?.isError, undefined, "import-kind graph tool error");
  assertEqual(graph.result?.structuredContent?.summary?.kind, "review", "import-kind graph summary kind");
  assertEqual(
    graph.result?.structuredContent?.summary?.gate?.currentCommandIsGate,
    false,
    "import-kind graph is not gate"
  );
  assertObservedImportKind(
    graph,
    "src/ui/lazyApplication.ts",
    "dynamic_import",
    "graph literal dynamic import evidence"
  );

  const observe = await callTool(server, "axiom_observe", {
    root: projectRoot,
    warnings: {
      dynamicImports: true
    }
  });
  assertNoJsonRpcError(observe, "import-kind observe");
  assertEqual(observe.result?.isError, undefined, "import-kind observe tool error");
  assertEqual(observe.result?.structuredContent?.summary?.kind, "review", "import-kind observe summary kind");
  assertObservedImportKind(
    observe,
    "src/ui/lazyApplication.ts",
    "dynamic_import",
    "observe literal dynamic import evidence"
  );
  assertArrayIncludes(
    observe.result?.structuredContent?.summary?.advisorySignalCoverage?.checkedNoFindings ?? [],
    "non-literal dynamic dependency expressions",
    "observe dynamic warning coverage remains about non-literal expressions"
  );
  assertCoverageEntryStatus(observe, "dynamicImports", "checked_no_findings", "observe dynamic warning coverage payload");
}

async function writeBaseline(server, projectRoot, baselinePath) {
  const graph = await callTool(server, "axiom_graph", {
    portable: true,
    root: projectRoot
  });
  assertNoJsonRpcError(graph, "baseline graph");
  assertEqual(graph.result?.isError, undefined, "baseline graph tool error");
  assertEqual(graph.result?.structuredContent?.summary?.kind, "review", "baseline graph summary kind");
  assertEqual(graph.result?.structuredContent?.summary?.gate?.currentCommandIsGate, false, "baseline graph is not gate");
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

async function verifyFailingCheckGate(server, projectRoot) {
  const failedCheck = await callTool(server, "axiom_check", {
    root: projectRoot
  });
  assertNoJsonRpcError(failedCheck, "failing axiom_check");
  assertEqual(failedCheck.result?.isError, undefined, "failing check tool error");
  assertEqual(failedCheck.result?.structuredContent?.exitCode, 1, "failing check exit code");
  assertEqual(failedCheck.result?.structuredContent?.summary?.kind, "check", "failing check summary kind");
  assertEqual(failedCheck.result?.structuredContent?.summary?.gate?.currentCommandIsGate, true, "failing check is gate");
  assertEqual(failedCheck.result?.structuredContent?.summary?.ok, false, "failing check summary ok");
  assertEqual(failedCheck.result?.structuredContent?.payload?.ok, false, "failing check payload ok");
  assertSetIncludes(violationCodes(failedCheck), "hidden_import", "hidden import hard violation");
  assertSetIncludes(violationCodes(failedCheck), "layer_breach", "layer breach hard violation");
  assertSetIncludes(violationLocations(failedCheck), "src/ui/debugPanel.ts", "hidden import location");
  assertSetIncludes(violationLocations(failedCheck), "src/domain/renderLeak.ts", "layer breach location");
}

async function verifyObserveAndDiffAreReviewEvidence(server, projectRoot, baselinePath) {
  const observe = await callTool(server, "axiom_observe", {
    baselinePath,
    root: projectRoot
  });
  assertNoJsonRpcError(observe, "axiom_observe");
  assertEqual(observe.result?.isError, undefined, "observe tool error");
  assertEqual(observe.result?.structuredContent?.summary?.kind, "review", "observe summary kind");
  assertEqual(observe.result?.structuredContent?.summary?.gate?.currentCommandIsGate, false, "observe is not gate");
  assertEqual(
    observe.result?.structuredContent?.payload?.architectureSummary?.gate?.currentCommandIsGate,
    false,
    "observe architecture summary is not gate"
  );
  assertEqual(observe.result?.structuredContent?.payload?.architectureSummary?.status, "failing_contract", "observe status");
  assertMin(observe.result?.structuredContent?.summary?.drift?.newObservedEdges ?? 0, 1, "observe new drift edges");
  assertTextIncludes(
    observe.result?.structuredContent?.summary?.agentHint ?? "",
    "advisory review evidence",
    "observe agent hint"
  );
  assertTextIncludes(
    observe.result?.structuredContent?.summary?.agentHint ?? "",
    "do not refactor solely to reduce signal counts",
    "observe warning guardrail"
  );

  const diff = await callTool(server, "axiom_diff", {
    baselinePath,
    root: projectRoot
  });
  assertNoJsonRpcError(diff, "axiom_diff");
  assertEqual(diff.result?.isError, undefined, "diff tool error");
  assertEqual(diff.result?.structuredContent?.summary?.kind, "review", "diff summary kind");
  assertEqual(diff.result?.structuredContent?.summary?.drift?.kind, "advisory_observed_edge_drift", "diff drift kind");
  assertMin(diff.result?.structuredContent?.summary?.drift?.newObservedEdges ?? 0, 1, "diff new drift edges");
  assertTextIncludes(diff.result?.structuredContent?.summary?.agentHint ?? "", "advisory review evidence", "diff agent hint");
  assertTextIncludes(
    diff.result?.structuredContent?.summary?.agentHint ?? "",
    "do not refactor solely to reduce signal counts",
    "diff warning guardrail"
  );
}

async function verifyInferenceIsAuthoringEvidence(server, projectRoot) {
  const infer = await callTool(server, "axiom_infer_contract", {
    root: projectRoot
  });
  assertNoJsonRpcError(infer, "axiom_infer_contract");
  assertEqual(infer.result?.isError, undefined, "infer tool error");
  assertEqual(infer.result?.structuredContent?.summary?.kind, "inference", "infer summary kind");
  assertEqual(infer.result?.structuredContent?.payload?.starterContract?.kind, "current_graph_snapshot", "infer starter kind");
  assertTextIncludes(infer.result?.structuredContent?.payload?.axi ?? "", "module", "inferred contract text");
  assertArrayTextIncludes(
    infer.result?.structuredContent?.payload?.starterContract?.notice ?? [],
    "not a recommended architecture",
    "infer starter notice"
  );
  assertTextIncludes(
    infer.result?.structuredContent?.summary?.agentHint ?? "",
    "not declared architecture intent",
    "infer agent hint"
  );
  assertInferenceCountSemantics(
    infer.result?.structuredContent?.payload,
    infer.result?.structuredContent?.summary?.counts,
    "infer authoring evidence"
  );
}

async function verifyInferredObserveIsTemporaryReviewEvidence(server, projectRoot) {
  const inferredObserve = await callTool(server, "axiom_observe_inferred_contract", {
    root: projectRoot,
    warnings: {
      deepInternalImports: true,
      dynamicImports: true,
      unresolvedImports: true,
      largeFiles: true
    }
  });
  assertNoJsonRpcError(inferredObserve, "axiom_observe_inferred_contract");
  assertEqual(inferredObserve.result?.isError, undefined, "inferred observe tool error");
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
  assertTextIncludes(
    inferredObserve.result?.structuredContent?.summary?.agentHint ?? "",
    "not declared architecture intent",
    "inferred observe agent hint"
  );
  assertTextIncludes(
    inferredObserve.result?.structuredContent?.summary?.agentHint ?? "",
    "do not refactor solely to reduce signal counts",
    "inferred observe warning guardrail"
  );
  assertArrayIncludes(
    inferredObserve.result?.structuredContent?.summary?.advisorySignalCoverage?.checkedNoFindings ?? [],
    "non-literal dynamic dependency expressions",
    "inferred observe dynamic coverage summary"
  );
  assertArrayIncludes(
    inferredObserve.result?.structuredContent?.summary?.advisorySignalCoverage?.checkedNoFindings ?? [],
    "unresolved static imports",
    "inferred observe unresolved coverage summary"
  );
  assertTextIncludes(
    inferredObserve.result?.structuredContent?.summary?.advisorySignalCoverage?.caveat ?? "",
    "not proof of semantic architecture health",
    "inferred observe coverage caveat"
  );
  assertCoverageEntryStatus(
    inferredObserve,
    "dynamicImports",
    "checked_no_findings",
    "inferred observe dynamic coverage payload"
  );
  assertCoverageEntryStatus(
    inferredObserve,
    "unresolvedImports",
    "checked_no_findings",
    "inferred observe unresolved coverage payload"
  );
  assertEqual(
    inferredObserve.result?.structuredContent?.payload?.inference?.starterContract?.kind,
    "current_graph_snapshot",
    "inferred observe starter contract kind"
  );
  assertInferenceCountSemantics(
    inferredObserve.result?.structuredContent?.payload?.inference,
    inferredObserve.result?.structuredContent?.summary?.counts,
    "temporary inferred observe evidence"
  );
  assertEqual(
    inferredObserve.result?.structuredContent?.payload?.observe?.architectureSummary?.gate?.currentCommandIsGate,
    false,
    "inferred observe payload gate"
  );
}

function rootPolicyDecision(allowedRoots, requestedRoot) {
  return normalizePaths(allowedRoots).some((allowedRoot) => isInsidePath(normalizePath(requestedRoot), allowedRoot))
    ? "scan_allowed"
    : "ask_human_to_reregister";
}

function isInsidePath(candidate, allowedRoot) {
  const relative = path.relative(allowedRoot, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
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

function observedDependencies(response) {
  const payload = response.result?.structuredContent?.payload ?? {};
  return payload.allObservedDependencies ?? payload.observedDependencies ?? [];
}

function assertInferenceCountSemantics(inferencePayload, mcpCounts, label) {
  const summary = inferencePayload?.summary ?? {};
  const dependencies = inferencePayload?.observedDependencies ?? [];
  const observedModuleEdges = summary.observedModuleEdges;
  const observedImportSites = summary.observedImportSites;

  assertEqual(summary.observedDependencies, observedModuleEdges, `${label} compatibility observedDependencies alias`);
  assertEqual(observedModuleEdges, dependencies.length, `${label} observed module-edge count`);
  assertEqual(observedImportSites, countInferredImportSites(dependencies), `${label} observed import-site count`);
  assertMin(observedImportSites, observedModuleEdges, `${label} import sites cover module edges`);

  assertEqual(mcpCounts?.observedModuleEdges, observedModuleEdges, `${label} MCP summary module-edge count`);
  assertEqual(mcpCounts?.observedImportSites, observedImportSites, `${label} MCP summary import-site count`);
}

function countInferredImportSites(dependencies) {
  if (!Array.isArray(dependencies)) {
    throw new Error(`Expected inferred observedDependencies to be an array, got ${JSON.stringify(dependencies)}.`);
  }

  return dependencies.reduce((total, dependency) => {
    if (typeof dependency?.count !== "number" || !Number.isFinite(dependency.count)) {
      throw new Error(`Expected inferred dependency count to be a number, got ${JSON.stringify(dependency)}.`);
    }

    return total + dependency.count;
  }, 0);
}

function assertObservedImportKind(response, filePath, expectedKind, label) {
  const dependency = observedDependencies(response).find(
    (candidate) => candidate?.import?.filePath === filePath && candidate?.import?.kind === expectedKind
  );

  if (!dependency) {
    throw new Error(
      `Expected ${label} to include ${JSON.stringify(filePath)} with import.kind ${JSON.stringify(
        expectedKind
      )}.\nActual dependencies:\n${JSON.stringify(observedDependencies(response), null, 2)}`
    );
  }

  assertEqual(dependency.import.specifier, "../application", `${label} specifier`);
}

function assertObservedDependency(response, expected, label) {
  const dependency = observedDependencies(response).find(
    (candidate) =>
      candidate?.fromModule === expected.fromModule &&
      candidate?.toModule === expected.toModule &&
      candidate?.import?.filePath === expected.filePath &&
      candidate?.import?.specifier === expected.specifier
  );

  if (!dependency) {
    throw new Error(
      `Expected ${label} to include ${JSON.stringify(expected)}.\nActual dependencies:\n${JSON.stringify(
        observedDependencies(response),
        null,
        2
      )}`
    );
  }
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

function hashFile(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
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
    const operation =
      method === "tools/call" && typeof params?.name === "string" ? `${method} ${params.name}` : method;

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.#pending.delete(id);
        reject(new Error(`Timed out waiting for ${operation}. stderr:\n${this.#stderrChunks.join("")}`));
      }, mcpToolTimeoutMs);

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

function normalizePath(value) {
  return path.normalize(value);
}

function normalizePaths(values) {
  return values.map((value) => normalizePath(value));
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

function assertArrayIncludes(values, expected, label) {
  if (!Array.isArray(values) || !values.includes(expected)) {
    throw new Error(`Expected ${label} to include ${JSON.stringify(expected)}.\nActual values:\n${JSON.stringify(values)}`);
  }
}

function assertCoverageEntryStatus(response, family, expectedStatus, label) {
  const payload = response.result?.structuredContent?.payload ?? {};
  const coverage =
    payload.observe?.architectureSummary?.advisorySignalCoverage ??
    payload.architectureSummary?.advisorySignalCoverage;
  const entries = coverage?.enabledFamilies ?? [];
  const entry = Array.isArray(entries) ? entries.find((candidate) => candidate?.family === family) : undefined;

  if (!entry) {
    throw new Error(`Expected ${label} to include advisory coverage family ${JSON.stringify(family)}.`);
  }

  assertEqual(entry.status, expectedStatus, label);
}

function assertTextIncludes(text, expected, label) {
  if (!text.includes(expected)) {
    throw new Error(`Expected ${label} to include ${JSON.stringify(expected)}.\nActual output:\n${text}`);
  }
}

function assertArrayTextIncludes(values, expected, label) {
  if (!Array.isArray(values) || !values.some((value) => typeof value === "string" && value.includes(expected))) {
    throw new Error(`Expected ${label} to include text ${JSON.stringify(expected)}.\nActual values:\n${JSON.stringify(values)}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
