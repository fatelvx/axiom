## Axiom Architecture Diff

Status: drift detected
Review mode: baseline drift (advisory)

### Summary
- Modules: 6
- Observed dependencies: 77
- Hard violations in current graph: 0
- Intentional violations in current graph: 0
- Advisory warnings in current graph: 38
- Drift: 0 new observed edges, 2 removed observed edges

### Review Notes
- This is review output; use `axi check` when you want a CI gate.
- Diff compares current observed module edges with an unfiltered `axi graph --json` baseline.
- New and removed edges are advisory drift signals until your team promotes a policy explicitly.
- Run `axi observe --markdown` when you also want hard violations, visible debt, and advisory warnings.

### Architecture Drift (Advisory)
- Kind: `advisory_observed_edge_drift`
- Baseline: `C:/Users/邱品丰/AppData/Local/Temp/axiom-real-project-diff-smoke-kFmRUC/hono-v4.8.4-baseline.graph.json` (85 observed dependencies, axiom.graph.v9)
- New observed edges:
  - None
- Removed observed edges:
  - `RuntimeTests -> Vitest`
    - previously via `runtime-tests/bun/vitest.config.ts:3` importing `../../vitest.config`
    - previously via `runtime-tests/fastly/vitest.config.ts:4` importing `../../vitest.config`
    - previously via `runtime-tests/lambda-edge/vitest.config.ts:3` importing `../../vitest.config`
    - previously via `runtime-tests/lambda/vitest.config.ts:3` importing `../../vitest.config`
    - previously via `runtime-tests/node/vitest.config.ts:3` importing `../../vitest.config`
    - previously via `runtime-tests/workerd/vitest.config.ts:3` importing `../../vitest.config`
  - `Vitest2 -> Vitest`
    - previously via `.vitest.config/jsx-runtime-default.ts:1` importing `../vitest.config`
    - previously via `.vitest.config/jsx-runtime-dom.ts:1` importing `../vitest.config`
