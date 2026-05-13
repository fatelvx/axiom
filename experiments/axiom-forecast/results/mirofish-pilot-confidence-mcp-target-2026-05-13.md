# MiroFish Targeted Backtest: Pilot Confidence And MCP Timing

Created: 2026-05-13

Method: direct MiroFish `LLMClient` using the local configured model. This is a synthetic forecast and not real user research or a full OASIS social simulation run.

Seed: `experiments/axiom-forecast/seed-pilot-confidence-mcp-target-2026-05-13.md`
Model: `deepseek-v4-pro` via `https://api.deepseek.com`
Commit: `3c5e9eb`
Note: Output was cleaned to ASCII punctuation for repository readability.

## Forecast Output

```text
1. Executive verdict

Axiom demonstrates a genuine architectural guardrail pattern, not yet a finished review companion. The recent Lumina entrypoint fix reduces overconfidence but remains heuristic; the interpretation gap is the critical drag on trust and first-time comprehension. The small pilot evidence (Lumina, ofetch, Preact Signals) proves the tool can deliver quiet baseline safety and meaningful structural signals, but does not yet deliver the "short review story" that pilot users need. MCP is valuable but premature. Recommendation: one targeted refinement (review story + JSON stabilization) before a larger backtest; MCP afterwards.

2. Stakeholder reaction map

- Pilot developer: finds output information-rich but hard to self-evaluate. "Am I using Axiom correctly?" is left unanswered. The Lumina fix reduces obvious wrong advice, but ambiguous-entrypoint warnings still require manual reading.
- Architecture lead: sees value in contract-declared vs. observed diff and intentional debt. Lumina's coupling warnings (services/store leakage, tooling/tools loop) map to real pain. Wants a summarized root-cause story, not module-pair clusters.
- Tool evaluator: likely to compare Axiom to lint / dependency-graph tools. Quiet on ofetch and clean cycle naming in Preact Signals will impress, but lack of a "first-look at a glance" report may push them toward a boring linter they already understand.
- Agent / MCP advocate: will see useful JSON and graph surfaces, but the current instability of advisory-warning presentation (clusters, ambiguity reasons) makes automated interpretation risky. Would prefer a stable `axi review` machine-readable contract first.

3. Evidence that strengthens Axiom's differentiation

- Contract-first guardrails: `.axi`, `axi check`, and intentional debt with expiration dates are not present in linters or dependency visualizers.
- Quiet-control proof: ofetch produced zero warnings and reminded the reviewer to confirm scope.
- Structural pressure signals: Lumina surfaced a tooling/tools contract loop, store leakage into services, and an overly broad `ServicesCycle`.
- Cycle-name clarity: Preact Signals emitted `SignalsDebugCycle` instead of a concatenated name.
- Source-group-aware entrypoint advice: `deep_internal_import` no longer suggests an irrelevant sandbox index for store imports; it reports `ambiguous_entrypoints`.

4. Remaining "just a linter" rejection pattern

If the first user experience is "117 warnings and a dependency graph," the product collapses into a large-list linting tool in perception. Current clusters group by module pairs, not root causes; the human must do the story-building themselves. Until `axi observe` or a new `axi review` answers a few baseline questions - am I set up right, where is the real pressure, what should I inspect first - pilot users will mentally file Axiom as "Dependency Cruiser with an opinionated config."

5. Recommended next refinement

Build a "review story" interpretation layer (CLI + JSON) before a larger backtest. The layer should:

- Produce a short prose summary covering scan scope, gate status, top 1-2 architectural pressures, and a clear "needs review" caveat.
- Upgrade warning clustering from `source -> target` groups to root-cause patterns: contract loops, responsibility-domain leakage, missing `exposes` / `hides`, ambiguous entrypoints, and deep imports that cross ownership.
- Stabilize the machine-readable surface with a versioned JSON report schema for diagnostics, graph, and review story across `axi check`, `axi observe`, and `axi diff`.

6. MCP timing recommendation

Not before one more refinement and a controlled larger backtest. MCP would expose the same interpretation gap to agents: unstructured warnings, ambiguous entrypoints without story context, and a graph that requires human distillation. Once `axi review --json` output is stable across several real-team adoptions, an MCP server can wrap that endpoint.

Suggested stabilization sequence:

1. Review story in JSON.
2. Larger backtest across at least one multi-team repository with a real `.axi` file.
3. MCP server as a thin wrapper over proven endpoints.

7. Decision

One more target refinement, then larger backtest.

The seed evidence does not support skipping straight to a broad public-reception or MCP backtest. The interpretation gap risks immediate rejection if tested on unready audiences.

8. What not to overclaim

- A green scan does not equal healthy architecture.
- Inferred entrypoints or source groups are guesses, not design recommendations.
- Quiet on ofetch and Preact Signals does not prove safety or correctness.
- Do not claim Axiom prevents architectural drift autonomously.
- Advisory warnings are not prescriptive must-fix items.
```

## Axiom Follow-Up Interpretation

The backtest accepts the recent trust repair: Axiom should keep avoiding overconfident rewrite advice inside broad inferred or collapsed modules.

The next product hole is now clearer:

- output already contains useful graph facts,
- but first-time users still need a short "what this means" story,
- and agents need the same story in stable JSON before MCP.

This does not require new enforcement semantics. The next refinement should make `observe` / `graph` / `diff` summaries name likely root-cause themes and provide a compact review story while preserving the warning details underneath.
