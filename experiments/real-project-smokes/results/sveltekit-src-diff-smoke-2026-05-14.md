# sveltekit-src Diff Architecture Smoke

Generated (UTC): 2026-05-14T08:03:12.602Z
Repository: https://github.com/sveltejs/kit.git
Baseline: @sveltejs/kit@2.38.0 (54e10cf)
Current: @sveltejs/kit@2.39.1 (648007f)
Source scope: include packages/kit/src/**; exclude packages/kit/src/**/*.test.ts, packages/kit/src/**/*.test.js, packages/kit/src/**/*.spec.ts, packages/kit/src/**/*.spec.js, packages/kit/test/**, documentation/**, examples/**
Inference: group-by folder, group-depth 3

This is a smoke test, not a verdict. The baseline contract is inferred from the baseline ref and reused as an external `--spec` against the current ref.
Baseline-spec violations are mismatches against that inferred baseline contract, not judgments about the target repository.

## Summary

| Ref | Commit | Package | Modules | Observed imports | Baseline-spec violations | Warnings |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| @sveltejs/kit@2.38.0 | 54e10cf | 0.0.1 | 1 | 0 | 0 | 0 |
| @sveltejs/kit@2.39.1 | 648007f | 0.0.1 | 1 | 0 | 0 | 0 |

## Calibration Classification

- Repo shape: Framework package source inside a larger repository with routing, runtime, build, and adapter surfaces
- Safety posture: Clone-only source scan; no target installs, package-manager scripts, target tests, target builds, submodules, or npx were run.
- Scope question: Can an inferred package-source baseline make framework package drift reviewable without scanning docs, examples, tests, or target installs?
- Axiom command surface: axi infer --json + axi graph --json + axi diff + axi observe --baseline
- Main signal: The framework package source graph stayed drift-quiet; inference still preserved large-file pressure notes for Vite integration and type-generation surfaces.
- Gap class: quiet-control / scan-scope
- Decision: Do not change validator behavior; keep source/test scope explicit for framework package pilots.
- Code changed: No Axiom code changed; this is a no-install calibration run.
- Follow-up: Compare with app-repo and generated-code-heavy smokes before changing scan defaults or advisory prominence.

## Baseline Inference

- Source files: 193
- Imports scanned: 540
- Candidate modules: 1
- Emitted modules: 1
- Inferred observed dependencies: 0
- Collapsed cycles: 0
- Architecture pressure notes: 4

### Inference Review Story
- Summary: Starter contract inferred 1 module and 0 observed module edges from 193 source files.
- Setup: Scanned 193 source files and 540 imports; 1 candidate group became 1 starter module. This is a current-graph snapshot, not declared architecture intent yet.
- `Large-file pressure in inferred scope` (warning): 4 large source files may hide responsibilities that folder and import inference cannot split. Inspect these files before judging the starter module map as complete.
  - files: `packages/kit/src/runtime/client/client.js`, `packages/kit/src/core/postbuild/entities.js`, `packages/kit/src/exports/vite/index.js`, `packages/kit/src/core/sync/write_types/index.js`
- Next step: Inspect large-file pressure notes, adjust module boundaries if needed, then run `axi observe --root . --spec <draft.axi> --markdown`.
- Caveat: Inference reads static imports and folder/package shape. It can lower authoring cost, but humans still decide module names, visibility, layers, accepted debt, and which edges are real architecture intent.

### Intra-File Pressure Notes
- `packages/kit/src/runtime/client/client.js`: 3097 lines, 155 function-like nodes, 20 imports
- `packages/kit/src/core/postbuild/entities.js`: 2253 lines, 4 function-like nodes, 0 imports
- `packages/kit/src/exports/vite/index.js`: 1386 lines, 51 function-like nodes, 29 imports
- `packages/kit/src/core/sync/write_types/index.js`: 874 lines, 32 function-like nodes, 7 imports

## Drift

- New observed edges: 0
- Removed observed edges: 0

### New Observed Edges
- None

### Removed Observed Edges
- None

## Advisory Warnings

- Warning counts: none

## Timings

- Clone baseline: 7593.2ms
- Clone current: 10635.2ms
- Infer baseline contract: 1370.7ms
- Baseline graph: 1266.7ms
- Diff JSON: 1237.4ms
- Observe Markdown: 1225.1ms

## Caveats

- The inferred baseline contract mirrors the baseline ref's current graph; it is not maintainer-declared architecture intent.
- New or removed edges are advisory drift signals, not automatic good/bad judgments.
- Warning counts are advisory pressure signals and do not fail CI by themselves.
- Use this harness to calibrate Axiom behavior before turning any signal into a hard gate.
