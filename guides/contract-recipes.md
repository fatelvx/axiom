# Contract Recipes

These recipes are starter shapes for `.axi` contracts. They are not universal architecture truth, framework policy, or inferred approval.

Use them to lower the empty-page cost:

1. Run inference to see the current graph.
2. Pick the closest recipe.
3. Rename modules into your team's architecture vocabulary.
4. Delete paths and dependencies that do not match your project.
5. Run `axi observe` before using `axi check` as a gate.

```bash
axi infer --root . > contracts/current-graph.axi
axi observe --root . --spec contracts/app.axi --markdown
axi graph --root . --spec contracts/app.axi --mermaid
axi graph --root . --spec contracts/app.axi --json > axiom-baseline.json
axi diff axiom-baseline.json --root . --spec contracts/app.axi
```

The generated contract from `axi infer` mirrors current imports. A recipe is a reviewed intent draft. Neither one should automatically become accepted debt.

## React Or Vite App

Use this when the main risk is UI code reaching into services, state, or domain internals.

```axi
layers Domain -> Services -> UI

module Domain
path "src/domain/**"
path "src/lib/domain/**"
layer Domain
purpose "pure domain model and reusable rules"

module Services
path "src/services/**"
path "src/api/**"
layer Services
depends on Domain
exposes "src/services/index.ts"
hides "src/services/internal/**"
purpose "application services and integration boundaries"

module State
path "src/store/**"
path "src/state/**"
layer Services
depends on Domain
exposes "src/store/index.ts"
purpose "client-side state boundary"

module UI
path "src/components/**"
path "src/pages/**"
path "src/routes/**"
path "src/App.tsx"
layer UI
depends on Domain
depends on Services
depends on State
purpose "React presentation, routing, and screens"
```

Start with `axi observe --warn-deep-internal-imports` if the services or store public entry points are not ready yet. Promote `exposes` and `hides` only after the team agrees which files are public.

## React And Pixi Game Client

Use this when a React shell wraps a PixiJS runtime and AI-generated feature work may blur gameplay, rendering, input, and UI boundaries.

```axi
layers Core -> Runtime -> UI

module GameCore
path "src/game/**"
path "src/domain/**"
layer Core
purpose "game rules, deterministic state, and shared model"

module Assets
path "src/assets/**"
path "src/resources/**"
layer Core
purpose "asset manifests and loading metadata"

module PixiRuntime
path "src/rendering/**"
path "src/pixi/**"
layer Runtime
depends on GameCore
depends on Assets
exposes "src/rendering/index.ts"
hides "src/rendering/internal/**"
purpose "PixiJS scene, sprite, ticker, and rendering integration"

module Input
path "src/input/**"
layer Runtime
depends on GameCore
purpose "keyboard, pointer, and controller mapping"

module UI
path "src/components/**"
path "src/screens/**"
path "src/App.jsx"
path "src/App.tsx"
layer UI
depends on GameCore
depends on PixiRuntime
depends on Input
purpose "React shell, menus, overlays, and app screens"
```

Useful first questions:

- Is gameplay logic drifting into React components?
- Is rendering code importing UI state directly?
- Are agents bypassing `src/rendering/index.ts` and reaching into runtime internals?
- Does input mapping stay separate from deterministic game rules?

This recipe is a good external pilot contract because it can show drift without forcing the game repo to adopt Axiom files immediately.

## TypeScript Library Package

Use this when the main risk is public API growth, hidden implementation leaks, or consumers bypassing stable entry points.

```axi
layers Core -> PublicAPI

module Core
path "src/core/**"
path "src/internal/**"
layer Core
hides "src/core/internal/**"
hides "src/internal/**"
purpose "implementation details and internal algorithms"

module PublicAPI
path "src/index.ts"
path "src/mini.ts"
layer PublicAPI
depends on Core
exposes "src/index.ts"
exposes "src/mini.ts"
purpose "stable public entry points"
```

Run public-surface warnings only when you are actively reviewing exposed entry points:

```bash
axi observe --root . --spec contracts/library.axi --warn-public-api-surface
```

Treat broad barrels and facade pressure as review prompts, not proof that a public API is wrong.

## pnpm Or Turborepo Monorepo

Use this when package boundaries are the main intent surface.

```axi
layers Packages -> Apps

module Shared
path "packages/shared/src/**"
layer Packages
exposes "packages/shared/src/index.ts"
hides "packages/shared/src/internal/**"
purpose "shared package public API"

module Data
path "packages/data/src/**"
layer Packages
exposes "packages/data/src/index.ts"
purpose "data access package"

module Web
path "apps/web/src/**"
layer Apps
depends on Shared
depends on Data
purpose "web application"

module Admin
path "apps/admin/src/**"
layer Apps
depends on Shared
depends on Data
purpose "admin application"
```

Start with workspace-aware inference:

```bash
axi infer --root . --group-by workspace > contracts/workspace.current.axi
axi observe --root . --spec contracts/workspace.axi --markdown
axi graph --root . --spec contracts/workspace.axi --json > axiom-baseline.json
axi diff axiom-baseline.json --root . --spec contracts/workspace.axi
```

Keep app-to-app imports out of the contract unless they are intentionally allowed. Package exports and `exposes` rules are usually a better first boundary than modeling every folder.

## External Pilot Contract

Use this when you want to scan a project without adding Axiom files to it yet.

```text
pilot/
  contracts/
    target-app.axi
target-app/
  src/
```

```bash
axi infer --root ../target-app --group-depth 2 > contracts/target-app.inferred.axi
axi observe --root ../target-app --spec contracts/target-app.axi --markdown --warn-deep-internal-imports
axi graph --root ../target-app --spec contracts/target-app.axi --mermaid
axi graph --root ../target-app --spec contracts/target-app.axi --json > target-app-baseline.json
axi diff target-app-baseline.json --root ../target-app --spec contracts/target-app.axi
```

Module paths inside `contracts/target-app.axi` still point at files under `--root`. This keeps the target repo clean until the contract is mature enough to adopt.

## Before Turning A Recipe Into A Gate

Do not copy a recipe straight into CI. A recipe is ready for `axi check` only when:

- every module name matches language the team already uses,
- every active `depends on` edge can be explained as intended architecture,
- every `exposes` or `hides` rule describes a public/private boundary the team agrees with,
- `axi observe --markdown` has been reviewed at least once,
- any `accepts ... until ... because ...` entry names a specific migration tradeoff,
- advisory warnings are still review context, not accidental blockers.

If the contract mostly exists to quiet the first run, keep it external with `--spec` and use `axi observe` until the intended boundary is clearer.

## Keeping Recipes Lean

The first contract should have an owner and a review rhythm. A practical starting point:

- update the contract when a module boundary or public entry point intentionally changes,
- review visible intentional debt before its expiration window,
- save an unfiltered `axi graph --json` baseline when the contract becomes useful,
- compare future changes with `axi observe --baseline`,
- delete rules that no one can explain.

This keeps `.axi` from becoming another stale config file. The contract should preserve architecture intent, not document every folder forever.

## What To Avoid

- Do not accept all first-run violations automatically.
- Do not model every folder on day one.
- Do not add `exposes` everywhere before the public surface is agreed.
- Do not treat `axi infer` as recommended architecture.
- Do not make advisory warnings into CI failures unless the team intentionally promotes that policy.

The useful loop is:

```text
current graph -> reviewed intent -> observe drift -> visible accepted debt -> selective gates
```
