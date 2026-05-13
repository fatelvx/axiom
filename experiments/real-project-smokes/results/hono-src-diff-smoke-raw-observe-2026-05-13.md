## Axiom Architecture Review

Status: needs review
Review mode: observe (advisory)

### Summary
- Modules: 3
- Declared dependencies: 2
- Observed dependencies: 0 of 14
- Hard violations: 0
- Intentional violations: 0
- Advisory warnings: 6
- Drift: 0 new observed edges, 0 removed observed edges

### Review Notes
- This is review output; use `axi check` when you want a CI gate.
- Hard violations are contract failures.
- Intentional violations, warnings, and drift are visible debt or advisory signals.
- Axiom does not auto-accept debt; accepted debt must be declared in `.axi` with an expiration date and reason.
- Expired or invalid intentional violations are hard contract failures in `axi check`.
- Observed dependencies are filtered to attention edges; the summary keeps the full count.

### Hard Violations
- None

### Visible Intentional Debt
- None

### Advisory Warnings
- `deep_internal_import` at `src/preset/quick.ts:6`: Preset imports MixedCycle through a deep relative path instead of a likely entry point.
  - Observed: Preset -> MixedCycle deep internal import
  - Specifier: `../hono-base`
  - Imported path: `src/hono-base.ts`
  - Likely entry points: `src/adapter/aws-lambda/index.ts`, `src/adapter/bun/index.ts`, `src/adapter/cloudflare-pages/index.ts`, `src/adapter/cloudflare-workers/index.ts`, `src/adapter/deno/index.ts`
  - Fix: Import a public entry point from MixedCycle, or declare explicit exposes/hides rules if this deep path is intentional.
- `deep_internal_import` at `src/preset/quick.ts:7`: Preset imports MixedCycle through a deep relative path instead of a likely entry point.
  - Observed: Preset -> MixedCycle deep internal import
  - Specifier: `../hono-base`
  - Imported path: `src/hono-base.ts`
  - Likely entry points: `src/adapter/aws-lambda/index.ts`, `src/adapter/bun/index.ts`, `src/adapter/cloudflare-pages/index.ts`, `src/adapter/cloudflare-workers/index.ts`, `src/adapter/deno/index.ts`
  - Fix: Import a public entry point from MixedCycle, or declare explicit exposes/hides rules if this deep path is intentional.
- `deep_internal_import` at `src/preset/quick.ts:11`: Preset imports MixedCycle through a deep relative path instead of a likely entry point.
  - Observed: Preset -> MixedCycle deep internal import
  - Specifier: `../types`
  - Imported path: `src/types.ts`
  - Likely entry points: `src/adapter/aws-lambda/index.ts`, `src/adapter/bun/index.ts`, `src/adapter/cloudflare-pages/index.ts`, `src/adapter/cloudflare-workers/index.ts`, `src/adapter/deno/index.ts`
  - Fix: Import a public entry point from MixedCycle, or declare explicit exposes/hides rules if this deep path is intentional.
- `deep_internal_import` at `src/preset/tiny.ts:6`: Preset imports MixedCycle through a deep relative path instead of a likely entry point.
  - Observed: Preset -> MixedCycle deep internal import
  - Specifier: `../hono-base`
  - Imported path: `src/hono-base.ts`
  - Likely entry points: `src/adapter/aws-lambda/index.ts`, `src/adapter/bun/index.ts`, `src/adapter/cloudflare-pages/index.ts`, `src/adapter/cloudflare-workers/index.ts`, `src/adapter/deno/index.ts`
  - Fix: Import a public entry point from MixedCycle, or declare explicit exposes/hides rules if this deep path is intentional.
- `deep_internal_import` at `src/preset/tiny.ts:7`: Preset imports MixedCycle through a deep relative path instead of a likely entry point.
  - Observed: Preset -> MixedCycle deep internal import
  - Specifier: `../hono-base`
  - Imported path: `src/hono-base.ts`
  - Likely entry points: `src/adapter/aws-lambda/index.ts`, `src/adapter/bun/index.ts`, `src/adapter/cloudflare-pages/index.ts`, `src/adapter/cloudflare-workers/index.ts`, `src/adapter/deno/index.ts`
  - Fix: Import a public entry point from MixedCycle, or declare explicit exposes/hides rules if this deep path is intentional.
- `deep_internal_import` at `src/preset/tiny.ts:9`: Preset imports MixedCycle through a deep relative path instead of a likely entry point.
  - Observed: Preset -> MixedCycle deep internal import
  - Specifier: `../types`
  - Imported path: `src/types.ts`
  - Likely entry points: `src/adapter/aws-lambda/index.ts`, `src/adapter/bun/index.ts`, `src/adapter/cloudflare-pages/index.ts`, `src/adapter/cloudflare-workers/index.ts`, `src/adapter/deno/index.ts`
  - Fix: Import a public entry point from MixedCycle, or declare explicit exposes/hides rules if this deep path is intentional.

### Architecture Drift (Advisory)
- Kind: `advisory_observed_edge_drift`
- Baseline: `C:/Users/邱品丰/AppData/Local/Temp/axiom-real-project-diff-smoke-hj8uMH/hono-src-v4.8.4-baseline.graph.json` (14 observed dependencies, axiom.graph.v9)
- New observed edges:
  - None
- Removed observed edges:
  - None
