# express-lib Diff Architecture Smoke

Generated (UTC): 2026-05-14T08:04:34.447Z
Repository: https://github.com/expressjs/express.git
Baseline: 4.18.2 (8368dc1)
Current: 4.18.3 (1b51eda)
Source scope: include lib/**; exclude test/**, examples/**, benchmarks/**
Inference: group-by folder, group-depth 2

This is a smoke test, not a verdict. The baseline contract is inferred from the baseline ref and reused as an external `--spec` against the current ref.
Baseline-spec violations are mismatches against that inferred baseline contract, not judgments about the target repository.

## Summary

| Ref | Commit | Package | Modules | Observed imports | Baseline-spec violations | Warnings |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| 4.18.2 | 8368dc1 | 4.18.2 | 3 | 6 | 0 | 1 |
| 4.18.3 | 1b51eda | 4.18.3 | 3 | 6 | 0 | 1 |

## Calibration Classification

- Repo shape: CJS Node web framework package with lib entry modules
- Safety posture: Clone-only source scan; no target installs, package-manager scripts, target tests, target builds, submodules, or npx were run.
- Scope question: Can an inferred lib-scope baseline make patch-version architecture drift reviewable for a non-workspace CJS framework package?
- Axiom command surface: axi infer --json + axi graph --json + axi diff + axi observe --baseline
- Main signal: The patch-version lib graph stayed drift-quiet; one deep internal import advisory marks Express router entry wiring rather than a resolver gap.
- Gap class: quiet-control / advisory-signal-calibration
- Decision: Do not change validator behavior; keep this as a quiet-ish CJS framework control with one reviewable deep-import advisory.
- Code changed: No Axiom code changed; this is a no-install calibration run.
- Follow-up: Compare with other framework/tool packages before changing resolver or warning behavior.

## Baseline Inference

- Source files: 11
- Imports scanned: 86
- Candidate modules: 3
- Emitted modules: 3
- Inferred observed dependencies: 2
- Collapsed cycles: 0
- Architecture pressure notes: 1

### Inference Review Story
- Summary: Starter contract inferred 3 modules and 2 observed module edges from 11 source files.
- Setup: Scanned 11 source files and 86 imports; 3 candidate groups became 3 starter modules. This is a current-graph snapshot, not declared architecture intent yet.
- `Large-file pressure in inferred scope` (warning): 1 large source file may hide responsibilities that folder and import inference cannot split. Inspect these files before judging the starter module map as complete.
  - files: `lib/response.js`
- `Review inferred dependencies` (info): 2 observed module edges became `depends on` lines with sample import evidence. Confirm each edge is intended before using this draft as a gate.
  - modules: `Lib`, `LibMiddleware`, `LibRouter`
- Next step: Inspect large-file pressure notes, adjust module boundaries if needed, then run `axi observe --root . --spec <draft.axi> --markdown`.
- Caveat: Inference reads static imports and folder/package shape. It can lower authoring cost, but humans still decide module names, visibility, layers, accepted debt, and which edges are real architecture intent.

### Intra-File Pressure Notes
- `lib/response.js`: 1170 lines, 42 function-like nodes, 19 imports

## Drift

- New observed edges: 0
- Removed observed edges: 0

### New Observed Edges
- None

### Removed Observed Edges
- None

## Advisory Warnings

- Warning counts: deep_internal_import: 1
- `deep_internal_import` at `lib/express.js:19`: Lib imports LibRouter through a deep relative path instead of a likely source-group entry point. Observed: Lib -> LibRouter deep internal import. Edge: Lib -> LibRouter.

## Timings

- Clone baseline: 4347.6ms
- Clone current: 1709.1ms
- Infer baseline contract: 789.3ms
- Baseline graph: 786.8ms
- Diff JSON: 823.8ms
- Observe Markdown: 589.8ms

## Caveats

- The inferred baseline contract mirrors the baseline ref's current graph; it is not maintainer-declared architecture intent.
- New or removed edges are advisory drift signals, not automatic good/bad judgments.
- Warning counts are advisory pressure signals and do not fail CI by themselves.
- Use this harness to calibrate Axiom behavior before turning any signal into a hard gate.
