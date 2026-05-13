# ofetch-src-v11 Diff Architecture Smoke

Generated (UTC): 2026-05-13T10:08:53.984Z
Repository: https://github.com/unjs/ofetch.git
Baseline: v1.4.0 (9c1723a)
Current: v1.5.1 (d61b2fc)
Source scope: include src/**; default excludes only
Inference: group-by folder, group-depth 2

This is a smoke test, not a verdict. The baseline contract is inferred from the baseline ref and reused as an external `--spec` against the current ref.
Baseline-spec violations are mismatches against that inferred baseline contract, not judgments about the target repository.

## Summary

| Ref | Commit | Package | Modules | Observed imports | Baseline-spec violations | Warnings |
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

- Clone baseline: 1257.4ms
- Clone current: 1114.3ms
- Infer baseline contract: 564.2ms
- Baseline graph: 663ms
- Diff JSON: 555.8ms
- Observe Markdown: 539.4ms

## Caveats

- The inferred baseline contract mirrors the baseline ref's current graph; it is not maintainer-declared architecture intent.
- New or removed edges are advisory drift signals, not automatic good/bad judgments.
- Warning counts are advisory pressure signals and do not fail CI by themselves.
- Use this harness to calibrate Axiom behavior before turning any signal into a hard gate.
