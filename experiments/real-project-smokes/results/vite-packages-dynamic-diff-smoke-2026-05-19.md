# vite-packages-dynamic Diff Architecture Smoke

Generated (UTC): 2026-05-18T18:32:25.681Z
Repository: https://github.com/vitejs/vite.git
Baseline: v7.2.6 (bda5dbb)
Current: v7.2.7 (317b3b2)
Source scope: include packages/vite/src/**, packages/plugin-legacy/src/**; exclude packages/vite/src/**/__tests__/**, packages/vite/src/**/*.spec.ts, packages/vite/src/**/*.test.ts, packages/vite/src/**/__snapshots__/**, packages/vite/src/**/fixtures/**, packages/plugin-legacy/src/**/*.spec.ts, packages/plugin-legacy/src/**/*.test.ts
Inference: group-by folder, group-depth 4

This is a smoke test, not a verdict. The baseline contract is inferred from the baseline ref and reused as an external `--spec` against the current ref.
Baseline-spec violations are mismatches against that inferred baseline contract, not judgments about the target repository.

## Summary

| Ref | Commit | Package | Modules | Observed imports | Baseline-spec violations | Warnings |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| v7.2.6 | bda5dbb | n/a | 5 | 78 | 0 | 10 |
| v7.2.7 | 317b3b2 | n/a | 5 | 78 | 0 | 10 |

## Calibration Classification

- Repo shape: TypeScript build tool/framework monorepo package sources with CLI lazy loading, config-file loading, module-runner imports, CSS preprocessor loaders, and optional legacy-plugin dependencies
- Safety posture: Clone-only source scan; no target installs, package-manager scripts, target tests, target builds, submodules, or npx were run.
- Scope question: Can Axiom's opt-in dynamic warning family stay useful on Vite package production sources by separating literal lazy imports from non-literal runtime/config/plugin loading expressions?
- Axiom command surface: axi infer --json + axi graph --json + axi diff + axi observe --baseline
- Main signal: Vite package sources provide a second dynamic-heavy calibration after Nitro: five readable inferred source modules, stable package-source edges, and ten focused non-literal runtime/config/plugin loading expressions as advisory graph-completeness evidence.
- Gap class: static-blind-spot / advisory-signal-calibration
- Decision: Record as comparison evidence for dynamic dependency warnings; keep them opt-in review evidence and do not change scanner, resolver, or gate behavior from this run.
- Code changed: No Axiom validator code changed; this is a no-install dynamic calibration run.
- Follow-up: Use Nitro plus Vite together to calibrate dynamic warning documentation, but wait for at least one app/runtime-plugin repo or Python dynamic pilot before changing defaults.

## Baseline Inference

- Source files: 125
- Imports scanned: 1255
- Candidate modules: 5
- Emitted modules: 5
- Inferred observed dependencies: 5
- Collapsed cycles: 0
- Architecture pressure notes: 8

### Inference Review Story
- Summary: Starter contract inferred 5 modules and 5 observed module edges from 125 source files.
- Setup: Scanned 125 source files and 1255 imports; 5 candidate groups became 5 starter modules. This is a current-graph snapshot, not declared architecture intent yet.
- `Large-file pressure in inferred scope` (warning): 8 large source files may hide responsibilities that folder and import inference cannot split. Inspect these files before judging the starter module map as complete.
  - files: `packages/vite/src/node/plugins/css.ts`, `packages/vite/src/node/config.ts`, `packages/vite/src/node/build.ts`, `packages/vite/src/node/utils.ts`, `packages/vite/src/node/plugins/html.ts`, `packages/vite/src/node/optimizer/index.ts`, `packages/vite/src/node/server/index.ts`, `packages/vite/src/node/server/pluginContainer.ts`
- `Review inferred dependencies` (info): 5 observed module edges became `depends on` lines with sample import evidence. Confirm each edge is intended before using this draft as a gate.
  - modules: `PackagesPluginLegacySrc`, `PackagesViteSrcClient`, `PackagesViteSrcModuleRunner`, `PackagesViteSrcNode`, `PackagesViteSrcShared`
- Next step: Inspect large-file pressure notes, adjust module boundaries if needed, then run `axi observe --root . --spec <draft.axi> --markdown`.
- Caveat: Inference reads static imports and folder/package shape. It can lower authoring cost, but humans still decide module names, visibility, layers, accepted debt, and which edges are real architecture intent.

### Intra-File Pressure Notes
- `packages/vite/src/node/plugins/css.ts`: 3427 lines, 172 function-like nodes, 53 imports
- `packages/vite/src/node/config.ts`: 2244 lines, 58 function-like nodes, 49 imports
- `packages/vite/src/node/build.ts`: 1691 lines, 78 function-like nodes, 39 imports
- `packages/vite/src/node/utils.ts`: 1691 lines, 138 function-like nodes, 34 imports
- `packages/vite/src/node/plugins/html.ts`: 1581 lines, 103 function-like nodes, 23 imports
- `packages/vite/src/node/optimizer/index.ts`: 1460 lines, 76 function-like nodes, 19 imports
- `packages/vite/src/node/server/index.ts`: 1320 lines, 70 function-like nodes, 61 imports
- `packages/vite/src/node/server/pluginContainer.ts`: 1299 lines, 82 function-like nodes, 23 imports

## Drift

- New observed edges: 0
- Removed observed edges: 0

### New Observed Edges
- None

### Removed Observed Edges
- None

## Advisory Signals

- Warning counts: dynamic_dependency_expression: 10
- `dynamic_dependency_expression` at `packages/vite/src/client/client.ts:150`: PackagesViteSrcClient has a non-literal import() expression that Axiom cannot resolve into the observed graph. Observed: PackagesViteSrcClient dynamic dependency expression. Expression: `base + acceptedPathWithoutQuery.slice(1) + `?${explicitImportRequired ? 'import&' : ''}t=${timestamp}${ query ? `&${q...`.
- `dynamic_dependency_expression` at `packages/vite/src/module-runner/esmEvaluator.ts:48`: PackagesViteSrcModuleRunner has a non-literal import() expression that Axiom cannot resolve into the observed graph. Observed: PackagesViteSrcModuleRunner dynamic dependency expression. Expression: `filepath`.
- `dynamic_dependency_expression` at `packages/vite/src/node/config.ts:1891`: PackagesViteSrcNode has a non-literal import() expression that Axiom cannot resolve into the observed graph. Observed: PackagesViteSrcNode dynamic dependency expression. Expression: `pathToFileURL(resolvedPath).href + '?t=' + Date.now()`.
- `dynamic_dependency_expression` at `packages/vite/src/node/config.ts:2119`: PackagesViteSrcNode has a non-literal import() expression that Axiom cannot resolve into the observed graph. Observed: PackagesViteSrcNode dynamic dependency expression. Expression: `pathToFileURL(tempFileName).href`.
- `dynamic_dependency_expression` at `packages/vite/src/node/plugins/css.ts:2375`: PackagesViteSrcNode has a non-literal import() expression that Axiom cannot resolve into the observed graph. Observed: PackagesViteSrcNode dynamic dependency expression. Expression: `pathToFileURL(sssPath).href`.
- `dynamic_dependency_expression` at `packages/vite/src/node/plugins/css.ts:2428`: PackagesViteSrcNode has a non-literal import() expression that Axiom cannot resolve into the observed graph. Observed: PackagesViteSrcNode dynamic dependency expression. Expression: `sassPath`.
- `dynamic_dependency_expression` at `packages/vite/src/node/plugins/css.ts:2534`: PackagesViteSrcNode has a non-literal import() expression that Axiom cannot resolve into the observed graph. Observed: PackagesViteSrcNode dynamic dependency expression. Expression: `sassPackage.path`.
- `dynamic_dependency_expression` at `packages/vite/src/node/plugins/css.ts:2774`: PackagesViteSrcNode has a non-literal import() expression that Axiom cannot resolve into the observed graph. Observed: PackagesViteSrcNode dynamic dependency expression. Expression: `lessPath`.
- `dynamic_dependency_expression` at `packages/vite/src/node/plugins/css.ts:2885`: PackagesViteSrcNode has a non-literal import() expression that Axiom cannot resolve into the observed graph. Observed: PackagesViteSrcNode dynamic dependency expression. Expression: `stylusPath`.
- `dynamic_dependency_expression` at `packages/vite/src/node/plugins/terser.ts:49`: PackagesViteSrcNode has a non-literal import() expression that Axiom cannot resolve into the observed graph. Observed: PackagesViteSrcNode dynamic dependency expression. Expression: `terserPath`.

## Timings

- Clone baseline: 58757ms
- Clone current: 46890.3ms
- Infer baseline contract: 16438.3ms
- Baseline graph: 11366.4ms
- Diff JSON: 11546.4ms
- Observe Markdown: 24991.9ms

## Caveats

- The inferred baseline contract mirrors the baseline ref's current graph; it is not maintainer-declared architecture intent.
- New or removed edges are advisory drift signals, not automatic good/bad judgments.
- Warning counts are advisory pressure signals and do not fail CI by themselves.
- Use this harness to calibrate Axiom behavior before turning any signal into a hard gate.
