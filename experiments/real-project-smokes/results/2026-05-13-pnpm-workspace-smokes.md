# pnpm Workspace Resolver Smokes, 2026-05-13

This run tested Axiom's workspace package discovery and package-style import resolution on real pnpm monorepos.

Safety posture:

- Clone-only shallow `git clone`.
- No `npm install`, `pnpm install`, `npx`, target build scripts, target tests, lifecycle scripts, submodules, or GitHub Actions.
- Local Axiom used the existing dependency tree and `npm run build`.
- Repositories were used as source-shape calibration targets, not as package-safety endorsements or architecture verdicts.

## Why This Run Happened

After adding inline `packages: [...]` support for `pnpm-workspace.yaml`, the next question was whether pnpm workspace discovery works on real monorepos and whether workspace package imports become observed module edges.

The first source-scoped `pnpm/pnpm` smoke exposed a resolver gap: many workspace package `exports` point at built files such as `./lib/index.js`, while clone-only source trees contain `./src/index.ts`. Axiom saw the workspace packages but treated package-style imports such as `@pnpm/config` as external because the declared export target did not exist in the source clone.

Follow-up implementation mapped package export and package main targets from common build directories (`lib` and `dist`) back to existing `src` mirrors. The same smoke then produced a real observed workspace graph.

## Vite Source-Scoped Smoke

Command shape:

```bash
npm run real-project:diff-smoke -- \
  --repo https://github.com/vitejs/vite.git \
  --name vite-pnpm-src \
  --baseline-ref v7.3.2 \
  --current-ref v7.3.3 \
  --group-by workspace \
  --include "packages/*/src/**" \
  --exclude "packages/*/src/**/__tests__/**,packages/*/src/**/*.test.ts,packages/*/src/**/*.spec.ts,packages/*/src/**/*.test.tsx,packages/*/src/**/*.spec.tsx" \
  --warnings coupling,deep,unresolved
```

Result:

- Baseline commit: `cc383e0`
- Current commit: `ca31424`
- Modules: 3
- Observed import sites: 0
- Baseline-spec violations: 0
- Drift: 0 new edges, 0 removed edges
- Advisory warnings: 60 `unresolved_import`

Interpretation:

Vite's source-scoped production package graph is quiet under this inferred workspace contract, but it is not a strong workspace-edge proof because most scanned code lives under the `Vite` module. The useful signal is the unresolved `#types/*` and `#dep-types/*` pattern, plus one source-relative `../types/*` pattern. These imports are visible graph-completeness gaps, not hard failures.

The first Vite attempt also showed that broad source scopes can include nested workspace test fixtures from `packages/**/__tests__/**`. Real pnpm monorepo pilots should explicitly exclude test fixture workspaces when the question is production-source architecture.

Artifacts:

- [Vite source-scoped summary](vite-pnpm-src-diff-smoke-2026-05-13.md)
- [Vite source-scoped JSON](vite-pnpm-src-diff-smoke-2026-05-13.json)
- [Vite source-scoped raw observe](vite-pnpm-src-diff-smoke-raw-observe-2026-05-13.md)
- [Vite source-scoped raw diff](vite-pnpm-src-diff-smoke-raw-diff-2026-05-13.md)
- [Vite source-scoped Mermaid](vite-pnpm-src-diff-smoke-2026-05-13.mmd)

## pnpm Source-Scoped Smoke

Command shape:

```bash
npm run real-project:diff-smoke -- \
  --repo https://github.com/pnpm/pnpm.git \
  --name pnpm-src \
  --baseline-ref v10.8.1 \
  --current-ref v10.9.0 \
  --group-by workspace \
  --include "**/src/**" \
  --exclude "**/test/**,**/__tests__/**,**/example/**,**/*.test.ts,**/*.spec.ts,**/*.test.tsx,**/*.spec.tsx" \
  --warnings coupling,deep,unresolved
```

Result after the resolver source-mirror fix:

- Baseline commit: `f337e71`
- Current commit: `a4ba06d`
- Modules: 174
- Baseline observed import sites: 1502
- Current observed import sites: 1499
- Baseline-spec violations: 0
- Drift: 0 new edges, 4 removed edges
- Advisory warnings: 124 `coupling_concentration`

Removed observed edges:

- `Core -> WhichVersionIsPinned` via `pkg-manager/core/src/parseWantedDependencies.ts:3`
- `ManifestUtils -> Error` via `pkg-manifest/manifest-utils/src/getPref.ts:1`
- `ResolveDependencies -> PickFetcher` via `pkg-manager/resolve-dependencies/src/updateProjectManifest.ts:9`
- `ResolveDependencies -> WhichVersionIsPinned` via `pkg-manager/resolve-dependencies/src/getWantedDependencies.ts:8`

Interpretation:

This is the stronger resolver calibration result. A source-only pnpm clone now produces a large observed workspace package graph instead of an empty graph, and `axi diff` can report concrete removed edges between tags. The 124 coupling warnings are advisory graph pressure in a large package manager monorepo; they should not be read as defects.

Artifacts:

- [pnpm source-scoped summary](pnpm-src-diff-smoke-2026-05-13.md)
- [pnpm source-scoped JSON](pnpm-src-diff-smoke-2026-05-13.json)
- [pnpm source-scoped raw observe](pnpm-src-diff-smoke-raw-observe-2026-05-13.md)
- [pnpm source-scoped raw diff](pnpm-src-diff-smoke-raw-diff-2026-05-13.md)
- [pnpm source-scoped Mermaid](pnpm-src-diff-smoke-2026-05-13.mmd)

## Product Lessons

- `pnpm-workspace.yaml` support is useful, but workspace package discovery alone is not enough; real source-only monorepos often publish `lib` or `dist` paths while storing editable source in `src`.
- Mapping package `exports` / `main` targets from `lib` or `dist` back to existing `src` mirrors is a high-value resolver hardening for observed graph completeness.
- Vite-style `#types` and `#dep-types` unresolved imports are a separate package-imports / generated-types resolver gap. Keep them advisory until more real-project evidence shows the right mapping.
- Source scope remains part of the architecture question. Nested test fixture workspaces can create misleading ownership pressure if a pilot asks about production source but scans `__tests__`.
- The no-install smoke protocol remains important during current npm supply-chain risk: this run got useful product evidence without executing any target package code.
