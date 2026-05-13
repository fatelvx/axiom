# headlessui-react-src-depth4 Diff Architecture Smoke

Generated (UTC): 2026-05-13T20:16:53.175Z
Repository: https://github.com/tailwindlabs/headlessui.git
Baseline: @headlessui/react@v2.2.8 (8759a5c)
Current: @headlessui/react@v2.2.9 (589ea90)
Source scope: include packages/@headlessui-react/src/**; exclude packages/@headlessui-react/src/**/*.test.ts, packages/@headlessui-react/src/**/*.test.tsx, packages/@headlessui-react/src/**/*.spec.ts, packages/@headlessui-react/src/**/*.spec.tsx, packages/@headlessui-react/src/test-utils/**
Inference: group-by folder, group-depth 4

This is a smoke test, not a verdict. The baseline contract is inferred from the baseline ref and reused as an external `--spec` against the current ref.
Baseline-spec violations are mismatches against that inferred baseline contract, not judgments about the target repository.

## Summary

| Ref | Commit | Package | Modules | Observed imports | Baseline-spec violations | Warnings |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| @headlessui/react@v2.2.8 | 8759a5c | 0.0.0 | 1 | 0 | 0 | 0 |
| @headlessui/react@v2.2.9 | 589ea90 | 0.0.0 | 1 | 0 | 0 | 0 |

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

- Clone baseline: 1949.2ms
- Clone current: 5554.9ms
- Infer baseline contract: 1230.1ms
- Baseline graph: 1179.1ms
- Diff JSON: 1364.7ms
- Observe Markdown: 1161.5ms

## Caveats

- The inferred baseline contract mirrors the baseline ref's current graph; it is not maintainer-declared architecture intent.
- New or removed edges are advisory drift signals, not automatic good/bad judgments.
- Warning counts are advisory pressure signals and do not fail CI by themselves.
- Use this harness to calibrate Axiom behavior before turning any signal into a hard gate.
