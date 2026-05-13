# ky-src Diff Architecture Smoke

Generated (UTC): 2026-05-13T02:07:54.982Z
Repository: https://github.com/sindresorhus/ky.git
Baseline: v1.14.0 (c52a694)
Current: v1.14.3 (eb5c3eb)
Source scope: include source/**; default excludes only
Inference: group-by folder, group-depth 2

This is a smoke test, not a verdict. The baseline contract is inferred from the baseline ref and reused as an external `--spec` against the current ref.

## Summary

| Ref | Commit | Package | Modules | Observed imports | Hard violations | Warnings |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| v1.14.0 | c52a694 | 1.14.0 | 1 | 0 | 0 | 0 |
| v1.14.3 | eb5c3eb | 1.14.3 | 1 | 0 | 0 | 0 |

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

- Clone baseline: 1144ms
- Clone current: 1270.2ms
- Infer baseline contract: 487.9ms
- Baseline graph: 472ms
- Diff JSON: 473ms
- Observe Markdown: 483ms

## Caveats

- The inferred baseline contract mirrors the baseline ref's current graph; it is not maintainer-declared architecture intent.
- New or removed edges are advisory drift signals, not automatic good/bad judgments.
- Warning counts are advisory pressure signals and do not fail CI by themselves.
- Use this harness to calibrate Axiom behavior before turning any signal into a hard gate.
