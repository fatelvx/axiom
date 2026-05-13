# zod Diff Architecture Smoke

Generated (UTC): 2026-05-13T00:58:11.836Z
Repository: https://github.com/colinhacks/zod.git
Baseline: v4.0.1 (b259211)
Current: v4.4.3 (1fb56a5)

This is a smoke test, not a verdict. The baseline contract is inferred from the baseline ref and reused as an external `--spec` against the current ref.
Baseline-spec violations are mismatches against that inferred baseline contract, not judgments about the target repository.

## Summary

| Ref | Commit | Package | Modules | Observed imports | Baseline-spec violations | Warnings |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| v4.0.1 | b259211 | n/a | 15 | 51 | 0 | 2 |
| v4.4.3 | 1fb56a5 | n/a | 15 | 54 | 0 | 2 |

## Drift

- New observed edges: 0
- Removed observed edges: 1

### New Observed Edges
- None

### Removed Observed Edges
- `ZodVitest -> Vitest`
  - previously via `packages/zod/vitest.config.ts:2` importing `../../vitest.root.mjs`

## Advisory Warnings

- Warning counts: coupling_concentration: 1, deep_internal_import: 1
- `coupling_concentration` at `no location`: Zod has concentrated fan-in from 5 modules. Observed: Zod fan-in from 5 modules. Incoming: Benchmarks, Play, Resolution, Scripts, Treeshaking.
- `deep_internal_import` at `scripts/check-versions.ts:4`: Scripts imports Zod through a deep relative path instead of a likely entry point. Observed: Scripts -> Zod deep internal import. Edge: Scripts -> Zod.

## Timings

- Clone baseline: 3284.7ms
- Clone current: 3900.2ms
- Infer baseline contract: 1452.4ms
- Baseline graph: 1432.2ms
- Diff JSON: 1696.2ms
- Observe Markdown: 1679.2ms

## Caveats

- The inferred baseline contract mirrors the baseline ref's current graph; it is not maintainer-declared architecture intent.
- New or removed edges are advisory drift signals, not automatic good/bad judgments.
- Warning counts are advisory pressure signals and do not fail CI by themselves.
- Use this harness to calibrate Axiom behavior before turning any signal into a hard gate.
