import assert from "node:assert/strict";
import test from "node:test";
import {
  AXIOM_MCP_TOOL_NAMES,
  buildAxiomMcpCliInvocation,
  createAxiomMcpInferObserveToolResult,
  createAxiomMcpRootsToolResult,
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

test("mcp roots result is server-native read-only evidence", () => {
  assert.throws(
    () => buildAxiomMcpCliInvocation("axiom_roots", {}),
    /server-native MCP tool/
  );

  const result = createAxiomMcpRootsToolResult(["C:\\repo-a", "C:\\repo-b"]);

  assert.equal(result.isError, undefined);
  assert.equal(result.structuredContent.tool, "axiom_roots");
  assert.equal(result.structuredContent.command, "roots");
  assert.equal(result.structuredContent.exitCode, 0);
  assert.equal(result.structuredContent.summary.kind, "roots");
  assert.equal(result.structuredContent.summary.counts?.allowedRoots, 2);
  assert.deepEqual((result.structuredContent.payload as { allowedRoots?: string[] }).allowedRoots, ["C:\\repo-a", "C:\\repo-b"]);
  assert.match(result.structuredContent.summary.agentHint, /allowed roots/);
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
        dynamicImports: true,
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
    "--warn-dynamic-imports",
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

test("mcp graph invocation can request portable full graph output", () => {
  const invocation = buildAxiomMcpCliInvocation(
    "axiom_graph",
    {
      root: ".",
      portable: true,
      view: "full"
    },
    { cliPath: "dist/cli.js", nodeExecutable: "node" }
  );

  assert.deepEqual(invocation.args, [
    "dist/cli.js",
    "graph",
    "--root",
    ".",
    "--json",
    "--portable"
  ]);

  assert.throws(
    () =>
      buildAxiomMcpCliInvocation(
        "axiom_graph",
        {
          root: ".",
          portable: true,
          view: "attention"
        },
        { cliPath: "dist/cli.js", nodeExecutable: "node" }
      ),
    /portable graph output requires view to be full/
  );

  assert.throws(
    () =>
      buildAxiomMcpCliInvocation(
        "axiom_graph",
        {
          root: ".",
          baselinePath: ".axi/baselines/current.graph.json",
          portable: true
        },
        { cliPath: "dist/cli.js", nodeExecutable: "node" }
      ),
    /portable graph output cannot be combined with baselinePath/
  );
});

test("mcp portable graph result tells agents not to persist without approval", () => {
  const invocation = buildAxiomMcpCliInvocation(
    "axiom_graph",
    {
      root: ".",
      portable: true
    },
    { cliPath: "dist/cli.js", nodeExecutable: "node" }
  );
  const result = createAxiomMcpToolResult(invocation, {
    exitCode: 0,
    stderr: "",
    stdout: JSON.stringify({
      schemaVersion: "axiom.graph.v12",
      root: ".",
      artifact: {
        kind: "graph_baseline",
        pathMode: "portable"
      },
      architectureSummary: {
        status: "clear",
        gate: {
          command: "axi check",
          currentCommandIsGate: false,
          hardViolationsFailCheck: true
        }
      },
      summary: {
        modules: 1,
        observedDependencies: 0,
        shownObservedDependencies: 0,
        violations: 0,
        intentionalViolations: 0,
        warnings: 0
      }
    })
  });

  assert.equal(result.structuredContent.summary.kind, "review");
  assert.match(result.structuredContent.summary.agentHint, /portable graph evidence/);
  assert.match(result.structuredContent.summary.agentHint, /did not save or update a baseline/);
  assert.match(result.structuredContent.summary.agentHint, /unless the user explicitly approves/);
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

test("mcp infer-observe workflow is server-native and read-only", () => {
  assert.throws(
    () => buildAxiomMcpCliInvocation("axiom_observe_inferred_contract", { root: "." }),
    /server workflow/
  );

  const descriptor = getAxiomMcpToolDescriptor("axiom_observe_inferred_contract");
  assert.equal(descriptor.annotations.readOnlyHint, true);
  assert.equal(descriptor.inputSchema.properties?.specPaths, undefined);
  assert.equal(descriptor.inputSchema.properties?.baselinePath, undefined);
  assert.equal(descriptor.inputSchema.properties?.warnings?.type, "object");
  assert.equal(descriptor.inputSchema.properties?.warnings?.properties?.dynamicImports?.type, "boolean");
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
  assert.equal(result.structuredContent.summary.kind, "check");
  assert.equal(result.structuredContent.summary.ok, false);
  assert.equal(result.structuredContent.summary.gate?.currentCommandIsGate, true);
  assert.equal(result.structuredContent.summary.counts?.violations, 1);
  assert.match(result.structuredContent.summary.agentHint, /Repair hard violations/);
  assert.match(result.content[0]?.text ?? "", /hidden_import/);
});

test("mcp tool result summarizes review and inference evidence for agents", () => {
  const graphInvocation = buildAxiomMcpCliInvocation("axiom_observe", { root: "." }, { cliPath: "dist/cli.js", nodeExecutable: "node" });
  const graphResult = createAxiomMcpToolResult(graphInvocation, {
    exitCode: 0,
    stderr: "",
    stdout: JSON.stringify({
      schemaVersion: "axiom.graph.v12",
      architectureSummary: {
        status: "failing_contract",
        gate: {
          command: "axi check",
          currentCommandIsGate: false,
          hardViolationsFailCheck: true
        },
        reviewStory: {
          summary: "Review visible architecture pressure.",
          nextStep: "Inspect hard violations first.",
          caveat: "This is review context.",
          pressures: [{ kind: "hard_violations", severity: "error", title: "Hard violations" }]
        }
      },
      summary: {
        modules: 2,
        observedDependencies: 3,
        shownObservedDependencies: 1,
        violations: 1,
        intentionalViolations: 0,
        warnings: 2
      },
      drift: {
        kind: "advisory_observed_edge_drift",
        newObservedEdges: [{}],
        removedObservedEdges: [{}, {}]
      }
    })
  });

  assert.equal(graphResult.structuredContent.summary.kind, "review");
  assert.equal(graphResult.structuredContent.summary.status, "failing_contract");
  assert.equal(graphResult.structuredContent.summary.gate?.currentCommandIsGate, false);
  assert.equal(graphResult.structuredContent.summary.counts?.warnings, 2);
  assert.equal(graphResult.structuredContent.summary.counts?.newObservedEdges, 1);
  assert.equal(graphResult.structuredContent.summary.drift?.removedObservedEdges, 2);
  assert.equal(graphResult.structuredContent.summary.reviewStory?.firstPressure?.title, "Hard violations");
  assert.equal(graphResult.structuredContent.summary.topSignals?.[0]?.kind, "advisory_observed_edge_drift");
  assert.match(graphResult.structuredContent.summary.agentHint, /advisory review evidence/);
  assert.match(graphResult.structuredContent.summary.agentHint, /not a cleanup checklist/);
  assert.match(graphResult.structuredContent.summary.agentHint, /do not refactor solely to reduce signal counts/);
  assert.match(graphResult.structuredContent.summary.agentHint, /State a refactor hypothesis/);

  const inferInvocation = buildAxiomMcpCliInvocation("axiom_infer_contract", { root: "." }, { cliPath: "dist/cli.js", nodeExecutable: "node" });
  const inferResult = createAxiomMcpToolResult(inferInvocation, {
    exitCode: 0,
    stderr: "",
    stdout: JSON.stringify({
      schemaVersion: "axiom.infer.v8",
      reviewStory: {
        summary: "Starter contract inferred 3 modules.",
        nextStep: "Review inferred dependencies.",
        pressures: [{ kind: "dependency_evidence", severity: "info", title: "Review inferred dependencies" }]
      },
      summary: {
        architecturePressureNotes: 1,
        collapsedCycles: 0,
        importsScanned: 4,
        modules: 3,
        observedDependencies: 2,
        sourceFiles: 5
      },
      architecturePressureNotes: [
        {
          kind: "large_source_file",
          filePath: "src/main.ts",
          lineCount: 900,
          functionLikeCount: 12
        }
      ]
    })
  });

  assert.equal(inferResult.structuredContent.summary.kind, "inference");
  assert.equal(inferResult.structuredContent.summary.counts?.sourceFiles, 5);
  assert.equal(inferResult.structuredContent.summary.counts?.architecturePressureNotes, 1);
  assert.equal(inferResult.structuredContent.summary.reviewStory?.summary, "Starter contract inferred 3 modules.");
  assert.equal(inferResult.structuredContent.summary.topSignals?.[0]?.kind, "large_source_file");
  assert.match(inferResult.structuredContent.summary.agentHint, /not declared architecture intent/);
});

test("mcp inferred-observe summary exposes compact top signals without hiding payloads", () => {
  const result = createAxiomMcpInferObserveToolResult(
    {
      schemaVersion: "axiom.infer.v8",
      summary: {
        architecturePressureNotes: 1,
        collapsedCycles: 1,
        importsScanned: 690,
        modules: 8,
        observedDependencies: 18,
        sourceFiles: 199
      },
      collapsedCycles: [
        {
          module: "ServicesStore",
          sourceGroups: ["Services", "Store"],
          cycleBreakingCandidates: [{ fromGroup: "Services", toGroup: "Store", count: 13 }]
        }
      ],
      architecturePressureNotes: [
        {
          kind: "large_source_file",
          filePath: "src/services/aiService.ts",
          lineCount: 1193,
          functionLikeCount: 36
        }
      ],
      observedDependencies: [
        { fromModule: "ServicesStore", toModule: "Contracts", count: 83 },
        { fromModule: "Components", toModule: "ServicesStore", count: 58 }
      ]
    },
    {
      schemaVersion: "axiom.graph.v12",
      architectureSummary: {
        status: "needs_review",
        gate: {
          command: "axi check",
          currentCommandIsGate: false,
          hardViolationsFailCheck: true
        },
        reviewStory: {
          summary: "Review visible architecture pressure.",
          nextStep: "Inspect the ambiguous public boundary first.",
          pressures: [{ kind: "warning_roots", severity: "warning", title: "Ambiguous public boundary" }]
        }
      },
      summary: {
        modules: 8,
        observedDependencies: 278,
        shownObservedDependencies: 0,
        violations: 0,
        intentionalViolations: 0,
        warnings: 4
      },
      violations: [],
      warnings: [
        {
          code: "deep_internal_import",
          message: "Components imports ServicesStore through a deep relative path with no clear source-group entry point.",
          location: { filePath: "src/components/SettingsPanel.tsx", line: 12 },
          details: {
            fromModule: "Components",
            toModule: "ServicesStore",
            importedPath: "src/services/internal/settings.ts",
            deepImportGroup: "src/services/internal/*",
            entrypointConfidence: "ambiguous_entrypoints",
            observed: "Components -> ServicesStore deep internal import"
          }
        },
        {
          code: "deep_internal_import",
          message: "Hooks imports ServicesStore through a deep relative path with no clear source-group entry point.",
          location: { filePath: "src/hooks/useSendMessage.ts", line: 8 },
          details: {
            fromModule: "Hooks",
            toModule: "ServicesStore",
            importedPath: "src/services/internal/send.ts",
            deepImportGroup: "src/services/internal/*",
            entrypointConfidence: "ambiguous_entrypoints",
            observed: "Hooks -> ServicesStore deep internal import"
          }
        },
        {
          code: "large_module_file",
          message: "Source file is large enough that architecture pressure may be hidden inside the file.",
          location: { filePath: "src/components/BenchmarkPanel.tsx", line: 1 },
          details: {
            filePath: "src/components/BenchmarkPanel.tsx",
            lineCount: 1458,
            functionLikeCount: 80
          }
        },
        {
          code: "coupling_concentration",
          message: "AppEntry composition root imports 4 modules.",
          details: {
            module: "AppEntry",
            reviewKind: "composition_root_pressure",
            observed: "AppEntry composition root imports 4 modules"
          }
        }
      ]
    }
  );

  const summary = result.structuredContent.summary;
  const payload = result.structuredContent.payload as { inference?: unknown; observe?: unknown };

  assert.equal(summary.kind, "review");
  assert.equal(summary.counts?.warnings, 4);
  assert.equal(summary.topSignals?.[0]?.kind, "collapsed_cycle");
  assert.equal(summary.topSignals?.[0]?.module, "ServicesStore");
  assert.equal(summary.topSignals?.[1]?.kind, "deep_internal_import");
  assert.equal(summary.topSignals?.[1]?.count, 2);
  assert.equal(summary.topSignals?.[2]?.kind, "composition_root_pressure");
  assert.equal(summary.topSignals?.[3]?.kind, "large_module_file");
  assert.match(summary.agentHint, /temporary inferred contract/);
  assert.match(summary.agentHint, /not a cleanup checklist/);
  assert.match(summary.agentHint, /do not refactor solely to reduce signal counts/);
  assert.ok(payload.inference);
  assert.ok(payload.observe);
});

test("mcp tool result marks unexpected CLI exits and wrong schemas as tool errors", () => {
  const invocation = buildAxiomMcpCliInvocation("axiom_graph", { root: "." }, { cliPath: "dist/cli.js", nodeExecutable: "node" });

  const exitError = createAxiomMcpToolResult(invocation, {
    exitCode: 1,
    stderr: "boom",
    stdout: ""
  });
  assert.equal(exitError.isError, true);
  assert.equal(exitError.structuredContent.summary.kind, "tool_error");
  assert.match(exitError.structuredContent.error?.message ?? "", /unexpected status/);

  const schemaError = createAxiomMcpToolResult(invocation, {
    exitCode: 0,
    stderr: "",
    stdout: JSON.stringify({ schemaVersion: "axiom.check.v4" })
  });
  assert.equal(schemaError.isError, true);
  assert.match(schemaError.structuredContent.error?.message ?? "", /expected prefix axiom\.graph\./);
});
