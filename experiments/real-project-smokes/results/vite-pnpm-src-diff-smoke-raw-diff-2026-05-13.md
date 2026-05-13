## Axiom Architecture Diff

Status: no drift
Review mode: baseline drift (advisory)

### Summary
- Modules: 3
- Full observed dependencies: 0
- Hard violations in current graph: 0
- Intentional violations in current graph: 0
- Advisory warnings in current graph: 60
- Drift: 0 new observed edges, 0 removed observed edges

### Interpretation
- Headline: No hard contract failures, but 60 advisory warnings need review.
- Look first:
  - Hard signals: read `violations[]`, `intentionalDebt[]`, and `warnings[]` before judging the diagram.
  - Graph center: if no center appears, confirm the scan scope actually covers the architecture you care about.
  - Shape fit: compare central modules, deep imports, drift, and any intra-file pressure warnings with the architecture you expected for this repository.
- Central modules:
  - None observed in this scan scope.
- Caveat: This is a graph interpretation over static imports, not proof of semantic architecture health. Compare it with the architecture you intended.

### Review Story
- Summary: No hard gate failures. Start review with unresolved_import around Vite: 60 advisory warnings share this root.
- Setup: Scanned 3 declared modules and 0 observed import edges. This report is advisory unless you run `axi check` as the gate.
- Pressures:
  - `unresolved_import around Vite` (review): 60 advisory warnings share this root.
- Next step: Inspect unresolved_import around Vite; decide whether to change code, clarify .axi visibility rules, or keep the signal advisory.
- Caveat: This story is a review aid over static imports. It points to likely pressure, not proof that the architecture is good or bad; a quiet import graph can still hide intra-file responsibility concentration.

### Review Notes
- This is review output; use `axi check` when you want a CI gate.
- Diff compares current observed module edges with an unfiltered `axi graph --json` baseline.
- New and removed edges are advisory drift signals until your team promotes a policy explicitly.
- Run `axi observe --markdown` when you also want hard violations, visible debt, and advisory warnings.

### Architecture Drift (Advisory)
- Kind: `advisory_observed_edge_drift`
- Baseline: `C:/Users/邱品丰/AppData/Local/Temp/axiom-real-project-diff-smoke-i74jWL/vite-pnpm-src-v7.3.2-baseline.graph.json` (0 observed dependencies, axiom.graph.v12)
- New observed edges:
  - None
- Removed observed edges:
  - None
