# Vite Type-Only Package Imports Smoke, 2026-05-14

This run checked whether Axiom can resolve Vite-style package `imports` aliases that point to declaration files without treating runtime imports to `.d.ts` files as valid source edges.

Safety posture:

- Clone-only shallow `git clone`.
- No `npm install`, `pnpm install`, `npx`, target build scripts, target tests, lifecycle scripts, submodules, or GitHub Actions.
- Local Axiom used the existing dependency tree and `npm run build`.
- The Vite repository was used as source-shape calibration, not as a package-safety endorsement or architecture verdict.

## Why This Run Happened

The 2026-05-13 pnpm workspace smoke showed 60 `unresolved_import` warnings in Vite production source. Inspection showed that Vite declares package `imports` in `packages/vite/package.json`:

```json
{
  "imports": {
    "#types/*": "./types/*.d.ts",
    "#dep-types/*": "./src/types/*.d.ts"
  }
}
```

Those imports are used from `import type` and `export type` sites. Axiom already understood package `imports`, but its resolver deliberately refused declaration files. That made legitimate type-only architecture edges look like unresolved graph gaps.

The implementation response was narrow: declaration files are still ignored for ordinary runtime imports, but scanner-confirmed type-only imports, type-only exports, and `import("...")` type nodes may resolve to `.d.ts`, `.d.mts`, or `.d.cts` files.

## Smoke Command Shape

```bash
npm run real-project:diff-smoke -- \
  --repo https://github.com/vitejs/vite.git \
  --name vite-pnpm-types \
  --baseline-ref v7.3.2 \
  --current-ref v7.3.3 \
  --group-by workspace \
  --include "packages/*/src/**" \
  --exclude "packages/*/src/**/__tests__/**,packages/*/src/**/*.test.ts,packages/*/src/**/*.spec.ts,packages/*/src/**/*.test.tsx,packages/*/src/**/*.spec.tsx" \
  --warnings coupling,deep,unresolved
```

## Result

- Baseline commit: `cc383e0`
- Current commit: `ca31424`
- Modules: 3
- Baseline observed import sites: 3
- Current observed import sites: 3
- Baseline-spec violations: 0
- Advisory warnings: 0
- Drift: 0 new edges, 0 removed edges

Previous Vite source-scoped run:

- Observed import sites: 0
- Advisory warnings: 60 `unresolved_import`

## Interpretation

This is a resolver calibration win. Vite's type-only `#types/*` and `#dep-types/*` aliases are no longer reported as unresolved graph gaps, while runtime imports that only have declaration files remain unresolved. The resulting graph is still intentionally small because this source scope groups by workspace and most production source belongs to the `Vite` module; the remaining observed edges are `PluginLegacy -> Vite`.

The lesson is that declaration files should not be scanned as normal source by default, but type-only imports can legitimately resolve to declaration targets so unresolved warnings stay meaningful.

Artifacts:

- [Vite type-only package imports summary](vite-pnpm-types-diff-smoke-2026-05-14.md)
- [Vite type-only package imports JSON](vite-pnpm-types-diff-smoke-2026-05-14.json)
- [Vite type-only package imports raw observe](vite-pnpm-types-diff-smoke-raw-observe-2026-05-14.md)
- [Vite type-only package imports raw diff](vite-pnpm-types-diff-smoke-raw-diff-2026-05-14.md)
- [Vite type-only package imports Mermaid](vite-pnpm-types-diff-smoke-2026-05-14.mmd)
