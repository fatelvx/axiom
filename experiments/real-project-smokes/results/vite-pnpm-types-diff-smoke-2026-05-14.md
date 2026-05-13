# vite-pnpm-types Diff Architecture Smoke

Generated (UTC): 2026-05-13T16:44:35.685Z
Repository: https://github.com/vitejs/vite.git
Baseline: v7.3.2 (cc383e0)
Current: v7.3.3 (ca31424)
Source scope: include packages/*/src/**; exclude packages/*/src/**/__tests__/**, packages/*/src/**/*.test.ts, packages/*/src/**/*.spec.ts, packages/*/src/**/*.test.tsx, packages/*/src/**/*.spec.tsx
Inference: group-by workspace

This is a smoke test, not a verdict. The baseline contract is inferred from the baseline ref and reused as an external `--spec` against the current ref.
Baseline-spec violations are mismatches against that inferred baseline contract, not judgments about the target repository.

## Summary

| Ref | Commit | Package | Modules | Observed imports | Baseline-spec violations | Warnings |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| v7.3.2 | cc383e0 | n/a | 3 | 3 | 0 | 0 |
| v7.3.3 | ca31424 | n/a | 3 | 3 | 0 | 0 |

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

- Clone baseline: 33179.4ms
- Clone current: 10712.6ms
- Infer baseline contract: 4055ms
- Baseline graph: 3059.8ms
- Diff JSON: 3166.3ms
- Observe Markdown: 2570.5ms

## Caveats

- The inferred baseline contract mirrors the baseline ref's current graph; it is not maintainer-declared architecture intent.
- New or removed edges are advisory drift signals, not automatic good/bad judgments.
- Warning counts are advisory pressure signals and do not fail CI by themselves.
- Use this harness to calibrate Axiom behavior before turning any signal into a hard gate.
