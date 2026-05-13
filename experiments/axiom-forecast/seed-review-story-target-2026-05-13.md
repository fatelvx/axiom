# Axiom Targeted Forecast Seed: Review Story JSON

Created: 2026-05-13

Status: targeted synthetic forecast seed, not real user research.

This seed evaluates Axiom after adding `architectureSummary.reviewStory` to graph / observe / diff output.

## Product Snapshot

Axiom is an architecture observability layer with explicit contracts for AI-era codebases.

Core model:

- `.axi` declares architecture intent.
- Source scanning observes TypeScript/JavaScript imports.
- Axiom compares declared graph vs observed graph.
- `axi check` is the hard gate.
- `axi observe`, `axi graph`, `axi diff`, Markdown, Mermaid, and JSON are advisory review / observability surfaces.
- Intentional violations are visible accepted debt with expiration dates and reasons.
- Advisory warnings stay advisory until teams explicitly promote a low-noise rule into a gate.

Guardrails:

- Axiom is a guardrail layer, not a complete architecture oracle.
- A green scan means the observed graph matches declared intent within scanned scope; it does not prove architecture health.
- Inferred contracts mirror current imports; they are not recommended architecture.
- Review-story output is guidance over static imports, not a semantic health score, hidden framework policy, or auto-repair system.
- MCP should be a thin future wrapper over stable CLI / JSON surfaces, not a separate prompt wrapper.

## Change Under Test

The previous target backtest accepted the Lumina trust repair but said Axiom still needed a short "review story" before a larger public-reception / MCP backtest.

Axiom now adds `architectureSummary.reviewStory` and bumps graph JSON to `axiom.graph.v12`.

The review story includes:

- `summary`: a compact story of what the scan means.
- `setup`: scan size and a reminder that graph / observe output is advisory unless `axi check` is used as the gate.
- `pressures[]`: top review pressures, such as hard failures, visible debt, warning roots, baseline drift, or a quiet graph center.
- `nextStep`: the first action a human or agent should take.
- `caveat`: a reminder that the story is static import-graph guidance, not semantic architecture proof.

Human and Markdown output now show the same story before detailed diagnostics.

Example warning-heavy human output:

```text
story: No hard gate failures. Start review with Public-entry bypass in Lib: 2 deep imports bypass a likely source-group entrypoint; review whether the import should use the public boundary or be declared intentional.
review story:
  - Public-entry bypass in Lib: 2 deep imports bypass a likely source-group entrypoint; review whether the import should use the public boundary or be declared intentional.
  next: Inspect Public-entry bypass in Lib; decide whether to change code, clarify .axi visibility rules, or keep the signal advisory.
```

Example broad collapsed-module JSON output:

```json
{
  "schemaVersion": "axiom.graph.v12",
  "architectureSummary": {
    "reviewStory": {
      "summary": "No hard gate failures. Start review with State/store leakage into ServicesCycle: 1 deep import target state or store internals; review whether state should be injected, evented, or exposed through an explicit boundary.",
      "setup": "Scanned 2 declared modules and 1 observed import edge. This report is advisory unless you run `axi check` as the gate.",
      "pressures": [
        {
          "kind": "advisory_warning_root",
          "title": "State/store leakage into ServicesCycle",
          "severity": "review",
          "count": 1,
          "code": "deep_internal_import",
          "modules": ["ServicesCycle"]
        }
      ],
      "nextStep": "Inspect State/store leakage into ServicesCycle; decide whether to change code, clarify .axi visibility rules, or keep the signal advisory.",
      "caveat": "This story is a review aid over static imports. It points to likely pressure, not proof that the architecture is good or bad."
    }
  }
}
```

Example quiet graph output:

```text
story: This scoped graph is quiet. Confirm the graph center matches intended architecture before saving or updating a baseline.
review story:
  - Quiet graph center: Physics: No hard failures, visible debt, advisory warnings, or drift were reported; compare this center with the architecture you expected before saving a baseline.
  next: Confirm scan scope and intended graph shape, then save a baseline with `axi graph --json` if this is the shape to watch.
```

## Verification

`npm run alpha:check` passed after the change:

- 179 tests passed.
- Axiom self-contract passed.
- GitHub Actions smoke passed.
- npm pack dry-run passed.

## Target Questions

Please answer as a MiroFish-style synthetic risk map. Do not treat this as real user research. Do not hallucinate features Axiom does not have. Do not recommend broad new enforcement semantics, auto-accepted debt, or semantic architecture scoring.

Evaluate:

1. Does `architectureSummary.reviewStory` address the "117 warnings and a graph" / "did I use it correctly?" rejection pattern enough for another larger backtest?
2. Does this make Axiom visibly more than a linter / Dependency Cruiser / generic graph visualizer?
3. Is `axiom.graph.v12` with review story stable enough for agents and a future MCP wrapper, or is another CLI / JSON refinement needed first?
4. What is the remaining highest-risk misunderstanding after this change?
5. Should Axiom now run a larger public-reception / MCP backtest, or still do another target refinement?

Return:

1. Executive verdict.
2. Stakeholder reaction map.
3. What improved.
4. Remaining rejection pattern.
5. MCP timing recommendation.
6. Decision: larger backtest now, one more target refinement, or hold.
7. What not to overclaim.
