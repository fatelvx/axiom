import assert from "node:assert/strict";
import test from "node:test";
import {
  AXIOM_MCP_TOOL_NAMES,
  buildAxiomMcpCliInvocation,
  createAxiomMcpToolResult,
  getAxiomMcpToolDescriptor,
  listAxiomMcpTools
} from "./tools.js";

test("mcp tool descriptors are read-only and use object input schemas", () => {
  const tools = listAxiomMcpTools();

  assert.deepEqual(
    tools.map((tool) => tool.name),
    AXIOM_MCP_TOOL_NAMES
  );

  for (const tool of tools) {
    assert.equal(tool.annotations.readOnlyHint, true);
    assert.equal(tool.annotations.destructiveHint, false);
    assert.equal(tool.annotations.openWorldHint, false);
    assert.equal(tool.inputSchema.type, "object");
    assert.equal(tool.inputSchema.additionalProperties, false);
    assert.equal(tool.outputSchema.type, "object");
  }
});

test("mcp descriptor callers cannot mutate the shared tool registry", () => {
  const descriptor = getAxiomMcpToolDescriptor("axiom_check");
  descriptor.title = "mutated";

  assert.equal(getAxiomMcpToolDescriptor("axiom_check").title, "Run Axiom Check");
});

test("mcp check invocation wraps axi check json and accepts hard gate exit codes", () => {
  const invocation = buildAxiomMcpCliInvocation(
    "axiom_check",
    {
      root: "fixtures/basic-ts-valid",
      adoptionMode: "strict",
      include: ["src/**"],
      specPaths: ["axiom/main.axi"],
      warnings: {
        deepInternalImports: true,
        unresolvedImports: true
      }
    },
    {
      cliPath: "dist/cli.js",
      nodeExecutable: "node"
    }
  );

  assert.equal(invocation.executable, "node");
  assert.equal(invocation.command, "check");
  assert.deepEqual(invocation.acceptedExitCodes, [0, 1]);
  assert.deepEqual(invocation.args, [
    "dist/cli.js",
    "check",
    "--root",
    "fixtures/basic-ts-valid",
    "--json",
    "--include",
    "src/**",
    "--spec",
    "axiom/main.axi",
    "--strict",
    "--warn-unresolved-imports",
    "--warn-deep-internal-imports"
  ]);
});

test("mcp graph invocation can request attention view and baseline drift", () => {
  const invocation = buildAxiomMcpCliInvocation(
    "axiom_graph",
    {
      root: ".",
      baselinePath: ".axi/baselines/current.graph.json",
      view: "attention",
      warnings: {
        couplingConcentration: true,
        largeFiles: true,
        publicApiSurface: true
      }
    },
    { cliPath: "dist/cli.js", nodeExecutable: "node" }
  );

  assert.equal(invocation.command, "graph");
  assert.deepEqual(invocation.acceptedExitCodes, [0]);
  assert.deepEqual(invocation.args, [
    "dist/cli.js",
    "graph",
    "--root",
    ".",
    "--json",
    "--warn-public-api-surface",
    "--warn-coupling-concentration",
    "--warn-large-files",
    "--baseline",
    ".axi/baselines/current.graph.json",
    "--attention"
  ]);
});

test("mcp diff invocation requires an existing baseline path input", () => {
  assert.throws(
    () => buildAxiomMcpCliInvocation("axiom_diff", { root: "." }),
    /baselinePath must be a non-empty string/
  );

  const invocation = buildAxiomMcpCliInvocation(
    "axiom_diff",
    {
      root: ".",
      baselinePath: "current.graph.json",
      specPaths: ["axiom/main.axi"]
    },
    { cliPath: "dist/cli.js", nodeExecutable: "node" }
  );

  assert.deepEqual(invocation.args, [
    "dist/cli.js",
    "diff",
    "--baseline",
    "current.graph.json",
    "--root",
    ".",
    "--json",
    "--spec",
    "axiom/main.axi"
  ]);
});

test("mcp infer invocation stays spec-free and maps grouping options", () => {
  assert.throws(
    () => buildAxiomMcpCliInvocation("axiom_infer_contract", { root: ".", specPaths: ["axiom/main.axi"] }),
    /unsupported input field/
  );

  const invocation = buildAxiomMcpCliInvocation(
    "axiom_infer_contract",
    {
      root: ".",
      groupBy: "workspace",
      groupDepth: 2,
      exclude: ["src/**/*.test.ts"]
    },
    { cliPath: "dist/cli.js", nodeExecutable: "node" }
  );

  assert.equal(invocation.payloadSchemaPrefix, "axiom.infer.");
  assert.deepEqual(invocation.args, [
    "dist/cli.js",
    "infer",
    "--root",
    ".",
    "--json",
    "--exclude",
    "src/**/*.test.ts",
    "--group-by",
    "workspace",
    "--group-depth",
    "2"
  ]);
});

test("mcp tool result treats check violations as structured evidence, not tool errors", () => {
  const invocation = buildAxiomMcpCliInvocation("axiom_check", { root: "." }, { cliPath: "dist/cli.js", nodeExecutable: "node" });
  const result = createAxiomMcpToolResult(invocation, {
    exitCode: 1,
    stderr: "",
    stdout: JSON.stringify({
      schemaVersion: "axiom.check.v4",
      ok: false,
      summary: { violations: 1 },
      violations: [{ code: "hidden_import" }]
    })
  });

  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent.schemaVersion, "axiom.check.v4");
  assert.equal((result.structuredContent.payload as { ok?: unknown }).ok, false);
  assert.match(result.content[0]?.text ?? "", /hidden_import/);
});

test("mcp tool result marks unexpected CLI exits and wrong schemas as tool errors", () => {
  const invocation = buildAxiomMcpCliInvocation("axiom_graph", { root: "." }, { cliPath: "dist/cli.js", nodeExecutable: "node" });

  const exitError = createAxiomMcpToolResult(invocation, {
    exitCode: 1,
    stderr: "boom",
    stdout: ""
  });
  assert.equal(exitError.isError, true);
  assert.match(exitError.structuredContent.error?.message ?? "", /unexpected status/);

  const schemaError = createAxiomMcpToolResult(invocation, {
    exitCode: 0,
    stderr: "",
    stdout: JSON.stringify({ schemaVersion: "axiom.check.v4" })
  });
  assert.equal(schemaError.isError, true);
  assert.match(schemaError.structuredContent.error?.message ?? "", /expected prefix axiom\.graph\./);
});
