# zustand Diff Architecture Smoke

Generated (UTC): 2026-05-13T01:52:04.876Z
Repository: https://github.com/pmndrs/zustand.git
Baseline: v5.0.1 (c87a5d6)
Current: v5.0.13 (6bc451e)
Source scope: include all supported source; default excludes only

This is a smoke test, not a verdict. The baseline contract is inferred from the baseline ref and reused as an external `--spec` against the current ref.
Baseline-spec violations are mismatches against that inferred baseline contract, not judgments about the target repository.

## Summary

| Ref | Commit | Package | Modules | Observed imports | Baseline-spec violations | Warnings |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| v5.0.1 | c87a5d6 | 5.0.1 | 5 | 36 | 0 | 0 |
| v5.0.13 | 6bc451e | 5.0.13 | 5 | 40 | 0 | 0 |

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

- Clone baseline: 8563.8ms
- Clone current: 1285.1ms
- Infer baseline contract: 499ms
- Baseline graph: 510.6ms
- Diff JSON: 515.8ms
- Observe Markdown: 614.6ms

## Caveats

- The inferred baseline contract mirrors the baseline ref's current graph; it is not maintainer-declared architecture intent.
- New or removed edges are advisory drift signals, not automatic good/bad judgments.
- Warning counts are advisory pressure signals and do not fail CI by themselves.
- Use this harness to calibrate Axiom behavior before turning any signal into a hard gate.
