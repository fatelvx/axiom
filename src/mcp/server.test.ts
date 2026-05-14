import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";
import readline from "node:readline";
import test from "node:test";

const repoRoot = process.cwd();
const serverPath = path.join(repoRoot, "dist/mcp/server.js");

test("mcp stdio server initializes, lists tools, and calls read-only check", async () => {
  const server = startServer(["--allow-root", repoRoot, "--timeout-ms", "20000"]);

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
    assert.equal(tools.result?.tools?.length, 5);
    assert.equal(
      tools.result?.tools?.every((tool: { annotations?: { readOnlyHint?: boolean } }) => tool.annotations?.readOnlyHint === true),
      true
    );

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

    const infer = await server.request("tools/call", {
      name: "axiom_infer_contract",
      arguments: {
        root: "fixtures/basic-ts-valid"
      }
    });
    assert.equal(infer.result?.structuredContent?.schemaVersion, "axiom.infer.v8");
    assert.match(infer.result?.structuredContent?.payload?.axi ?? "", /module Physics/);
  } finally {
    await server.close();
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
