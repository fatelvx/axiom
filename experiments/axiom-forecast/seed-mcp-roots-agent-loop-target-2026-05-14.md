# Targeted MiroFish Backtest Seed: MCP Roots And Agent Loop

Status: targeted synthetic forecast seed, not real user research.

Use this as a MiroFish-style risk-map prompt after adding MCP allowed-root visibility and a temp-only MCP agent-loop smoke.

## Current Axiom State

Axiom is a TypeScript/JavaScript architecture observability layer with enforceable contracts.

The validator-first loop remains:

```text
.axi contract -> declared graph
source imports -> observed graph
Axiom compares both -> hard violations, visible debt, advisory warnings, and drift review
```

The current CLI has:

- `axi check` as the hard gate.
- `axi observe`, `axi graph`, and `axi diff` as review surfaces.
- `axi infer` as current-graph starter contract evidence, not declared intent.
- JSON output for check, graph, observe, diff, and infer.
- `architectureSummary.reviewStory` in graph / observe / diff JSON.
- a top-level `intentionalDebt[]` ledger in graph / observe output.
- advisory baseline drift from unfiltered `axi graph --json` baselines.
- visible `.axi` intentional violations with `accepts ... until ... because ...`.

The current integration direction is:

```text
single-repo validator trust first
then GitHub Actions / VS Code / MCP as surfaces over the same evidence
then contract templates, inheritance, organizational sharing, and cross-repo architecture norms
```

## Recent MCP Change Being Tested

Axiom now ships a minimal dependency-free stdio MCP server behind `axi-mcp` / `axiom-mcp`.

MCP is read-only and exposes:

- `axiom_roots`: server-native root-policy visibility.
- `axiom_check`: wraps `axi check --json` as the hard gate.
- `axiom_observe`: wraps `axi observe --json` as advisory review context.
- `axiom_graph`: wraps `axi graph --json`.
- `axiom_diff`: wraps `axi diff --json`.
- `axiom_infer_contract`: wraps `axi infer --json` as authoring evidence.

`axiom_roots` was added because the Lumina-side MCP trial showed a correct but confusing failure:

```text
root is outside allowed MCP roots
```

The tool surface was live, and Axiom could scan the Axiom repo itself, but Lumina could not be scanned until the MCP server was registered with an explicit Lumina root. `axiom_roots` lets an agent inspect the configured allow list before choosing a scan root.

The MCP server still validates `root`, `configPath`, `baselinePath`, and `specPaths` against configured `--allow-root` directories. It does not edit contracts, update baselines, add accepted debt, rewrite imports, or create MCP-only validation semantics.

## Agent-Loop Smoke Added

A new `npm run mcp:agent-loop:smoke` performs a temp-only workflow:

1. Start the MCP server with one temp project root.
2. Call `axiom_roots` and confirm the allowed root.
3. Run `axiom_check` on the clean spec-first pilot and confirm the reviewed `.axi` passes.
4. Run `axiom_graph` and save an explicit graph baseline under the temp project.
5. Introduce deliberate hidden-internal import and outward layer drift in temp source files.
6. Run `axiom_check` and confirm hard `hidden_import` and `layer_breach` violations.
7. Run `axiom_observe --baseline` and confirm review evidence plus advisory drift.
8. Run `axiom_diff` and confirm advisory new observed edges.
9. Run `axiom_infer_contract` and confirm inference remains authoring evidence, not declared intent.

Verification passed:

- `npm run mcp:smoke`
- `npm run mcp:agent-loop:smoke`
- `npm test` with 222 tests
- `npm run axiom:self`
- `npm run spec-first:smoke`
- `npm run github-actions:smoke`
- `npm run pack:dry-run`

Current commit under test:

```text
1d4c1be Add MCP roots and agent loop smoke
```

## Strategic Question

Earlier MiroFish runs warned that MCP should not outrun validator trust, and that agent integrations can fail by:

- treating `reviewStory` as a health score,
- auto-updating baselines during review,
- auto-adding accepted debt to pass a gate,
- exposing private architecture graphs too broadly,
- creating disconnected integration semantics across CLI, CI, IDE, and MCP.

The current change tries to reduce those risks by making root policy visible and proving the evidence-artifact loop over MCP in a temp-only smoke.

At the same time, new pressure exists:

- users now ask whether MCP setup is too manual because roots must be explicit;
- `compact` / `maxWarnings` may still be needed for large agent contexts;
- "infer then observe without writing a temp spec" would improve workflow but touches the in-memory spec pipeline;
- dynamic analysis or Python support could expand reach, but may be premature before the single-repo validator and MCP evidence loop are proven.

## Questions For The Forecast

Answer as a MiroFish-style synthetic risk map. Do not treat this as real user research. Do not hallucinate features Axiom does not have. Do not recommend write-capable MCP tools, hidden suppressions, semantic health scores, broad root permissions, or auto-accepted debt.

Evaluate:

1. Does `axiom_roots` materially improve MCP trust and usability, or does explicit root registration still feel too manual for adoption?
2. Does the temp-only MCP agent-loop smoke reduce the risk that agents misuse Axiom evidence?
3. Is Axiom ready to move from MCP v0 into deeper workflow polish such as in-memory infer-then-observe, compact result modes, or client templates?
4. Should Axiom start dynamic/Python support now, or would that split focus before the TypeScript/JavaScript validator and MCP loop are trusted?
5. What is the single highest-signal next action after this change?

Output format:

- Executive forecast
- Stakeholder reactions
- MCP trust and usability risks
- Workflow readiness assessment
- Dynamic/Python timing assessment
- Recommended next action
- What Axiom should not do next
