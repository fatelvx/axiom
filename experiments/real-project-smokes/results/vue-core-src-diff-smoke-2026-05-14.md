# vue-core-src Diff Architecture Smoke

Generated (UTC): 2026-05-13T19:53:55.598Z
Repository: https://github.com/vuejs/core.git
Baseline: v3.4.0 (d702b66)
Current: v3.5.0 (6402b98)
Source scope: include packages/*/src/**; exclude packages/*/src/**/__tests__/**, packages/*/src/**/*.test.ts, packages/*/src/**/*.spec.ts, packages/*/src/**/*.test.tsx, packages/*/src/**/*.spec.tsx
Inference: group-by workspace

This is a smoke test, not a verdict. The baseline contract is inferred from the baseline ref and reused as an external `--spec` against the current ref.
Baseline-spec violations are mismatches against that inferred baseline contract, not judgments about the target repository.

## Summary

| Ref | Commit | Package | Modules | Observed imports | Baseline-spec violations | Warnings |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| v3.4.0 | d702b66 | 3.4.0 | 15 | 263 | 0 | 17 |
| v3.5.0 | 6402b98 | 3.5.0 | 15 | 268 | 1 | 8 |

## Drift

- New observed edges: 1
- Removed observed edges: 7

### New Observed Edges
- `Shared -> Reactivity` (undeclared_dependency)
  - via `packages/shared/src/toDisplayString.ts:2` importing `@vue/reactivity`

### Removed Observed Edges
- `DtsBuiltTest -> Vue`
  - previously via `packages/dts-built-test/src/index.ts:1` importing `vue`
- `SfcPlayground -> Vue`
  - previously via `packages/sfc-playground/src/download/template/main.js:1` importing `vue`
- `TemplateExplorer -> CompilerCore`
  - previously via `packages/template-explorer/src/options.ts:3` importing `@vue/compiler-core`
- `TemplateExplorer -> CompilerDom`
  - previously via `packages/template-explorer/src/index.ts:2` importing `@vue/compiler-dom`
- `TemplateExplorer -> CompilerSsr`
  - previously via `packages/template-explorer/src/index.ts:7` importing `@vue/compiler-ssr`
- `TemplateExplorer -> RuntimeDom`
  - previously via `packages/template-explorer/src/index.ts:14` importing `@vue/runtime-dom`
- `TemplateExplorer -> Vue`
  - previously via `packages/template-explorer/src/options.ts:1` importing `vue`

## Advisory Warnings

- Warning counts: coupling_concentration: 7, deep_internal_import: 1
- `coupling_concentration` at `no location`: Compat has concentrated fan-out to 4 modules. Observed: Compat fan-out to 4 modules.
- `coupling_concentration` at `no location`: CompilerCore has concentrated fan-in from 4 modules. Observed: CompilerCore fan-in from 4 modules. Incoming: CompilerDom, CompilerSfc, RuntimeCore, ServerRenderer.
- `coupling_concentration` at `no location`: CompilerDom has concentrated fan-in from 4 modules. Observed: CompilerDom fan-in from 4 modules. Incoming: Compat, CompilerSfc, CompilerSsr, Vue.
- `coupling_concentration` at `no location`: CompilerSfc has concentrated fan-out to 4 modules. Observed: CompilerSfc fan-out to 4 modules.
- `coupling_concentration` at `no location`: RuntimeCore has concentrated fan-in from 4 modules. Observed: RuntimeCore fan-in from 4 modules. Incoming: Compat, RuntimeDom, RuntimeTest, ServerRenderer.
- `coupling_concentration` at `no location`: ServerRenderer has concentrated fan-out to 5 modules. Observed: ServerRenderer fan-out to 5 modules.
- `coupling_concentration` at `no location`: Shared has concentrated fan-in from 11 modules. Observed: Shared fan-in from 11 modules. Incoming: Compat, CompilerCore, CompilerDom, CompilerSfc, CompilerSsr, Reactivity, RuntimeCore, RuntimeDom, RuntimeTest, ServerRenderer, Vue.
- `deep_internal_import` at `packages/vue-compat/src/index.ts:18`: Compat imports RuntimeCore through a deep relative path instead of a likely source-group entry point. Observed: Compat -> RuntimeCore deep internal import. Edge: Compat -> RuntimeCore.

## Timings

- Clone baseline: 2837.8ms
- Clone current: 2671.1ms
- Infer baseline contract: 2470.4ms
- Baseline graph: 2059.4ms
- Diff JSON: 1910.9ms
- Observe Markdown: 1850.6ms

## Caveats

- The inferred baseline contract mirrors the baseline ref's current graph; it is not maintainer-declared architecture intent.
- New or removed edges are advisory drift signals, not automatic good/bad judgments.
- Warning counts are advisory pressure signals and do not fail CI by themselves.
- Use this harness to calibrate Axiom behavior before turning any signal into a hard gate.
