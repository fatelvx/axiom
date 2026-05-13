# MiroFish Targeted Backtest: Read-The-Graph Navigation And Pilot Card

Created: 2026-05-13T10:14:53.497389+00:00

Method: direct MiroFish `LLMClient` using the local configured model. This is a synthetic forecast and not real user research or a full OASIS social simulation run.

Seed: `experiments/axiom-forecast/seed-read-the-graph-pilot-card-target-2026-05-13.md`
Model: `deepseek-v4-pro` via `https://api.deepseek.com`
Commit: `2c31ddc` plus current working-tree documentation and replay changes
Note: Output requested ASCII punctuation; the saved excerpt below was cleaned for local Windows encoding artifacts.

## Forecast Output

```text
1. Executive verdict
The read-the-graph guide and pilot card reduce first-user confusion by giving structured interpretation steps and a concrete 10-minute path. The replay smokes show credible, non-overclaiming drift surfacing. A larger public backtest is premature; the guides need a small real-pilot sanity check before scaling.

2. Stakeholder reaction map
- First-time external developers: likely to find the three-question review loop and pilot card clearer than raw CLI output; may still bounce if they only see command names.
- Architects / tech leads: likely to appreciate the framing of graph as navigation, not a health score, plus the guard against treating inferred contracts as recommended architecture.
- Product / DX teams: may worry that React plus Pixi examples could imply hidden framework policy later; trust depends on preserving the no-hidden-rules promise.
- Security / compliance evaluators: should be comfortable with the advisory-only and opt-in-gate posture; the pilot-card agent instruction may raise mild data-flow questions but no immediate product risk.

3. Strongest improvement
The strongest improvement is the repeatable starting ritual:
1. hard violations / visible debt / warnings / drift?
2. which module is the graph center?
3. does the shape match expected architecture?

Combined with the 10-minute pilot card, this makes Axiom feel more like an architecture review assistant than a generic linter or dependency graph.

4. Remaining rejection pattern
Users who only see `axi observe` or `axi graph --mermaid` without opening the guides may still classify Axiom as just another dependency visualizer. `axi infer` can also be mistaken for a recommended-architecture generator if the snapshot caveat is not visible at the moment users create the draft.

5. Specific small fix
Reinforce the snapshot caveat at the exact `axi infer` moment. The terminal output should make clear that the draft is a snapshot of actual imports, not recommended architecture, and that users should review scope and intended layering before saving a baseline.

6. MCP timing recommendation
Hold. MCP should wait until the CLI and JSON surfaces, especially `axi observe --json` and `axi diff`, are stable after guide-based pilots. At least a few non-synthetic pilot sessions should show that users understand the reports and make correct next-action decisions.

7. Decision
One more target refinement. Run a small lightweight pilot with friendly external developers using the two guides and the existing CLI, then capture confusion moments and entry-point drop-off. Do not run a broad public-reception backtest until those guides demonstrably land.

8. What not to overclaim
- Axiom does not detect semantic architecture health. It surfaces import-graph evidence that differs from declared intent or drifted from a baseline.
- A green scan does not mean the architecture is healthy; it means the observed graph matches declared intent within the scanned scope.
- React plus Pixi questions are not framework-aware rules; they are prompts for a team to inspect its own intended shape.
- Axiom is not a drift-prevention system. It is an observability layer with visible debt and high-confidence gates.
```

## Axiom Follow-Up Interpretation

This target run accepts the navigation direction and says the next step is not a large MCP or public-reception backtest yet. It asks for one more target refinement around first-run comprehension.

The suggested `axi infer` snapshot banner is already implemented in current CLI output:

```text
# This starter contract mirrors the current dependency graph; it is not a recommended architecture.
# Review module names, collapsed cycles, visibility suggestions, and dependencies before treating it as intent.
# Use `axi check` only after the contract describes the architecture you want to protect.
```

The valid follow-up is therefore not to add a duplicate warning, but to make the pilot card point users at the first comments in the generated draft before they interpret the graph.
