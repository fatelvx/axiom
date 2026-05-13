# yargs-prod Diff Architecture Smoke

Generated (UTC): 2026-05-13T17:36:06.313Z
Repository: https://github.com/yargs/yargs.git
Baseline: v17.7.2 (3566b84)
Current: v18.0.0 (0bc7255)
Source scope: include lib/**, index.mjs, browser.mjs, helpers/**; exclude test/**, docs/**, example/**
Inference: group-by folder, group-depth 2

This is a smoke test, not a verdict. The baseline contract is inferred from the baseline ref and reused as an external `--spec` against the current ref.
Baseline-spec violations are mismatches against that inferred baseline contract, not judgments about the target repository.

## Calibration Classification

- Repo shape: CLI parser / command-module library with TypeScript sources, root ESM entrypoints, Deno/browser platform shims, and generated build output references.
- Safety posture: clone-only, no target installs, no target scripts, no `npx`, no submodules, no package-manager lifecycle execution.
- Scope question: production entry/source graph for `lib/**`, `index.mjs`, `browser.mjs`, and `helpers/**`, excluding tests, docs, and examples.
- Axiom command surface: `axi infer --group-by folder --group-depth 2`, `axi graph --json`, `axi diff`, and `axi observe --baseline` through the local diff smoke harness.
- Main signal: stable 13 observed import sites across `v17.7.2 -> v18.0.0`, no baseline-spec violations, no observed edge drift, and one remaining unresolved static import from a Deno platform shim to clone-missing build output.
- Gap class: `common-ecosystem-convention` candidate, not a code change yet.
- Decision: do not change resolver behavior from this single signal. Track relative build-output-to-source imports as a candidate pattern and wait for another repository shape before generalizing.
- Code changed: no validator code changed.
- Follow-up: if this repeats, consider a conservative tsconfig-aware relative build-output source mirror rule such as `outDir/build` back to source only when the mirror source file exists and runtime declaration resolution is not being masked.

## Summary

| Ref | Commit | Package | Modules | Observed imports | Baseline-spec violations | Warnings |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| v17.7.2 | 3566b84 | 17.7.2 | 3 | 13 | 0 | 2 |
| v18.0.0 | 0bc7255 | 18.0.0 | 3 | 13 | 0 | 1 |

## Drift

- New observed edges: 0
- Removed observed edges: 0

### New Observed Edges
- None

### Removed Observed Edges
- None

## Advisory Warnings

- Warning counts: unresolved_import: 1
- `unresolved_import` at `lib/platform-shims/deno.ts:19`: LibPlatformShimsLibUtilsCycle has an import that Axiom could not resolve into the observed graph. Observed: LibPlatformShimsLibUtilsCycle unresolved import.
  - Specifier: `../../build/lib/yerror.js`
  - Local inspection: clone-only `build/lib/yerror.js` is absent, while `lib/yerror.ts` exists. `tsconfig.json` uses `outDir: "build"` and `rootDir: "."`, and excludes `lib/platform-shims/*.ts` from normal compilation.

## Timings

- Clone baseline: 1735.2ms
- Clone current: 1598.3ms
- Infer baseline contract: 697.9ms
- Baseline graph: 1097.8ms
- Diff JSON: 692.3ms
- Observe Markdown: 688.5ms

## Caveats

- The inferred baseline contract mirrors the baseline ref's current graph; it is not maintainer-declared architecture intent.
- New or removed edges are advisory drift signals, not automatic good/bad judgments.
- Warning counts are advisory pressure signals and do not fail CI by themselves.
- Use this harness to calibrate Axiom behavior before turning any signal into a hard gate.
