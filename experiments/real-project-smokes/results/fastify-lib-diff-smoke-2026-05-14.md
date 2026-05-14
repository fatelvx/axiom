# fastify-lib Diff Architecture Smoke

Generated (UTC): 2026-05-14T07:59:29.480Z
Repository: https://github.com/fastify/fastify.git
Baseline: v5.4.0 (0111d0a)
Current: v5.5.0 (b84733e)
Source scope: include lib/**; exclude test/**, docs/**, examples/**, benchmark/**
Inference: group-by folder, group-depth 2

This is a smoke test, not a verdict. The baseline contract is inferred from the baseline ref and reused as an external `--spec` against the current ref.
Baseline-spec violations are mismatches against that inferred baseline contract, not judgments about the target repository.

## Summary

| Ref | Commit | Package | Modules | Observed imports | Baseline-spec violations | Warnings |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| v5.4.0 | 0111d0a | 5.4.0 | 1 | 0 | 0 | 0 |
| v5.5.0 | b84733e | 5.5.0 | 1 | 0 | 0 | 0 |

## Calibration Classification

- Repo shape: Node web framework package with plugin and runtime library modules
- Safety posture: Clone-only source scan; no target installs, package-manager scripts, target tests, target builds, submodules, or npx were run.
- Scope question: Can an inferred lib-scope baseline make minor-version architecture drift reviewable for a framework runtime package without target installs?
- Axiom command surface: axi infer --json + axi graph --json + axi diff + axi observe --baseline
- Main signal: The minor-version lib graph stayed quiet while infer preserved two large-file pressure notes for human review.
- Gap class: quiet-control / advisory-signal-calibration
- Decision: Do not change validator behavior; keep this as a quiet framework runtime control with intra-file pressure evidence.
- Code changed: No Axiom code changed; this is a no-install calibration run.
- Follow-up: Compare large-file pressure handling across framework/runtime packages before making it more prominent.

## Baseline Inference

- Source files: 28
- Imports scanned: 101
- Candidate modules: 1
- Emitted modules: 1
- Inferred observed dependencies: 0
- Collapsed cycles: 0
- Architecture pressure notes: 2

### Inference Review Story
- Summary: Starter contract inferred 1 module and 0 observed module edges from 28 source files.
- Setup: Scanned 28 source files and 101 imports; 1 candidate group became 1 starter module. This is a current-graph snapshot, not declared architecture intent yet.
- `Large-file pressure in inferred scope` (warning): 2 large source files may hide responsibilities that folder and import inference cannot split. Inspect these files before judging the starter module map as complete.
  - files: `lib/configValidator.js`, `lib/reply.js`
- Next step: Inspect large-file pressure notes, adjust module boundaries if needed, then run `axi observe --root . --spec <draft.axi> --markdown`.
- Caveat: Inference reads static imports and folder/package shape. It can lower authoring cost, but humans still decide module names, visibility, layers, accepted debt, and which edges are real architecture intent.

### Intra-File Pressure Notes
- `lib/configValidator.js`: 1105 lines, 1 function-like nodes, 0 imports
- `lib/reply.js`: 945 lines, 60 function-like nodes, 10 imports

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

- Clone baseline: 2634.2ms
- Clone current: 2878.1ms
- Infer baseline contract: 623.4ms
- Baseline graph: 640.7ms
- Diff JSON: 762.8ms
- Observe Markdown: 692.6ms

## Caveats

- The inferred baseline contract mirrors the baseline ref's current graph; it is not maintainer-declared architecture intent.
- New or removed edges are advisory drift signals, not automatic good/bad judgments.
- Warning counts are advisory pressure signals and do not fail CI by themselves.
- Use this harness to calibrate Axiom behavior before turning any signal into a hard gate.
