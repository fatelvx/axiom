# hono Diff Architecture Smoke

Generated (UTC): 2026-05-13T01:52:29.223Z
Repository: https://github.com/honojs/hono.git
Baseline: v4.8.4 (530ab09)
Current: v4.9.12 (4b796cf)
Source scope: include all supported source; default excludes only

This is a smoke test, not a verdict. The baseline contract is inferred from the baseline ref and reused as an external `--spec` against the current ref.

## Summary

| Ref | Commit | Package | Modules | Observed imports | Hard violations | Warnings |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| v4.8.4 | 530ab09 | 4.8.4 | 6 | 85 | 0 | 38 |
| v4.9.12 | 4b796cf | 4.9.12 | 6 | 77 | 0 | 38 |

## Drift

- New observed edges: 0
- Removed observed edges: 2

### New Observed Edges
- None

### Removed Observed Edges
- `RuntimeTests -> Vitest`
  - previously via `runtime-tests/bun/vitest.config.ts:3` importing `../../vitest.config`
- `Vitest2 -> Vitest`
  - previously via `.vitest.config/jsx-runtime-default.ts:1` importing `../vitest.config`

## Advisory Warnings

- Warning counts: unresolved_import: 4, deep_internal_import: 34
- `unresolved_import` at `benchmarks/handle-event/index.js:7`: Benchmarks has an import that Axiom could not resolve into the observed graph. Observed: Benchmarks unresolved import.
- `unresolved_import` at `benchmarks/handle-event/index.js:8`: Benchmarks has an import that Axiom could not resolve into the observed graph. Observed: Benchmarks unresolved import.
- `unresolved_import` at `benchmarks/webapp/hono.js:1`: Benchmarks has an import that Axiom could not resolve into the observed graph. Observed: Benchmarks unresolved import.
- `unresolved_import` at `perf-measures/type-check/client.ts:2`: PerfMeasures has an import that Axiom could not resolve into the observed graph. Observed: PerfMeasures unresolved import.
- `deep_internal_import` at `benchmarks/query-param/src/bench.mts:2`: Benchmarks imports Hono through a deep relative path instead of a likely entry point. Observed: Benchmarks -> Hono deep internal import. Edge: Benchmarks -> Hono.
- `deep_internal_import` at `benchmarks/query-param/src/hono.mts:1`: Benchmarks imports Hono through a deep relative path instead of a likely entry point. Observed: Benchmarks -> Hono deep internal import. Edge: Benchmarks -> Hono.
- `deep_internal_import` at `benchmarks/routers-deno/src/hono.mts:4`: Benchmarks imports Hono through a deep relative path instead of a likely entry point. Observed: Benchmarks -> Hono deep internal import. Edge: Benchmarks -> Hono.
- `deep_internal_import` at `benchmarks/routers/src/hono.mts:4`: Benchmarks imports Hono through a deep relative path instead of a likely entry point. Observed: Benchmarks -> Hono deep internal import. Edge: Benchmarks -> Hono.
- `deep_internal_import` at `runtime-tests/bun/index.test.tsx:6`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/bun/index.test.tsx:7`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/bun/index.test.tsx:8`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/deno-jsx/jsx.test.tsx:4`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/deno-jsx/jsx.test.tsx:5`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/deno-jsx/jsx.test.tsx:6`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/deno/hono.test.ts:3`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/deno/hono.test.ts:5`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/deno/middleware.test.tsx:5`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/deno/ssg.test.tsx:2`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/deno/ssg.test.tsx:3`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/deno/stream.test.ts:3`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/lambda-edge/index.test.ts:1`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/lambda-edge/index.test.ts:7`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/lambda-edge/index.test.ts:8`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/lambda/index.test.ts:2`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/lambda/index.test.ts:10`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/lambda/index.test.ts:15`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/lambda/index.test.ts:22`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/lambda/mock.ts:2`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/lambda/mock.ts:7`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/lambda/stream-mock.ts:3`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/lambda/stream-mock.ts:7`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/lambda/stream.test.ts:1`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/lambda/stream.test.ts:2`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/lambda/stream.test.ts:3`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/lambda/stream.test.ts:8`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/node/index.test.ts:7`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/workerd/index.ts:3`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.
- `deep_internal_import` at `runtime-tests/workerd/index.ts:4`: RuntimeTests imports Hono through a deep relative path instead of a likely entry point. Observed: RuntimeTests -> Hono deep internal import. Edge: RuntimeTests -> Hono.

## Timings

- Clone baseline: 1674.1ms
- Clone current: 2463.5ms
- Infer baseline contract: 2659.2ms
- Baseline graph: 2090.7ms
- Diff JSON: 2094.5ms
- Observe Markdown: 1453.7ms

## Caveats

- The inferred baseline contract mirrors the baseline ref's current graph; it is not maintainer-declared architecture intent.
- New or removed edges are advisory drift signals, not automatic good/bad judgments.
- Warning counts are advisory pressure signals and do not fail CI by themselves.
- Use this harness to calibrate Axiom behavior before turning any signal into a hard gate.

