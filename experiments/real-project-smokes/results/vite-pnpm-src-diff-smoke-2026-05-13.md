# vite-pnpm-src Diff Architecture Smoke

Generated (UTC): 2026-05-13T16:00:38.220Z
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
| v7.3.2 | cc383e0 | n/a | 3 | 0 | 0 | 60 |
| v7.3.3 | ca31424 | n/a | 3 | 0 | 0 | 60 |

## Drift

- New observed edges: 0
- Removed observed edges: 0

### New Observed Edges
- None

### Removed Observed Edges
- None

## Advisory Warnings

- Warning counts: unresolved_import: 60
- `unresolved_import` at `packages/vite/src/client/client.ts:1`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/client/client.ts:2`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/client/overlay.ts:1`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/module-runner/hmrHandler.ts:1`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/module-runner/runner.ts:1`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/module-runner/types.ts:1`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/build.ts:24`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/build.ts:25`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/config.ts:13`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/config.ts:14`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/http.ts:6`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/index.ts:220`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/index.ts:231`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/index.ts:236`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/index.ts:242`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/index.ts:245`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/index.ts:252`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/index.ts:253`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/index.ts:255`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/index.ts:256`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/index.ts:257`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/index.ts:258`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/index.ts:259`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/index.ts:260`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/plugins/css.ts:32`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/plugins/css.ts:37`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/plugins/css.ts:38`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/plugins/esbuild.ts:14`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/plugins/importMetaGlob.ts:18`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/plugins/terser.ts:3`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/preview.ts:7`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/server/environment.ts:2`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/server/hmr.ts:6`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/server/index.ts:15`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/server/index.ts:16`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/server/middlewares/base.ts:1`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/server/middlewares/error.ts:5`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/server/middlewares/error.ts:6`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/server/middlewares/hostCheck.ts:2`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/server/middlewares/htmlFallback.ts:3`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/server/middlewares/indexHtml.ts:7`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/server/middlewares/notFound.ts:1`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/server/middlewares/proxy.ts:4`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/server/middlewares/rejectInvalidRequest.ts:1`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/server/middlewares/static.ts:6`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/server/middlewares/time.ts:2`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/server/middlewares/transform.ts:5`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/server/pluginContainer.ts:68`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/server/ws.ts:13`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/server/ws.ts:14`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/server/ws.ts:15`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/ssr/runtime/serverModuleRunner.ts:2`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/utils.ts:24`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/utils.ts:25`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/node/watch.ts:6`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/shared/hmr.ts:1`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/shared/hmr.ts:2`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/shared/hmr.ts:3`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/shared/hmrHandler.ts:1`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.
- `unresolved_import` at `packages/vite/src/shared/moduleRunnerTransport.ts:2`: Vite has an import that Axiom could not resolve into the observed graph. Observed: Vite unresolved import.

## Timings

- Clone baseline: 53385.1ms
- Clone current: 11952.4ms
- Infer baseline contract: 2389.4ms
- Baseline graph: 1787.1ms
- Diff JSON: 1932.1ms
- Observe Markdown: 4019.2ms

## Caveats

- The inferred baseline contract mirrors the baseline ref's current graph; it is not maintainer-declared architecture intent.
- New or removed edges are advisory drift signals, not automatic good/bad judgments.
- Warning counts are advisory pressure signals and do not fail CI by themselves.
- Use this harness to calibrate Axiom behavior before turning any signal into a hard gate.
