# uuid-src Diff Architecture Smoke

Generated (UTC): 2026-05-14T08:13:02.324Z
Repository: https://github.com/uuidjs/uuid.git
Baseline: v11.0.5 (46ada3c)
Current: v11.1.1 (7269a96)
Source scope: include src/**; exclude src/test/**, src/**/*.test.ts, src/**/*.spec.ts, examples/**, test/**
Inference: group-by folder, group-depth 2

This is a smoke test, not a verdict. The baseline contract is inferred from the baseline ref and reused as an external `--spec` against the current ref.
Baseline-spec violations are mismatches against that inferred baseline contract, not judgments about the target repository.

## Summary

| Ref | Commit | Package | Modules | Observed imports | Baseline-spec violations | Warnings |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| v11.0.5 | 46ada3c | 11.0.5 | 1 | 0 | 0 | 0 |
| v11.1.1 | 7269a96 | 11.1.1 | 1 | 0 | 0 | 0 |

## Calibration Classification

- Repo shape: Small TypeScript package with runtime source and mixed package export surface
- Safety posture: Clone-only source scan; no target installs, package-manager scripts, target tests, target builds, submodules, or npx were run.
- Scope question: Can an inferred runtime-source baseline stay useful for a small package whose published surface supports multiple runtime import styles?
- Axiom command surface: axi infer --json + axi graph --json + axi diff + axi observe --baseline
- Main signal: The runtime source graph stayed drift-quiet after excluding source-tree tests; this is a low-noise mixed package-surface control.
- Gap class: quiet-control / scan-scope
- Decision: Do not change validator behavior; keep source-tree test folders explicit in small package pilots.
- Code changed: No Axiom code changed; this is a no-install calibration run.
- Follow-up: If package export surface issues appear later, compare against this low-noise UUID control before changing resolver behavior.

## Baseline Inference

- Source files: 27
- Imports scanned: 61
- Candidate modules: 1
- Emitted modules: 1
- Inferred observed dependencies: 0
- Collapsed cycles: 0
- Architecture pressure notes: 0

### Inference Review Story
- Summary: Starter contract inferred 1 module and 0 observed module edges from 27 source files.
- Setup: Scanned 27 source files and 61 imports; 1 candidate group became 1 starter module. This is a current-graph snapshot, not declared architecture intent yet.
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

## Advisory Warnings

- Warning counts: none

## Timings

- Clone baseline: 2411.3ms
- Clone current: 19729.2ms
- Infer baseline contract: 827.6ms
- Baseline graph: 624.5ms
- Diff JSON: 500.6ms
- Observe Markdown: 506ms

## Caveats

- The inferred baseline contract mirrors the baseline ref's current graph; it is not maintainer-declared architecture intent.
- New or removed edges are advisory drift signals, not automatic good/bad judgments.
- Warning counts are advisory pressure signals and do not fail CI by themselves.
- Use this harness to calibrate Axiom behavior before turning any signal into a hard gate.
