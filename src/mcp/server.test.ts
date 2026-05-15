import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import test from "node:test";

const repoRoot = process.cwd();
const serverPath = path.join(repoRoot, "dist/mcp/server.js");

test("mcp stdio server initializes, lists tools, and calls read-only tools", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "axiom-mcp-baseline-"));
  const baselinePath = path.join(tempRoot, "baseline.graph.json");
  const server = startServer(["--allow-root", repoRoot, "--allow-root", tempRoot, "--timeout-ms", "20000"]);

  try {
    const initialized = await server.request("initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "axiom-test", version: "0" }
    });
    assert.equal(initialized.result?.protocolVersion, "2025-11-25");
    assert.equal(initialized.result?.capabilities?.tools?.listChanged, false);

    server.notify("notifications/initialized", {});

    const tools = await server.request("tools/list", {});
    assert.equal(tools.result?.tools?.length, 7);
    assert.equal(
      tools.result?.tools?.every((tool: { annotations?: { readOnlyHint?: boolean } }) => tool.annotations?.readOnlyHint === true),
      true
    );

    const roots = await server.request("tools/call", {
      name: "axiom_roots",
      arguments: {}
    });
    assert.equal(roots.result?.isError, undefined);
    assert.equal(roots.result?.structuredContent?.tool, "axiom_roots");
    assert.equal(roots.result?.structuredContent?.summary?.kind, "roots");
    assert.deepEqual(roots.result?.structuredContent?.payload?.allowedRoots, [path.normalize(repoRoot), path.normalize(tempRoot)]);

    const passingCheck = await server.request("tools/call", {
      name: "axiom_check",
      arguments: {
        root: "fixtures/basic-ts-valid"
      }
    });
    assert.equal(passingCheck.result?.isError, undefined);
    assert.equal(passingCheck.result?.structuredContent?.tool, "axiom_check");
    assert.equal(passingCheck.result?.structuredContent?.exitCode, 0);
    assert.equal(passingCheck.result?.structuredContent?.payload?.ok, true);
    assert.equal(passingCheck.result?.structuredContent?.summary?.kind, "check");
    assert.equal(passingCheck.result?.structuredContent?.summary?.gate?.currentCommandIsGate, true);

    const failingCheck = await server.request("tools/call", {
      name: "axiom_check",
      arguments: {
        root: "fixtures/basic-ts-invalid"
      }
    });
    assert.equal(failingCheck.result?.isError, undefined);
    assert.equal(failingCheck.result?.structuredContent?.exitCode, 1);
    assert.equal(failingCheck.result?.structuredContent?.payload?.ok, false);
    assert.equal(failingCheck.result?.structuredContent?.payload?.violations?.[0]?.code, "forbidden_dependency");
    assert.equal(failingCheck.result?.structuredContent?.summary?.ok, false);

    const graph = await server.request("tools/call", {
      name: "axiom_graph",
      arguments: {
        portable: true,
        root: "fixtures/basic-ts-valid"
      }
    });
    assert.equal(graph.result?.isError, undefined);
    assert.equal(graph.result?.structuredContent?.tool, "axiom_graph");
    assert.equal(graph.result?.structuredContent?.schemaVersion, "axiom.graph.v12");
    assert.equal(graph.result?.structuredContent?.payload?.root, ".");
    assert.equal(graph.result?.structuredContent?.payload?.artifact?.kind, "graph_baseline");
    assert.equal(graph.result?.structuredContent?.payload?.artifact?.pathMode, "portable");
    assert.equal(graph.result?.structuredContent?.payload?.architectureSummary?.gate?.currentCommandIsGate, false);
    assert.equal(graph.result?.structuredContent?.summary?.kind, "review");
    assert.equal(graph.result?.structuredContent?.summary?.gate?.currentCommandIsGate, false);
    assert.match(graph.result?.structuredContent?.summary?.agentHint ?? "", /did not save or update a baseline/);
    fs.writeFileSync(baselinePath, JSON.stringify(graph.result?.structuredContent?.payload), "utf8");

    const diff = await server.request("tools/call", {
      name: "axiom_diff",
      arguments: {
        baselinePath,
        root: "fixtures/basic-ts-valid"
      }
    });
    assert.equal(diff.result?.isError, undefined);
    assert.equal(diff.result?.structuredContent?.tool, "axiom_diff");
    assert.equal(diff.result?.structuredContent?.schemaVersion, "axiom.graph.v12");
    assert.equal(diff.result?.structuredContent?.payload?.drift?.kind, "advisory_observed_edge_drift");
    assert.equal(diff.result?.structuredContent?.summary?.drift?.kind, "advisory_observed_edge_drift");

    const infer = await server.request("tools/call", {
      name: "axiom_infer_contract",
      arguments: {
        root: "fixtures/basic-ts-valid"
      }
    });
    assert.equal(infer.result?.structuredContent?.schemaVersion, "axiom.infer.v8");
    assert.equal(infer.result?.structuredContent?.summary?.kind, "inference");
    assert.match(infer.result?.structuredContent?.payload?.axi ?? "", /module Physics/);

    const inferredObserve = await server.request("tools/call", {
      name: "axiom_observe_inferred_contract",
      arguments: {
        root: "fixtures/basic-ts-valid",
        warnings: {
          deepInternalImports: true
        }
      }
    });
    assert.equal(inferredObserve.result?.isError, undefined);
    assert.equal(inferredObserve.result?.structuredContent?.tool, "axiom_observe_inferred_contract");
    assert.equal(inferredObserve.result?.structuredContent?.command, "infer_observe");
    assert.equal(inferredObserve.result?.structuredContent?.schemaVersion, "axiom.mcp.infer_observe.v1");
    assert.equal(inferredObserve.result?.structuredContent?.summary?.kind, "review");
    assert.equal(inferredObserve.result?.structuredContent?.summary?.gate?.currentCommandIsGate, false);
    assert.match(inferredObserve.result?.structuredContent?.summary?.agentHint ?? "", /temporary inferred contract/);
    assert.equal(inferredObserve.result?.structuredContent?.payload?.contractSource?.persisted, false);
    assert.equal(inferredObserve.result?.structuredContent?.payload?.inference?.schemaVersion, "axiom.infer.v8");
    assert.equal(inferredObserve.result?.structuredContent?.payload?.observe?.schemaVersion, "axiom.graph.v12");
  } finally {
    try {
      await server.close();
    } finally {
      fs.rmSync(tempRoot, { force: true, recursive: true });
    }
  }
});

test("mcp stdio server rejects roots outside the configured allow list", async () => {
  const allowedRoot = path.join(repoRoot, "fixtures/basic-ts-valid");
  const server = startServer(["--allow-root", allowedRoot, "--timeout-ms", "20000"]);

  try {
    await server.request("initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "axiom-test", version: "0" }
    });

    const response = await server.request("tools/call", {
      name: "axiom_check",
      arguments: {
        root: path.join(repoRoot, "fixtures/basic-ts-invalid")
      }
    });

    assert.equal(response.error?.code, -32602);
    assert.match(response.error?.message ?? "", /outside allowed MCP roots/);
  } finally {
    await server.close();
  }
});

test("mcp stdio server returns stable JSON-RPC errors for invalid tool calls", async () => {
  const server = startServer(["--allow-root", repoRoot, "--timeout-ms", "20000"]);

  try {
    await server.request("initialize", {
      protocolVersion: "2025-11-25",
      capabilities: {},
      clientInfo: { name: "axiom-test", version: "0" }
    });

    const missingMethod = await server.request("axiom/unknown", {});
    assert.equal(missingMethod.error?.code, -32601);
    assert.match(missingMethod.error?.message ?? "", /Method not found/);

    const unknownTool = await server.request("tools/call", {
      name: "axiom_write_contract",
      arguments: {
        root: repoRoot
      }
    });
    assert.equal(unknownTool.error?.code, -32602);
    assert.match(unknownTool.error?.message ?? "", /unsupported Axiom tool/);

    const missingRoot = await server.request("tools/call", {
      name: "axiom_check",
      arguments: {}
    });
    assert.equal(missingRoot.error?.code, -32602);
    assert.match(missingRoot.error?.message ?? "", /root must be a non-empty string/);

    const rootsWithInput = await server.request("tools/call", {
      name: "axiom_roots",
      arguments: {
        root: repoRoot
      }
    });
    assert.equal(rootsWithInput.error?.code, -32602);
    assert.match(rootsWithInput.error?.message ?? "", /does not accept input fields/);

    const invalidArguments = await server.request("tools/call", {
      name: "axiom_check",
      arguments: []
    });
    assert.equal(invalidArguments.error?.code, -32602);
    assert.match(invalidArguments.error?.message ?? "", /arguments must be an object/);

    const outsideSpec = await server.request("tools/call", {
      name: "axiom_check",
      arguments: {
        root: repoRoot,
        specPaths: [path.dirname(repoRoot)]
      }
    });
    assert.equal(outsideSpec.error?.code, -32602);
    assert.match(outsideSpec.error?.message ?? "", /specPaths is outside allowed MCP roots/);

    const inferredObserveWithSpec = await server.request("tools/call", {
      name: "axiom_observe_inferred_contract",
      arguments: {
        root: repoRoot,
        specPaths: ["axiom/main.axi"]
      }
    });
    assert.equal(inferredObserveWithSpec.error?.code, -32602);
    assert.match(inferredObserveWithSpec.error?.message ?? "", /unsupported input field/);
  } finally {
    await server.close();
  }
});

test("mcp stdio server wraps CLI failures and timeouts as tool errors", async () => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "axiom-mcp-cli-failure-"));
  const missingCliPath = path.join(tempRoot, "missing-cli.js");

  try {
    const badCliServer = startServer(["--allow-root", repoRoot, "--timeout-ms", "20000", "--cli", missingCliPath]);

    try {
      await badCliServer.request("initialize", {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "axiom-test", version: "0" }
      });

      const badCli = await badCliServer.request("tools/call", {
        name: "axiom_observe",
        arguments: {
          root: repoRoot
        }
      });

      assert.equal(badCli.error, undefined);
      assert.equal(badCli.result?.isError, true);
      assert.equal(badCli.result?.structuredContent?.tool, "axiom_observe");
      assert.equal(badCli.result?.structuredContent?.exitCode, 1);
      assert.match(badCli.result?.structuredContent?.error?.message ?? "", /unexpected status 1/);
      assert.match(badCli.result?.structuredContent?.error?.stderr ?? "", /Cannot find module|MODULE_NOT_FOUND/);
    } finally {
      await badCliServer.close();
    }

    const slowCliPath = path.join(tempRoot, "slow-cli.js");
    fs.writeFileSync(slowCliPath, "setTimeout(() => {}, 10000);\n", "utf8");
    const timeoutServer = startServer(["--allow-root", repoRoot, "--timeout-ms", "50", "--cli", slowCliPath]);

    try {
      await timeoutServer.request("initialize", {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "axiom-test", version: "0" }
      });

      const timedOut = await timeoutServer.request("tools/call", {
        name: "axiom_observe",
        arguments: {
          root: repoRoot
        }
      });

      assert.equal(timedOut.error, undefined);
      assert.equal(timedOut.result?.isError, true);
      assert.equal(timedOut.result?.structuredContent?.tool, "axiom_observe");
      assert.equal(timedOut.result?.structuredContent?.exitCode, 124);
      assert.match(timedOut.result?.structuredContent?.error?.message ?? "", /unexpected status 124/);
      assert.match(timedOut.result?.structuredContent?.error?.stderr ?? "", /timed out after 50ms/);
    } finally {
      await timeoutServer.close();
    }
  } finally {
    fs.rmSync(tempRoot, { force: true, recursive: true });
  }
});

function startServer(args: string[]): McpServerHandle {
  const child = spawn(process.execPath, [serverPath, ...args], {
    cwd: repoRoot,
    windowsHide: true
  });
  const stderrChunks: string[] = [];
  child.stderr.setEncoding("utf8");
  child.stderr.on("data", (chunk: string) => {
    stderrChunks.push(chunk);
  });

  return new McpServerHandle(child, stderrChunks);
}

class McpServerHandle {
  private nextId = 1;
  private readonly pending = new Map<number, (response: Record<string, any>) => void>();
  private readonly stdout: readline.Interface;

  constructor(
    private readonly child: ChildProcessWithoutNullStreams,
    private readonly stderrChunks: string[]
  ) {
    this.stdout = readline.createInterface({
      crlfDelay: Infinity,
      input: child.stdout
    });
    this.stdout.on("line", (line) => {
      const payload = JSON.parse(line) as Record<string, any>;
      const id = payload.id;
      if (typeof id === "number") {
        const resolve = this.pending.get(id);
        this.pending.delete(id);
        resolve?.(payload);
      }
    });
  }

  request(method: string, params: unknown): Promise<Record<string, any>> {
    const id = this.nextId;
    this.nextId += 1;
    const request = {
      jsonrpc: "2.0",
      id,
      method,
      params
    };

    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Timed out waiting for ${method}. stderr:\n${this.stderrChunks.join("")}`));
      }, 20_000);

      this.pending.set(id, (response) => {
        clearTimeout(timer);
        resolve(response);
      });

      this.child.stdin.write(`${JSON.stringify(request)}\n`);
    });
  }

  notify(method: string, params: unknown): void {
    this.child.stdin.write(`${JSON.stringify({ jsonrpc: "2.0", method, params })}\n`);
  }

  async close(): Promise<void> {
    this.child.stdin.end();
    await new Promise<void>((resolve) => {
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
