# preact-signals-src-v11 Diff Architecture Smoke

Generated (UTC): 2026-05-13T10:09:15.809Z
Repository: https://github.com/preactjs/signals.git
Baseline: @preact/signals@2.7.0 (28b5900)
Current: @preact/signals@2.9.0 (16b270a)
Source scope: include packages/*/src/**; default excludes only
Inference: group-by workspace

This is a smoke test, not a verdict. The baseline contract is inferred from the baseline ref and reused as an external `--spec` against the current ref.
Baseline-spec violations are mismatches against that inferred baseline contract, not judgments about the target repository.

## Summary

| Ref | Commit | Package | Modules | Observed imports | Baseline-spec violations | Warnings |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| @preact/signals@2.7.0 | 28b5900 | n/a | 8 | 12 | 0 | 1 |
| @preact/signals@2.9.0 | 16b270a | n/a | 8 | 17 | 1 | 1 |

## Drift

- New observed edges: 1
- Removed observed edges: 0

### New Observed Edges
- `Signals -> SignalsDebug` (undeclared_dependency)
  - via `packages/preact/src/internal.ts:3` importing `../../debug/src/devtools`

### Removed Observed Edges
- None

## Advisory Warnings

- Warning counts: deep_internal_import: 1
- `deep_internal_import` at `packages/preact/src/internal.ts:3`: Signals imports SignalsDebug through a deep relative path instead of a likely entry point. Observed: Signals -> SignalsDebug deep internal import. Edge: Signals -> SignalsDebug.

## Timings

- Clone baseline: 1429.5ms
- Clone current: 1530.7ms
- Infer baseline contract: 1214.7ms
- Baseline graph: 760.8ms
- Diff JSON: 818.4ms
- Observe Markdown: 804.2ms

## Caveats

- The inferred baseline contract mirrors the baseline ref's current graph; it is not maintainer-declared architecture intent.
- New or removed edges are advisory drift signals, not automatic good/bad judgments.
- Warning counts are advisory pressure signals and do not fail CI by themselves.
- Use this harness to calibrate Axiom behavior before turning any signal into a hard gate.
