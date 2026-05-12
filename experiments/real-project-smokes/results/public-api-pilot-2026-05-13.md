# Public API Surface Pilot

Generated (UTC): 2026-05-12T19:34:07.954Z

This pilot calibrates the latest public API surface and public-entry bypass signals on real repositories before deciding whether to run another large MiroFish backtest.

It is not a verdict about nanoid or zod maintainership. External probe contracts are intentionally small and are used to test signal shape, not to claim maintainer intent.

## Summary

| Project | Ref | Commit | Mode | Source files | Imports | Unique edges | Hard violations | Intentional debt | Warnings | Public API warnings | Deep imports | Coupling | Check ms | Graph ms |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| nanoid | 964d1e0 | 964d1e0 | external-public-surface-contract | 18 | 56 | 1 | 0 | 0 | 1 | 0 | 0 | 0 | 1122.9 | 1011.4 |
| zod | v4.4.3 | 1fb56a5c | inferred-workspace-contract | 406 | 1103 | 7 | 0 | 0 | 2 | 0 | 1 | 1 | 3152.2 | 3420.5 |
| zod | v4.4.3 | 1fb56a5c | external-public-surface-probe | 406 | 1103 | 0 | 0 | 0 | 21 | 21 | 0 | 0 | 5305.8 | 3831.1 |

## Findings

### nanoid (external-public-surface-contract)
- Notes: Small hand-written external contract for root public API, hidden url-alphabet implementation, CLI, and non-secure entry points.
- Warning codes: unused_suppression: 1
- Unique observed edges: Cli->PublicApi
- No public API, deep internal import, or coupling warnings in this probe.

### zod (inferred-workspace-contract)
- Notes: Inferred workspace contract mirrors the current graph; it is not maintainer intent.
- Warning codes: coupling_concentration: 1, deep_internal_import: 1
- Unique observed edges: Benchmarks->Zod, Integration->Zod, Play->Zod, Resolution->Zod, Scripts->Zod, Treeshaking->Zod, ZodVitest->Vitest
- `coupling_concentration` at `no location`: Zod has concentrated fan-in from 6 modules.
  - Details: {"module":"Zod","fanInModules":6,"fanOutModules":0,"incomingModules":["Benchmarks","Integration","Play","Resolution","Scripts","Treeshaking"],"outgoingModules":[],"observed":"Zod fan-in from 6 modules"}
- `deep_internal_import` at `scripts/check-versions.ts:4`: Scripts imports Zod through a deep relative path instead of a likely entry point.
  - Details: {"fromModule":"Scripts","toModule":"Zod","specifier":"../packages/zod/src/v4/core/versions.js","importedPath":"packages/zod/src/v4/core/versions.ts","publicEntrypoints":["packages/zod/src/index.ts","packages/zod/src/locales/index.ts","packages/zod/src/mini/index.ts","packages/zod/src/v3/benchmarks/index.ts","packages/zod/src/v3/index.ts"],"observed":"Scripts -> Zod deep internal import"}

### zod (external-public-surface-probe)
- Notes: Purpose-built probe contract exposing likely Zod public entry points to calibrate broad/public entrypoint surface warnings.
- Warning codes: broad_public_surface: 19, public_entrypoint_coupling: 2
- Unique observed edges: none
- `broad_public_surface` at `packages/zod/src/index.ts:2`: ZodSrc exposes a broad public API surface through export *.
  - Details: {"module":"ZodSrc","exposedPath":"packages/zod/src/index.ts","specifier":"./v4/classic/external.js","exportKind":"star","observed":"ZodSrc broad public surface"}
- `broad_public_surface` at `packages/zod/src/v3/index.ts:2`: ZodSrc exposes a broad public API surface through export *.
  - Details: {"module":"ZodSrc","exposedPath":"packages/zod/src/v3/index.ts","specifier":"./external.js","exportKind":"star","observed":"ZodSrc broad public surface"}
- `broad_public_surface` at `packages/zod/src/v4/classic/index.ts:4`: ZodSrc exposes a broad public API surface through export *.
  - Details: {"module":"ZodSrc","exposedPath":"packages/zod/src/v4/classic/index.ts","specifier":"./external.js","exportKind":"star","observed":"ZodSrc broad public surface"}
- `broad_public_surface` at `packages/zod/src/v4/core/index.ts:1`: ZodSrc exposes a broad public API surface through export *.
  - Details: {"module":"ZodSrc","exposedPath":"packages/zod/src/v4/core/index.ts","specifier":"./core.js","exportKind":"star","observed":"ZodSrc broad public surface"}
- `broad_public_surface` at `packages/zod/src/v4/core/index.ts:2`: ZodSrc exposes a broad public API surface through export *.
  - Details: {"module":"ZodSrc","exposedPath":"packages/zod/src/v4/core/index.ts","specifier":"./parse.js","exportKind":"star","observed":"ZodSrc broad public surface"}
- `broad_public_surface` at `packages/zod/src/v4/core/index.ts:3`: ZodSrc exposes a broad public API surface through export *.
  - Details: {"module":"ZodSrc","exposedPath":"packages/zod/src/v4/core/index.ts","specifier":"./errors.js","exportKind":"star","observed":"ZodSrc broad public surface"}
- `broad_public_surface` at `packages/zod/src/v4/core/index.ts:4`: ZodSrc exposes a broad public API surface through export *.
  - Details: {"module":"ZodSrc","exposedPath":"packages/zod/src/v4/core/index.ts","specifier":"./schemas.js","exportKind":"star","observed":"ZodSrc broad public surface"}
- `broad_public_surface` at `packages/zod/src/v4/core/index.ts:5`: ZodSrc exposes a broad public API surface through export *.
  - Details: {"module":"ZodSrc","exposedPath":"packages/zod/src/v4/core/index.ts","specifier":"./checks.js","exportKind":"star","observed":"ZodSrc broad public surface"}
- `broad_public_surface` at `packages/zod/src/v4/core/index.ts:6`: ZodSrc exposes a broad public API surface through export *.
  - Details: {"module":"ZodSrc","exposedPath":"packages/zod/src/v4/core/index.ts","specifier":"./versions.js","exportKind":"star","observed":"ZodSrc broad public surface"}
- `broad_public_surface` at `packages/zod/src/v4/core/index.ts:7`: ZodSrc exposes a broad public API surface through export * as.
  - Details: {"module":"ZodSrc","exposedPath":"packages/zod/src/v4/core/index.ts","specifier":"./util.js","exportKind":"namespace","observed":"ZodSrc broad public surface"}
- `broad_public_surface` at `packages/zod/src/v4/core/index.ts:8`: ZodSrc exposes a broad public API surface through export * as.
  - Details: {"module":"ZodSrc","exposedPath":"packages/zod/src/v4/core/index.ts","specifier":"./regexes.js","exportKind":"namespace","observed":"ZodSrc broad public surface"}
- `broad_public_surface` at `packages/zod/src/v4/core/index.ts:9`: ZodSrc exposes a broad public API surface through export * as.
  - Details: {"module":"ZodSrc","exposedPath":"packages/zod/src/v4/core/index.ts","specifier":"../locales/index.js","exportKind":"namespace","observed":"ZodSrc broad public surface"}
- `broad_public_surface` at `packages/zod/src/v4/core/index.ts:10`: ZodSrc exposes a broad public API surface through export *.
  - Details: {"module":"ZodSrc","exposedPath":"packages/zod/src/v4/core/index.ts","specifier":"./registries.js","exportKind":"star","observed":"ZodSrc broad public surface"}
- `broad_public_surface` at `packages/zod/src/v4/core/index.ts:11`: ZodSrc exposes a broad public API surface through export *.
  - Details: {"module":"ZodSrc","exposedPath":"packages/zod/src/v4/core/index.ts","specifier":"./doc.js","exportKind":"star","observed":"ZodSrc broad public surface"}
- `broad_public_surface` at `packages/zod/src/v4/core/index.ts:12`: ZodSrc exposes a broad public API surface through export *.
  - Details: {"module":"ZodSrc","exposedPath":"packages/zod/src/v4/core/index.ts","specifier":"./api.js","exportKind":"star","observed":"ZodSrc broad public surface"}
- `broad_public_surface` at `packages/zod/src/v4/core/index.ts:13`: ZodSrc exposes a broad public API surface through export *.
  - Details: {"module":"ZodSrc","exposedPath":"packages/zod/src/v4/core/index.ts","specifier":"./to-json-schema.js","exportKind":"star","observed":"ZodSrc broad public surface"}
- `broad_public_surface` at `packages/zod/src/v4/core/index.ts:16`: ZodSrc exposes a broad public API surface through export * as.
  - Details: {"module":"ZodSrc","exposedPath":"packages/zod/src/v4/core/index.ts","specifier":"./json-schema.js","exportKind":"namespace","observed":"ZodSrc broad public surface"}
- `broad_public_surface` at `packages/zod/src/v4/index.ts:2`: ZodSrc exposes a broad public API surface through export *.
  - Details: {"module":"ZodSrc","exposedPath":"packages/zod/src/v4/index.ts","specifier":"./classic/index.js","exportKind":"star","observed":"ZodSrc broad public surface"}
- `broad_public_surface` at `packages/zod/src/v4/mini/index.ts:2`: ZodSrc exposes a broad public API surface through export *.
  - Details: {"module":"ZodSrc","exposedPath":"packages/zod/src/v4/mini/index.ts","specifier":"./external.js","exportKind":"star","observed":"ZodSrc broad public surface"}
- `public_entrypoint_coupling` at `packages/zod/src/v4/core/index.ts:1`: ZodSrc public entry point reaches 15 internal files.
  - Details: {"module":"ZodSrc","exposedPath":"packages/zod/src/v4/core/index.ts","internalTargetCount":15,"internalTargets":["packages/zod/src/v4/core/api.ts","packages/zod/src/v4/core/checks.ts","packages/zod/src/v4/core/core.ts","packages/zod/src/v4/core/doc.ts","packages/zod/src/v4/core/errors.ts","packages/zod/src/v4/core/json-schema-generator.ts","packages/zod/src/v4/core/json-schema-processors.ts","packages/zod/src/v4/core/json-schema.ts","packages/zod/src/v4/core/parse.ts","packages/zod/src/v4/core/r...
- `public_entrypoint_coupling` at `packages/zod/src/v4/locales/index.ts:1`: ZodSrc public entry point reaches 52 internal files.
  - Details: {"module":"ZodSrc","exposedPath":"packages/zod/src/v4/locales/index.ts","internalTargetCount":52,"internalTargets":["packages/zod/src/v4/locales/ar.ts","packages/zod/src/v4/locales/az.ts","packages/zod/src/v4/locales/be.ts","packages/zod/src/v4/locales/bg.ts","packages/zod/src/v4/locales/ca.ts","packages/zod/src/v4/locales/cs.ts","packages/zod/src/v4/locales/da.ts","packages/zod/src/v4/locales/de.ts","packages/zod/src/v4/locales/el.ts","packages/zod/src/v4/locales/en.ts","packages/zod/src/v4/loc...

## Decision

- Public API surface warnings observed: 21
- Deep internal import warnings observed: 1
- Recommendation: Run a targeted MiroFish backtest before a full big backtest; the pilot produced concrete advisory signals to evaluate.

## Maintainer Interpretation

- `public_entrypoint_coupling` stayed quiet under the inferred zod contract because `axi infer` does not activate public entrypoint intent on the user's behalf. That is adoption-safe behavior, not a missing signal.
- The zod public-surface probe shows the signal shape: `packages/zod/src/v4/core/index.ts` reaches 15 internal files and `packages/zod/src/v4/locales/index.ts` reaches 52. This does not prove those facades are wrong; it makes the facade pressure visible.
- The nanoid probe produced `unused_suppression`, which is useful visible-debt cleanup feedback: an accepted violation should become removable once the matching drift is gone.
- Next step: use this pilot as a targeted MiroFish prompt. Hold the full big backtest until we decide whether public-surface probes are a recommended pilot workflow or an advanced calibration tool.

## Caveats

- Public-surface probe contracts are intentionally narrow and are not claims about maintainer intent.
- `public_entrypoint_coupling` is advisory; it can identify large facades but cannot prove semantic API health.
- Inferred workspace contracts mirror the current graph; they should not be treated as desired architecture.
- Use these results to decide the next backtest prompt, not as marketing proof.
