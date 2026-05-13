# Axiom Targeted Forecast Seed: Graph Interpretation And MCP Readiness

Created: 2026-05-13

Status: targeted synthetic forecast seed, not real user research.

This seed evaluates Axiom after commit `886337b Add graph interpretation guidance`.

## Product Snapshot

Axiom is an architecture observability layer with enforceable contracts for AI-era codebases.

Core model:

- `.axi` declares architecture intent.
- Source scanning observes TypeScript/JavaScript imports.
- Axiom compares declared graph vs observed graph.
- `axi check` is the hard gate.
- `axi observe`, `axi graph`, `axi diff`, Markdown, Mermaid, and JSON summaries are review / observability surfaces.
- Intentional violations are visible accepted debt with expiration dates and reasons.
- Advisory warnings stay advisory until teams explicitly promote a low-noise rule into a gate.

Current positioning:

- Axiom is a guardrail layer, not a complete architecture oracle.
- Axiom should not claim semantic architecture health from import graphs alone.
- Axiom should lower adoption friction without adding hidden allowlists or blanket auto-accept debt.

## New Change Under Test

A small external pilot from a JavaScript + React + Pixi game developer gave this rough feedback:

```text
It feels good. I am not sure if I used it correctly, but it can help me follow project architecture dependencies and whether the project is drifting. The scan is fast.
```

Interpretation:

- The graph felt valuable and intuitive.
- The user could see that Axiom surfaces architecture information.
- The user could not easily judge whether the graph meant "healthy" or "sick".
- The user needed navigation: what should I inspect first, and what does this graph imply for my project?

Axiom responded by adding `architectureSummary.interpretation` to graph / observe / diff JSON and surfacing the same idea in human, Markdown, and GitHub Actions summary output.

The interpretation layer includes:

- `headline`: one short reading of the current scan.
- `quickRead[]`: compact facts about contract status, graph center, review pressure, and drift.
- `lookFirst[]`: a stable checklist:
  1. read hard signals / accepted debt / warnings first
  2. inspect the graph center
  3. compare the observed shape against expected architecture
- `centralModules[]`: modules with strongest observed import pressure, including fan-in/fan-out and import-site counts.
- `caveat`: interpretation is static import graph guidance, not proof of semantic architecture health.

Example human output:

```text
interpretation: Contract is failing: 2 hard violations should be repaired or explicitly accepted before treating the graph as stable.
center: Services (5 import sites, fan-in 1, fan-out 1), UI (3 import sites, fan-in 0, fan-out 1)
look first:
  1. Hard signals: read `violations[]`, `intentionalDebt[]`, and `warnings[]` before judging the diagram.
  2. Graph center: inspect Services; it carries the strongest observed coupling in this scan.
  3. Shape fit: compare central modules, deep imports, and drift with the architecture you expected for this repository.
```

JSON schema bumped from `axiom.graph.v10` to `axiom.graph.v11`.

The README now has a "How To Read A Graph" section:

- Are there hard violations, visible accepted debt, or advisory warnings?
- Which module is the graph center by observed import pressure?
- Does that shape match the architecture you expected?

The GitHub banner was also redesigned around "read the graph" instead of a loose node graph. It visually emphasizes declared intent, observed imports, visible drift, and graph-reading steps.

## Future Direction Under Test

Axiom is considering a thin read-only MCP surface later, after CLI/library JSON surfaces are stable:

- `axiom_infer_contract`
- `axiom_observe`
- `axiom_check`
- `axiom_graph`
- `axiom_diff`

Potential resources:

- current contract
- graph
- baseline
- diagnostics
- architecture summary

Guardrails:

- Start read-only.
- Wrap the same validator / graph / inference library.
- Do not introduce MCP-only validation semantics.
- Do not let agents auto-edit contracts to pass checks in v0.

## Target Questions

Please answer as a MiroFish-style synthetic risk map. Do not treat this as real user research. Do not recommend broad new enforcement semantics. Do not hallucinate features Axiom does not have.

Evaluate:

1. Does the graph interpretation layer meaningfully reduce the "I do not know whether I used this correctly" problem?
2. Does it make Axiom feel more different from a linter / Dependency Cruiser / generic graph visualizer?
3. Does central-module interpretation create a false sense of "health score" or "architecture diagnosis"?
4. Does the new banner and "How To Read A Graph" framing improve first-page comprehension, or does it still look too abstract?
5. Would an MCP surface be seen as an important adoption wedge for AI agents, or as premature platform work?
6. Should Axiom now run a larger backtest focused on MCP and public reception, or do one more small product/documentation refinement first?

Return:

1. Executive verdict.
2. Stakeholder reaction map.
3. Strongest improvement.
4. Remaining rejection pattern.
5. Specific small fix, if any.
6. MCP timing recommendation.
7. Decision: larger backtest now, one more target refinement, or hold.
8. What not to overclaim.
