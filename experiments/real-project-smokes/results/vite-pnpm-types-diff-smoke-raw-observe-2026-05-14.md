## Axiom Architecture Review

Status: clear
Review mode: observe (advisory)

### Summary
- Modules: 3
- Declared dependencies: 1
- Shown dependency edges: 0
- Full observed dependencies: 3
- Hard violations: 0
- Intentional violations: 0
- Advisory warnings: 0
- Drift: 0 new observed edges, 0 removed observed edges

### Interpretation
- Headline: This scoped import graph is quiet: no hard failures, visible debt, advisory warnings, or baseline drift were reported; graph center is PluginLegacy, so compare that center with your intended architecture before saving a baseline. Quiet imports do not prove intra-file responsibilities are healthy.
- Look first:
  - Hard signals: read `violations[]`, `intentionalDebt[]`, and `warnings[]` before judging the diagram.
  - Graph center: inspect PluginLegacy; it carries the strongest observed coupling in this scan.
  - Shape fit: compare central modules, deep imports, drift, and any intra-file pressure warnings with the architecture you expected for this repository.
- Central modules:
  - `PluginLegacy` (fan out hub): 3 import sites, fan-in 0, fan-out 1
  - `Vite` (fan in hub): 3 import sites, fan-in 1, fan-out 0
- Caveat: This is a graph interpretation over static imports, not proof of semantic architecture health. Compare it with the architecture you intended.

### Review Story
- Summary: This scoped import graph is quiet. Confirm the graph center matches intended architecture before saving or updating a baseline; quiet imports do not prove intra-file responsibilities are healthy.
- Setup: Scanned 3 declared modules and 3 observed import edges. This report is advisory unless you run `axi check` as the gate.
- Pressures:
  - `Quiet graph center: PluginLegacy` (info): No hard failures, visible debt, advisory warnings, or drift were reported; compare this center with the architecture you expected before saving a baseline.
- Next step: Confirm scan scope and intended graph shape, then save a baseline with `axi graph --json` if this is the shape to watch.
- Caveat: This story is a review aid over static imports. It points to likely pressure, not proof that the architecture is good or bad; a quiet import graph can still hide intra-file responsibility concentration.

### Review Notes
- This is review output; use `axi check` when you want a CI gate.
- Hard violations are contract failures.
- Intentional violations, warnings, and drift are visible debt or advisory signals.
- Advisory warning counts include only warning checks enabled for this command or config.
- Axiom does not auto-accept debt; accepted debt must be declared in `.axi` with an expiration date and reason.
- Expired or invalid intentional violations are hard contract failures in `axi check`.
- Dependency summaries separate shown attention edges from the full observed graph.

### Hard Violations
- None

### Visible Intentional Debt
- None

### Advisory Warnings
- None

### Architecture Drift (Advisory)
- Kind: `advisory_observed_edge_drift`
- Baseline: `C:/Users/邱品丰/AppData/Local/Temp/axiom-real-project-diff-smoke-IFuen7/vite-pnpm-types-v7.3.2-baseline.graph.json` (3 observed dependencies, axiom.graph.v12)
- New observed edges:
  - None
- Removed observed edges:
  - None
