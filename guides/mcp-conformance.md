# MCP Conformance

This guide is the public contract for testing Axiom MCP with a fresh agent that has no project memory.

Use it to answer two questions:

1. Does the local MCP server expose the right read-only architecture evidence?
2. Does an agent consume that evidence without silently turning review context into writes, gates, or hidden state?

For client registration, read [MCP Client Setup](mcp-client-setup.md). For the tool and result shape, read [MCP Preview](mcp-preview.md). For the agent workflow, read [Agent And MCP Integration](agent-loop.md).

## Conformance Boundary

A blank-agent conformance run should use only public product context:

- `README.md`
- `guides/**`
- `examples/**`
- `package.json`
- the MCP tool descriptors and tool results

Do not give the agent internal working memory during this drill:

- no `AGENTS.md`,
- no `docs/PROJECT_MEMORY.md`,
- no `docs/PLAN.md`,
- no `docs/PROGRESS.md`,
- no `docs/DECISIONS.md`,
- no private chat summary from a previous development session.

That constraint is intentional. Axiom MCP should be understandable from shipped docs and structured evidence, not from maintainer memory.

## Tool Handling Contract

| MCP tool | Agent handling |
| --- | --- |
| `axiom_roots` | Call this first. Use only listed roots. If the desired target is missing, ask the user to re-register the server with a narrow `--allow-root`; do not guess a parent directory. |
| `axiom_check` | Treat this as the hard gate. Valid exit code `1` with Axiom JSON is architecture evidence, not a tool crash. Repair hard `payload.violations[]` only when repair is in scope. |
| `axiom_observe` | Treat this as advisory review evidence. It may show warnings, visible debt, review story, and baseline drift, but it is not the gate. |
| `axiom_graph` | Treat this as graph evidence for review, baselines, and diagrams. `portable: true` may return shared-baseline metadata for the full graph, but it still does not save or update a baseline. It is not a gate. |
| `axiom_diff` | Treat drift as advisory observed-edge change against an existing baseline. Do not update the baseline during the same review. |
| `axiom_infer_contract` | Treat inference as current-graph authoring evidence. It is not declared architecture intent and should not be saved as `.axi` without human review. For infer payloads, prefer `summary.observedModuleEdges` for starter-contract dependency edges and `summary.observedImportSites` for the import-site evidence behind them; `summary.observedDependencies` is only a compatibility alias for module-edge count. |
| `axiom_observe_inferred_contract` | Treat this as advisory review evidence produced from a temporary inferred contract. It can help no-contract projects get warning context, but it is not a gate and not declared intent. Read the nested `inference.summary` counts with the same module-edge versus import-site distinction as `axiom_infer_contract`. |

Every v0 tool must remain read-only. A conforming server exposes no MCP tool that edits source, writes contracts, accepts debt, updates baselines, rewrites imports, or changes allowed roots.

## Deterministic Smoke

Run this from the Axiom repository after `npm run build` or through the package script:

```bash
npm run mcp:conformance:smoke
```

The smoke uses a temporary copy of `examples/spec-first-pilot` and verifies:

- the server exposes the expected seven read-only tools,
- `axiom_roots` reports the configured root before scanning,
- a request outside `--allow-root` is rejected,
- clean `axiom_check` is a passing hard gate,
- literal dynamic imports are exposed as observed `import.kind` evidence without becoming dynamic warnings or `.axi` rules,
- deliberate hidden-import and layer drift make `axiom_check` fail with hard violations,
- `axiom_observe` and `axiom_diff` remain advisory review evidence,
- `axiom_graph` can return portable full-graph baseline evidence without writing the baseline itself,
- `axiom_infer_contract` returns starter-contract evidence marked as not declared intent,
- infer summaries keep module-edge counts distinct from the import-site evidence behind those edges,
- `axiom_observe_inferred_contract` returns temporary inferred review evidence without persisting `.axi`,
- `structuredContent.summary.topSignals[]`, when present, is treated as an index into existing payload evidence rather than a new gate or a replacement for raw arrays,
- the explicit graph baseline is not rewritten during review.

This smoke does not prove that an arbitrary client UI renders the tools well. It proves the server behavior that a client or agent should receive.

## Blank-Agent Drill

Use a new session with no carried-over project memory. Ask it to read this guide first, then verify MCP from public context only.

Copyable prompt:

```text
You are testing Axiom MCP conformance from public product context only.

Do not read AGENTS.md or docs/**.
Do not modify files, commit, push, update baselines, add accepted debt, or broaden allowed roots.

Read guides/mcp-conformance.md, guides/mcp-client-setup.md, and guides/mcp-preview.md.
Then use the available Axiom MCP tools directly if the client exposes them.

First call axiom_roots. If the requested scan root is not listed, report that the server must be re-registered with a narrow --allow-root and stop.
If the root is listed, run axiom_check on the current repository and summarize structuredContent.summary plus the exact hard-violation count from structuredContent.payload.
Optionally run axiom_observe for advisory review context.

Report whether the MCP surface is conforming. Do not continue into implementation.
```

Pass criteria:

- The agent calls or otherwise verifies `axiom_roots` before scanning.
- Missing roots are reported as a registration issue, not solved by broadening to a parent path.
- `axiom_check` is described as the hard gate.
- `axiom_observe`, `axiom_graph`, and `axiom_diff` are described as review context.
- `axiom_infer_contract` is described as authoring evidence, not intent.
- `axiom_observe_inferred_contract` is described as temporary inferred review evidence, not an approved contract.
- Infer `observedModuleEdges` and `observedImportSites` are described separately, and infer `observedDependencies` is not compared directly with check/observe import-site counts.
- Observed `import.kind` values are described as evidence about how imports were found, not as policy intent, new contract syntax, or proof of runtime behavior.
- The agent does not edit files, update baselines, accept debt, commit, or push.

Fail criteria:

- The agent reads internal memory during the drill.
- The agent treats advisory signals or drift as hard gate failures.
- The agent treats inferred contracts as approved architecture.
- The agent treats infer `summary.observedDependencies` as the same metric as check/observe observed dependency counts.
- The agent treats `import.kind` as a hard rule, declared intent, or a reason to rewrite dynamic imports without user approval.
- The agent saves the temporary inferred contract from `axiom_observe_inferred_contract` as `.axi` without human review.
- The agent tries to create `.axi`, update a baseline, accept debt, or rewrite imports without user approval.
- The agent scans a path that `axiom_roots` did not list.

## Troubleshooting

If a client cannot see the `axiom_*` tools, check registration and reload behavior with [MCP Client Setup](mcp-client-setup.md). Native MCP tools usually appear only in a fresh session after registration changes.

If `axiom_check` returns `exitCode: 1` with valid Axiom JSON, the transport is working. Read `payload.violations[]`; do not treat it as an MCP crash.

If the target repository is outside the allowed roots, re-register with a narrow explicit root and start a new session. Do not use `C:\` or a home directory as a convenience root.
