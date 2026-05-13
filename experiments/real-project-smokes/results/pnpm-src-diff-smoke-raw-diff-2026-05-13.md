## Axiom Architecture Diff

Status: drift detected
Review mode: baseline drift (advisory)

### Summary
- Modules: 174
- Full observed dependencies: 1499
- Hard violations in current graph: 0
- Intentional violations in current graph: 0
- Advisory warnings in current graph: 124
- Drift: 0 new observed edges, 4 removed observed edges

### Interpretation
- Headline: No hard contract failures, but 124 advisory warnings need review; graph center is Types.
- Look first:
  - Hard signals: read `violations[]`, `intentionalDebt[]`, and `warnings[]` before judging the diagram.
  - Graph center: inspect Types; it carries the strongest observed coupling in this scan.
  - Shape fit: compare central modules, deep imports, drift, and any intra-file pressure warnings with the architecture you expected for this repository.
- Central modules:
  - `Types` (fan in hub): 198 import sites, fan-in 95, fan-out 0
  - `Error` (fan in hub): 123 import sites, fan-in 64, fan-out 1
  - `Logger` (fan in hub): 107 import sites, fan-in 49, fan-out 0
- Caveat: This is a graph interpretation over static imports, not proof of semantic architecture health. Compare it with the architecture you intended.

### Review Story
- Summary: No hard gate failures. Start review with Coupling concentration around AssertProject: 1 concentration warning suggest this module may be becoming a coordination hub.
- Setup: Scanned 174 declared modules and 1499 observed import edges. This report is advisory unless you run `axi check` as the gate.
- Pressures:
  - `Coupling concentration around AssertProject` (review): 1 concentration warning suggest this module may be becoming a coordination hub.
  - `Coupling concentration around Audit` (review): 1 concentration warning suggest this module may be becoming a coordination hub.
  - `Coupling concentration around BuildModules` (review): 1 concentration warning suggest this module may be becoming a coordination hub.
- Next step: Inspect Coupling concentration around AssertProject; decide whether to change code, clarify .axi visibility rules, or keep the signal advisory.
- Caveat: This story is a review aid over static imports. It points to likely pressure, not proof that the architecture is good or bad; a quiet import graph can still hide intra-file responsibility concentration.

### Review Notes
- This is review output; use `axi check` when you want a CI gate.
- Diff compares current observed module edges with an unfiltered `axi graph --json` baseline.
- New and removed edges are advisory drift signals until your team promotes a policy explicitly.
- Run `axi observe --markdown` when you also want hard violations, visible debt, and advisory warnings.

### Architecture Drift (Advisory)
- Kind: `advisory_observed_edge_drift`
- Baseline: `C:/Users/邱品丰/AppData/Local/Temp/axiom-real-project-diff-smoke-WAfxJI/pnpm-src-v10.8.1-baseline.graph.json` (1502 observed dependencies, axiom.graph.v12)
- New observed edges:
  - None
- Removed observed edges:
  - `Core -> WhichVersionIsPinned`
    - previously via `pkg-manager/core/src/parseWantedDependencies.ts:3` importing `@pnpm/which-version-is-pinned`
  - `ManifestUtils -> Error`
    - previously via `pkg-manifest/manifest-utils/src/getPref.ts:1` importing `@pnpm/error`
  - `ResolveDependencies -> PickFetcher`
    - previously via `pkg-manager/resolve-dependencies/src/updateProjectManifest.ts:9` importing `@pnpm/pick-fetcher`
  - `ResolveDependencies -> WhichVersionIsPinned`
    - previously via `pkg-manager/resolve-dependencies/src/getWantedDependencies.ts:8` importing `@pnpm/which-version-is-pinned`
