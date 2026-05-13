# ofetch-src Diff Architecture Smoke

Generated (UTC): 2026-05-13T02:07:37.074Z
Repository: https://github.com/unjs/ofetch.git
Baseline: v1.4.0 (9c1723a)
Current: v1.5.1 (d61b2fc)
Source scope: include src/**; default excludes only
Inference: group-by folder, group-depth 2

This is a smoke test, not a verdict. The baseline contract is inferred from the baseline ref and reused as an external `--spec` against the current ref.

## Summary

| Ref | Commit | Package | Modules | Observed imports | Hard violations | Warnings |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| v1.4.0 | 9c1723a | 1.4.0 | 1 | 0 | 0 | 0 |
| v1.5.1 | d61b2fc | 2.0.0-alpha.3 | 1 | 0 | 0 | 0 |

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

- Clone baseline: 1094.3ms
- Clone current: 1083.1ms
- Infer baseline contract: 437.3ms
- Baseline graph: 445.5ms
- Diff JSON: 434.5ms
- Observe Markdown: 441.4ms

## Caveats

- The inferred baseline contract mirrors the baseline ref's current graph; it is not maintainer-declared architecture intent.
- New or removed edges are advisory drift signals, not automatic good/bad judgments.
- Warning counts are advisory pressure signals and do not fail CI by themselves.
- Use this harness to calibrate Axiom behavior before turning any signal into a hard gate.
