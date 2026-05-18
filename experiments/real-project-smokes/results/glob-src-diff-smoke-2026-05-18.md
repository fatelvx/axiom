# glob-src Diff Architecture Smoke

Generated (UTC): 2026-05-18T15:18:58.443Z
Repository: https://github.com/isaacs/node-glob.git
Baseline: v13.0.0 (3bfb960)
Current: v13.0.6 (e80cb38)
Source scope: include src/**; exclude src/**/*.test.ts, src/**/*.spec.ts, test/**, tap-snapshots/**
Inference: group-by folder, group-depth 2

This is a smoke test, not a verdict. The baseline contract is inferred from the baseline ref and reused as an external `--spec` against the current ref.
Baseline-spec violations are mismatches against that inferred baseline contract, not judgments about the target repository.

## Summary

| Ref | Commit | Package | Modules | Observed imports | Baseline-spec violations | Warnings |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| v13.0.0 | 3bfb960 | 13.0.0 | 1 | 0 | 0 | 0 |
| v13.0.6 | e80cb38 | 13.0.6 | 1 | 0 | 0 | 0 |

## Calibration Classification

- Repo shape: Small TypeScript Node package with dual CJS/ESM package surface and compact runtime source
- Safety posture: Clone-only source scan; no target installs, package-manager scripts, target tests, target builds, submodules, or npx were run.
- Scope question: Can a source-scoped inferred baseline make drift reviewable for a dual package surface without scanning generated dist output?
- Axiom command surface: axi infer --json + axi graph --json + axi diff + axi observe --baseline
- Main signal: Runtime source drift stays reviewable without package install; any CJS/ESM package-surface complexity is outside this source-scoped question.
- Gap class: quiet-control / scan-scope
- Decision: Record as mixed package-surface calibration evidence; do not change resolver behavior from one quiet source-scoped run.
- Code changed: No Axiom code changed; this is a no-install calibration run.
- Follow-up: If package export surface issues appear in another dual CJS/ESM package, compare against this quiet source-scoped control before implementing resolver changes.

## Baseline Inference

- Source files: 7
- Imports scanned: 37
- Candidate modules: 1
- Emitted modules: 1
- Inferred observed dependencies: 0
- Collapsed cycles: 0
- Architecture pressure notes: 0

### Inference Review Story
- Summary: Starter contract inferred 1 module and 0 observed module edges from 7 source files.
- Setup: Scanned 7 source files and 37 imports; 1 candidate group became 1 starter module. This is a current-graph snapshot, not declared architecture intent yet.
- `Quiet starter snapshot` (info): No cross-module import edges, collapsed cycles, or large-file pressure notes were found in this inference scope. Confirm the scan scope is the architecture you meant to model before saving a baseline.
- Next step: Rename modules, confirm inferred dependency evidence, then run `axi observe --root . --spec <draft.axi> --markdown` before saving a graph baseline.
- Caveat: Inference reads static imports and folder/package shape. It can lower authoring cost, but humans still decide module names, visibility, layers, accepted debt, and which edges are real architecture intent.

## Drift

- New observed edges: 0
- Removed observed edges: 0

### New Observed Edges
- None

### Removed Observed Edges
- None

## Advisory Signals

- Warning counts: none

## Timings

- Clone baseline: 14270.2ms
- Clone current: 10430.5ms
- Infer baseline contract: 9940.7ms
- Baseline graph: 11871.6ms
- Diff JSON: 11529.7ms
- Observe Markdown: 10733.7ms

## Caveats

- The inferred baseline contract mirrors the baseline ref's current graph; it is not maintainer-declared architecture intent.
- New or removed edges are advisory drift signals, not automatic good/bad judgments.
- Warning counts are advisory pressure signals and do not fail CI by themselves.
- Use this harness to calibrate Axiom behavior before turning any signal into a hard gate.
