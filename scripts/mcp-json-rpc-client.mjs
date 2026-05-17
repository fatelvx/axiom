import { spawn } from "node:child_process";
import readline from "node:readline";

export function startMcpStdioServer({ args = [], cwd = process.cwd(), nodePath = process.execPath, serverPath, timeoutMs }) {
  if (typeof serverPath !== "string" || serverPath.length === 0) {
    throw new Error("startMcpStdioServer requires a serverPath.");
  }

  const child = spawn(nodePath, [serverPath, ...args], {
    cwd,
    windowsHide: true
  });

  return new McpJsonRpcClient(child, { timeoutMs });
}

export function callMcpTool(server, name, args) {
  return server.request("tools/call", {
    name,
    arguments: args
  });
}

export class McpJsonRpcClient {
  #nextId = 1;
  #pending = new Map();
  #stderrChunks = [];
  #stdout;
  #timeoutMs;

  constructor(child, options = {}) {
    this.child = child;
    this.#timeoutMs = options.timeoutMs ?? 20_000;

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

    child.once("exit", () => {
      const stderr = this.#stderrChunks.join("");
      for (const [id, settle] of this.#pending) {
        settle({
          error: {
            code: -32000,
            message: `MCP server exited before response ${id}. stderr:\n${stderr}`
          }
        });
      }
      this.#pending.clear();
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
      }, this.#timeoutMs);

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
        const killTimer = setTimeout(resolve, 5_000);
        this.child.once("exit", () => {
          clearTimeout(killTimer);
          resolve();
        });
      }, 5_000);
      this.child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
    });
    this.#stdout.close();
    this.child.stdout.destroy();
    this.child.stderr.destroy();
  }
}
