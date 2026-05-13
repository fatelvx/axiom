# hono-src Diff Architecture Smoke

Generated (UTC): 2026-05-13T01:51:39.887Z
Repository: https://github.com/honojs/hono.git
Baseline: v4.8.4 (530ab09)
Current: v4.9.12 (4b796cf)
Source scope: include src/**; default excludes only

This is a smoke test, not a verdict. The baseline contract is inferred from the baseline ref and reused as an external `--spec` against the current ref.
Baseline-spec violations are mismatches against that inferred baseline contract, not judgments about the target repository.

## Summary

| Ref | Commit | Package | Modules | Observed imports | Baseline-spec violations | Warnings |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| v4.8.4 | 530ab09 | 4.8.4 | 3 | 14 | 0 | 6 |
| v4.9.12 | 4b796cf | 4.9.12 | 3 | 14 | 0 | 6 |

## Drift

- New observed edges: 0
- Removed observed edges: 0

### New Observed Edges
- None

### Removed Observed Edges
- None

## Advisory Warnings

- Warning counts: deep_internal_import: 6
- `deep_internal_import` at `src/preset/quick.ts:6`: Preset imports MixedCycle through a deep relative path instead of a likely entry point. Observed: Preset -> MixedCycle deep internal import. Edge: Preset -> MixedCycle.
- `deep_internal_import` at `src/preset/quick.ts:7`: Preset imports MixedCycle through a deep relative path instead of a likely entry point. Observed: Preset -> MixedCycle deep internal import. Edge: Preset -> MixedCycle.
- `deep_internal_import` at `src/preset/quick.ts:11`: Preset imports MixedCycle through a deep relative path instead of a likely entry point. Observed: Preset -> MixedCycle deep internal import. Edge: Preset -> MixedCycle.
- `deep_internal_import` at `src/preset/tiny.ts:6`: Preset imports MixedCycle through a deep relative path instead of a likely entry point. Observed: Preset -> MixedCycle deep internal import. Edge: Preset -> MixedCycle.
- `deep_internal_import` at `src/preset/tiny.ts:7`: Preset imports MixedCycle through a deep relative path instead of a likely entry point. Observed: Preset -> MixedCycle deep internal import. Edge: Preset -> MixedCycle.
- `deep_internal_import` at `src/preset/tiny.ts:9`: Preset imports MixedCycle through a deep relative path instead of a likely entry point. Observed: Preset -> MixedCycle deep internal import. Edge: Preset -> MixedCycle.

## Timings

- Clone baseline: 2015.4ms
- Clone current: 1965.8ms
- Infer baseline contract: 1320.5ms
- Baseline graph: 1334.6ms
- Diff JSON: 1521.6ms
- Observe Markdown: 1606.3ms

## Caveats

- The inferred baseline contract mirrors the baseline ref's current graph; it is not maintainer-declared architecture intent.
- New or removed edges are advisory drift signals, not automatic good/bad judgments.
- Warning counts are advisory pressure signals and do not fail CI by themselves.
- Use this harness to calibrate Axiom behavior before turning any signal into a hard gate.
