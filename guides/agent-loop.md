# Agent And MCP Integration

Axiom can be useful inside AI coding loops, but the integration must keep the same split as the CLI:

```text
axi check = hard gate
axi observe / graph / diff = review context
reviewStory = what to inspect first, not a health score
```

Do not ask an agent to "make Axiom green at all costs." That creates compliance-shaped code. Ask it to repair hard violations, explain advisory pressure, and propose contract changes only when the architecture intent really changed.

For the shared artifact convention that agents, CI, and future MCP wrappers should read, start with [Evidence Artifact Loop](evidence-artifact.md).

For the dependency-free read-only tool contract now used inside the codebase, see [MCP Preview](mcp-preview.md).

For registering the stdio server in Codex or another MCP client, see [MCP Client Setup](mcp-client-setup.md).

For testing a fresh agent with no internal project memory, use [MCP Conformance](mcp-conformance.md).

## Safe Agent Loop

Use this loop for Codex, Claude Code, Cursor, CI bots, or a future MCP adapter:

1. If using MCP, call `axiom_roots` and choose a scan root from the configured allowed roots.
2. Run `axi check --json`.
3. Treat hard `violations[]` as required repairs.
4. Run `axi observe --json` for visible debt, warnings, drift, and `architectureSummary.reviewStory`.
5. If a baseline exists, run `axi diff <baseline.json> --json` or `axi observe --baseline <baseline.json> --json`.
6. Ask the agent to summarize:
   - hard fixes made,
   - advisory pressure left for review,
   - whether the contract should change,
   - and whether any intentional debt needs human approval.

The agent may suggest a `.axi` change, but it should not auto-accept debt or silently broaden boundaries.

## Baseline Lifecycle

Baseline drift only works if the baseline is a real architecture snapshot, not a graph generated from the same checkout being reviewed.

Recommended convention for pilots:

```text
.axi/baselines/current.graph.json
```

Create or update it only after the team agrees that the current observed shape is intentional:

```bash
axi graph --root . --json > .axi/baselines/current.graph.json
```

Review drift later:

```bash
axi diff .axi/baselines/current.graph.json --root . --json
axi observe --root . --baseline .axi/baselines/current.graph.json --json
```

If the baseline is missing, the integration should say so and fall back to `axi observe --json`. It should not create a baseline automatically during a PR review, because that would compare the branch to itself and hide drift.

## Reading Review Story

`architectureSummary.reviewStory` is designed for PR comments, dashboards, and agent context. It includes:

- `summary`: what this scan means in one paragraph.
- `setup`: scan size and the advisory/gate reminder.
- `pressures[]`: the top review pressures.
- `nextStep`: the first action to take.
- `caveat`: why the story is not proof of semantic architecture health.

Good agent instruction:

```text
Use architectureSummary.reviewStory to decide what to inspect first.
Use violations[] for required repairs.
Use warnings[] and drift as advisory review context.
Do not treat reviewStory as a score or automatic PR decision.
Do not add accepts rules unless the user explicitly approves visible debt.
```

## Reading MCP Results

When the MCP preview is available, every tool result keeps exact CLI JSON under `structuredContent.payload` and adds a small `structuredContent.summary` for routing.

Use the summary first:

- `summary.kind`: choose the workflow: roots policy, hard check, advisory review, inference authoring, or tool error.
- `summary.gate.currentCommandIsGate`: decide whether the result can block a change.
- `summary.counts`: read hard violations, warnings, visible debt, drift, and scan size without walking the whole payload.
- `summary.reviewStory`: show the first narrative summary and next step.
- `summary.agentHint`: preserve the intended handling of the result.

Then use the payload for exact evidence:

- `payload.allowedRoots[]` from `axiom_roots` before choosing another tool's `root`.
- `payload.violations[]` for required repairs.
- `payload.warnings[]` for advisory pressure.
- `payload.intentionalDebt[]` or `payload.intentionalViolations[]` for visible accepted debt.
- `payload.drift` for observed-edge drift details.
- `payload.axi`, `payload.modules[]`, and `payload.collapsedCycles[]` for inferred-contract review.

Do not make decisions from `summary` alone. It is an index over the same evidence, not a replacement for the evidence.

## Thin MCP v0 Shape

A safe MCP v0 should be read-only and wrap existing CLI behavior.

Candidate tools:

- `axiom_roots`: list configured allowed roots for this local MCP server.
- `axiom_check`: run `axi check --json` and return pass/fail plus hard diagnostics.
- `axiom_observe`: run `axi observe --json` and return review context.
- `axiom_graph`: run `axi graph --json` or `--mermaid`.
- `axiom_diff`: run `axi diff <baseline> --json` for baseline drift.
- `axiom_infer_contract`: run `axi infer --json` for a current-graph starter draft.

The preview implementation lives in `src/mcp/tools.ts`, with a minimal stdio server in `src/mcp/server.ts`. It defines tool descriptors, read-only annotations, JSON input/output schemas, and a CLI invocation adapter without adding an MCP SDK dependency. Future server growth should keep importing that adapter instead of inventing new tool names or validation behavior.

Candidate resources:

- `axiom://project/current/contract`
- `axiom://project/current/graph`
- `axiom://project/current/diagnostics`
- `axiom://project/current/architecture-summary`

Do not expose write tools in v0:

- no auto-editing `.axi`,
- no auto-accepted debt,
- no hidden allowlists,
- no automatic baseline updates during PR review.

## PR Comment Recipe

A compact PR comment can be built from JSON without asking the agent to parse Markdown:

```text
Architecture review

Gate: pass/fail from axi check
Story: architectureSummary.reviewStory.summary
First pressure: architectureSummary.reviewStory.pressures[0]
Next step: architectureSummary.reviewStory.nextStep
Hard violations: summary.violations
Visible debt: summary.intentionalViolations
Warnings: summary.warnings
Drift: drift.newObservedEdges + drift.removedObservedEdges
```

Keep the comment explicit:

```text
This is review context, not a health score. The hard gate is axi check.
```

## Failure Modes

Watch for these integration mistakes:

- The handoff prompt asks only for MCP verification, but the agent starts editing, committing, or pushing before approval.
- The agent treats a quiet story as proof that architecture is healthy.
- The agent rewrites imports toward a guessed public entry point without checking `entrypointConfidence`.
- The agent creates `accepts` debt to pass CI instead of explaining the tradeoff.
- The integration creates a fresh baseline during the same PR it is reviewing.
- The MCP wrapper hides raw `violations[]`, `warnings[]`, or `drift` behind prose only.

Axiom's value is that humans, agents, and CI see the same evidence. Keep that evidence visible.
