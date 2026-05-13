## Axiom Architecture Review

Status: clear
Review mode: observe (advisory)

### Summary
- Modules: 5
- Declared dependencies: 2
- Observed dependencies: 0 of 40
- Hard violations: 0
- Intentional violations: 0
- Advisory warnings: 0
- Drift: 0 new observed edges, 0 removed observed edges

### Review Notes
- This is review output; use `axi check` when you want a CI gate.
- Hard violations are contract failures.
- Intentional violations, warnings, and drift are visible debt or advisory signals.
- Axiom does not auto-accept debt; accepted debt must be declared in `.axi` with an expiration date and reason.
- Expired or invalid intentional violations are hard contract failures in `axi check`.
- Observed dependencies are filtered to attention edges; the summary keeps the full count.

### Hard Violations
- None

### Visible Intentional Debt
- None

### Advisory Warnings
- None

### Architecture Drift (Advisory)
- Kind: `advisory_observed_edge_drift`
- Baseline: `C:/Users/邱品丰/AppData/Local/Temp/axiom-real-project-diff-smoke-gO1Ies/zustand-v5.0.1-baseline.graph.json` (36 observed dependencies, axiom.graph.v9)
- New observed edges:
  - None
- Removed observed edges:
  - None
