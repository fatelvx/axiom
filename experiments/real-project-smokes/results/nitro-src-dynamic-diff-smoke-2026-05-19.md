# nitro-src-dynamic Diff Architecture Smoke

Generated (UTC): 2026-05-18T18:02:44.604Z
Repository: https://github.com/unjs/nitro.git
Baseline: v2.9.6 (3cb566e)
Current: v2.9.7 (46b5a05)
Source scope: include src/**; exclude test/**, docs/**, examples/**, playground/**, **/*.test.ts, **/*.spec.ts
Inference: group-by folder

This is a smoke test, not a verdict. The baseline contract is inferred from the baseline ref and reused as an external `--spec` against the current ref.
Baseline-spec violations are mismatches against that inferred baseline contract, not judgments about the target repository.

## Summary

| Ref | Commit | Package | Modules | Observed imports | Baseline-spec violations | Warnings |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| v2.9.6 | 3cb566e | 2.9.5 | 2 | 11 | 0 | 4 |
| v2.9.7 | 46b5a05 | 2.9.5 | 2 | 11 | 0 | 4 |

## Calibration Classification

- Repo shape: TypeScript server framework/build tool with runtime presets, CLI lazy commands, and rollup dynamic-require helpers
- Safety posture: Clone-only source scan; no target installs, package-manager scripts, target tests, target builds, submodules, or npx were run.
- Scope question: Can Axiom's opt-in dynamic warning family identify non-literal runtime loading in production source without turning literal dynamic imports into warnings?
- Axiom command surface: axi infer --json + axi graph --json + axi diff + axi observe --baseline
- Main signal: Nitro source produced four focused dynamic dependency expressions for runtime/server entry loading and dynamic-require helper code, while literal dynamic imports stayed graph evidence rather than advisory warnings.
- Gap class: static-blind-spot / advisory-signal-calibration
- Decision: Record dynamic dependency warnings as useful review evidence for runtime loading blind spots; do not change scanner, resolver, or gate behavior from this run.
- Code changed: No Axiom validator code changed; this is a no-install dynamic calibration run.
- Follow-up: Compare with one more dynamic-heavy repo before making dynamic warnings more prominent in onboarding or release notes.

## Baseline Inference

- Source files: 158
- Imports scanned: 738
- Candidate modules: 8
- Emitted modules: 2
- Inferred observed dependencies: 1
- Collapsed cycles: 1
- Architecture pressure notes: 0

### Inference Review Story
- Summary: Starter contract inferred 2 modules and 1 observed module edge from 158 source files.
- Setup: Scanned 158 source files and 738 imports; 8 candidate groups became 2 starter modules. This is a current-graph snapshot, not declared architecture intent yet.
- `Collapsed cycle: MixedCycle` (warning): 1 cycle was merged so the starter contract mirrors current code without immediately failing on declared dependency cycles. Review cycle-breaking candidates before treating the merged module as intended architecture.
  - modules: `MixedCycle`
- `Review inferred dependencies` (info): 1 observed module edge became `depends on` lines with sample import evidence. Confirm each edge is intended before using this draft as a gate.
  - modules: `Cli`, `MixedCycle`
- Next step: Review collapsed-cycle candidates, rename or split merged modules if needed, then run `axi observe --root . --spec <draft.axi> --markdown`.
- Caveat: Inference reads static imports and folder/package shape. It can lower authoring cost, but humans still decide module names, visibility, layers, accepted debt, and which edges are real architecture intent.

### Collapsed Cycles
- `MixedCycle`: 7 source groups merged.
  - groups: `AppEntry`, `Dev`, `Presets`, `Rollup`, `Runtime`, `Types`, `Utils`
  - candidate `Presets -> AppEntry`: 35 import sites; sample `src/presets/alwaysdata.ts:1` importing `../preset`
  - candidate `Presets -> Types`: 15 import sites; sample `src/presets/aws-amplify.ts:5` importing `../types`
  - candidate `AppEntry -> Types`: 11 import sites; sample `src/build.ts:30` importing `./types`
  - candidate `Presets -> Utils`: 9 import sites; sample `src/presets/azure-functions.ts:4` importing `../utils`
  - candidate `Rollup -> Types`: 8 import sites; sample `src/rollup/config.ts:20` importing `../types`

## Drift

- New observed edges: 0
- Removed observed edges: 0

### New Observed Edges
- None

### Removed Observed Edges
- None

## Advisory Signals

- Warning counts: dynamic_dependency_expression: 4
- `dynamic_dependency_expression` at `src/prerender.ts:89`: MixedCycle has a non-literal import() expression that Axiom cannot resolve into the observed graph. Observed: MixedCycle dynamic dependency expression. Expression: `pathToFileURL(serverEntrypoint).href`.
- `dynamic_dependency_expression` at `src/rollup/plugins/dynamic-require.ts:64`: MixedCycle has a non-literal import() expression that Axiom cannot resolve into the observed graph. Observed: MixedCycle dynamic dependency expression. Expression: `pathToFileURL(wpManifest).href`.
- `dynamic_dependency_expression` at `src/rollup/plugins/dynamic-require.ts:92`: MixedCycle has a non-literal import() expression that Axiom cannot resolve into the observed graph. Observed: MixedCycle dynamic dependency expression. Expression: `pathToFileURL(src).href`.
- `dynamic_dependency_expression` at `src/storage.ts:14`: MixedCycle has a non-literal import() expression that Axiom cannot resolve into the observed graph. Observed: MixedCycle dynamic dependency expression. Expression: `builtinDrivers[opts.driver] || opts.driver`.

## Timings

- Clone baseline: 7941.9ms
- Clone current: 6271.8ms
- Infer baseline contract: 3907.7ms
- Baseline graph: 3212.2ms
- Diff JSON: 5359.1ms
- Observe Markdown: 2903.8ms

## Caveats

- The inferred baseline contract mirrors the baseline ref's current graph; it is not maintainer-declared architecture intent.
- New or removed edges are advisory drift signals, not automatic good/bad judgments.
- Warning counts are advisory pressure signals and do not fail CI by themselves.
- Use this harness to calibrate Axiom behavior before turning any signal into a hard gate.
