# Axiom Targeted Forecast Seed: Read-The-Graph Navigation And Pilot Card

Created: 2026-05-13

Status: targeted synthetic forecast seed, not real user research.

This seed evaluates Axiom after adding external-facing graph navigation materials and rerunning small v11 interpretation smokes.

## Product Snapshot

Axiom is an architecture observability layer with enforceable contracts for AI-era codebases.

Core model:

- `.axi` declares architecture intent.
- Source scanning observes TypeScript/JavaScript imports.
- Axiom compares declared graph vs observed graph.
- `axi check` is the hard gate.
- `axi observe`, `axi graph`, `axi diff`, Markdown, Mermaid, and JSON summaries are advisory review / observability surfaces.
- Intentional violations are visible accepted debt with expiration dates and reasons.
- Advisory warnings stay advisory until teams explicitly promote a low-noise rule into a gate.

Current positioning:

- Axiom is a guardrail layer, not a complete architecture oracle.
- Axiom should not claim semantic architecture health from import graphs alone.
- Axiom should lower adoption friction without adding hidden allowlists, blanket auto-accepted debt, or framework-specific hidden policies.
- MCP remains a promising future read-only adapter direction, but not the next implementation step until CLI and JSON surfaces stabilize.

## New Change Under Test

A small external JavaScript + React + Pixi developer tried Axiom and reported that it felt useful and fast, but they were not sure whether they used it correctly or how to interpret the graph for their project.

Axiom responded with two public guides:

1. `guides/read-the-graph.md`
   - starts every review with three questions:
     1. hard violations / visible debt / warnings / drift?
     2. which module is the graph center?
     3. does the shape match expected architecture?
   - explains failing contracts, quiet graphs, and advisory pressure.
   - includes React plus Pixi game-client review questions without turning them into hidden framework rules.
   - warns that the graph is navigation, not a health score.

2. `guides/pilot-card.md`
   - a 10-minute external pilot card.
   - gives three commands: `axi infer`, `axi observe`, and `axi graph --mermaid`.
   - tells users what to inspect first, when not to panic, when to fix or review, and how to hand Axiom output to an AI agent.
   - keeps inferred contracts framed as current-graph snapshots, not recommended architecture.

README, Getting Started, and Pilot Workflow now link to both guides.

## Real-Project Replay Evidence

After the docs change, Axiom reran clone-only v11 interpretation smokes on safe small repositories.

Safety posture:

- Shallow `git clone` only.
- No target package install.
- No target lifecycle scripts, builds, tests, `npx`, submodules, or GitHub Actions.

ofetch `v1.4.0 -> v1.5.1`, scoped to `src/**`:

- modules: `1 -> 1`
- observed imports: `0 -> 0`
- drift: `0`
- warnings: `0`
- interpretation did not just say "green"; it told the reviewer to confirm the scan scope covers the architecture they care about before saving a baseline.

Preact Signals `@preact/signals@2.7.0 -> @preact/signals@2.9.0`, scoped to `packages/*/src/**`:

- modules: `8 -> 8`
- observed imports: `12 -> 17`
- drift: `1 new edge`
- warnings: `1`
- signal:

```text
Signals -> SignalsDebug
packages/preact/src/internal.ts:3 importing ../../debug/src/devtools
```

This same edge appeared as:

- a baseline-spec mismatch against the inferred baseline contract
- an advisory `deep_internal_import`
- a new observed edge in drift output
- a graph-center interpretation that named `Signals`, `SignalsCore`, and `SignalsDebug`

## Target Questions

Please answer as a MiroFish-style synthetic risk map. Do not treat this as real user research. Do not recommend broad new enforcement semantics. Do not hallucinate features Axiom does not have.

Evaluate:

1. Do the read-the-graph guide and 10-minute pilot card reduce adoption friction for first-time external users?
2. Do they make Axiom visibly different from a linter / Dependency Cruiser / generic graph visualizer, or does it still read as documentation around the same thing?
3. Is the React plus Pixi guidance helpful, or does it risk sounding like hidden framework policy?
4. Does the quiet-control replay solve the "green but now what?" problem enough for a small pilot?
5. Does the Preact Signals replay provide credible evidence that Axiom can surface meaningful drift without overclaiming?
6. Should Axiom run a larger public-reception / MCP backtest now, or do one more small product/doc refinement first?

Return:

1. Executive verdict.
2. Stakeholder reaction map.
3. Strongest improvement.
4. Remaining rejection pattern.
5. Specific small fix, if any.
6. MCP timing recommendation.
7. Decision: larger backtest now, one more target refinement, or hold.
8. What not to overclaim.
