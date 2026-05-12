# Real-Project Smoke: nanoid and zod

Date: 2026-05-13

This run tested whether Axiom can produce useful architecture-observability signals on small real projects, and whether `axi infer --group-by workspace` can generate a non-overlapping starter contract for a real workspace.

## Repositories

- `ai/nanoid` at `964d1e0`
- `colinhacks/zod` at `b6071fc`

Both repositories were cloned into a temporary local smoke directory. The results below came from the local Axiom build in this changeset.

## nanoid

Commands:

```bash
node dist/cli.js check --root <nanoid> --json
node dist/cli.js observe --root <nanoid> --markdown
```

The hand-written smoke contract modeled:

- `PublicApi`: `index.js`, `index.browser.js`, `index.d.ts`
- hidden implementation path: `url-alphabet/**`
- `Cli`: `bin/**`, allowed to depend on `PublicApi`
- `NonSecure`: `non-secure/**`

Result:

- source files scanned: 6
- imports scanned: 9
- observed dependencies: 1
- hard violations: 0
- intentional violations: 2

Axiom surfaced two `hidden_reexport` sites:

- `index.browser.js:8` re-exports `./url-alphabet/index.js`
- `index.js:5` re-exports `./url-alphabet/index.js`

The contract accepted those as time-bounded intentional debt:

```axi
accepts hidden_reexport to PublicApi until 2026-08-31 because "urlAlphabet is intentionally re-exported from root while the direct subpath stays private"
```

Product read:

- This is a useful example of visible accepted debt: the leak may be intentional, but it remains reviewable, dated, and tied to the contract.
- It matches the product direction of mediation rather than pretending every architectural exception must be blocked.
- The current `accepts` representation is too coarse for surface leaks. One module-level acceptance covers both re-export sites. Future work should support site-, path-, or symbol-scoped acceptance for `hidden_reexport` and public API health findings.
- `.d.ts` files are currently not source-scanned. That is acceptable for a runtime import graph, but it is a gap for TypeScript library public API health.

## zod

Commands:

```bash
node dist/cli.js infer --root <zod> --group-by workspace
node dist/cli.js check --root <zod> --json
node dist/cli.js observe --root <zod> --warn-coupling-concentration --markdown
node dist/cli.js observe --root <zod> --warn-coupling-concentration --warn-deep-internal-imports --markdown
```

Before the fix in this changeset, workspace inference generated overlapping module ownership for packages that had both `src/**` files and root-level package files. For example, `zod` produced both:

- `Zod`: `packages/zod/src/**`
- `Zod2`: `packages/zod/**`

That made the inferred contract a poor starting point because it could immediately create ambiguous ownership.

After the fix:

- source files scanned: 406
- imports scanned: 1103
- inferred modules: 15
- observed dependency import-sites: 59
- hard violations: 0
- advisory warnings: 2 when coupling concentration and deep internal import warnings are enabled

The generated starter contract now keeps package source modules and package root files non-overlapping. For example:

```axi
module Zod
path "packages/zod/src/**"

module ZodVitest
path "packages/zod/vitest.config.ts"
depends on Vitest
```

`axi observe --warn-coupling-concentration --markdown` also surfaced:

- `coupling_concentration`: `Zod` has fan-in from 6 modules: `Benchmarks`, `Integration`, `Play`, `Resolution`, `Scripts`, and `Treeshaking`.

The unique observed module edges in this inferred workspace graph were:

- `Benchmarks -> Zod`
- `Integration -> Zod`
- `Play -> Zod`
- `Resolution -> Zod`
- `Scripts -> Zod`
- `Treeshaking -> Zod`
- `ZodVitest -> Vitest`

That means the six fan-in modules did not depend on each other in this scan; the visible pressure was star-shaped around `Zod`.

After adding `--warn-deep-internal-imports`, Axiom also surfaced:

- `deep_internal_import` at `scripts/check-versions.ts:4`: `Scripts` imports `Zod` through `../packages/zod/src/v4/core/versions.js`, resolving to `packages/zod/src/v4/core/versions.ts`.

Product read:

- This is not a defect in zod. A stable core package is expected to have many dependents.
- It is still useful architecture telemetry: Axiom can make dependency pressure visible without turning that pressure into a CI failure.
- The deep internal import warning is a stronger design-intent review prompt than fan-in alone. It does not prove the import is wrong, but it shows a cross-module dependency on a non-entry implementation path that maintainers may want to make explicit or route through a public surface.
- The real-project smoke found a concrete `axi infer` bug and tightened adoption ergonomics.

## Follow-Up

- Add finer-grained accepted-debt scopes for surface leaks.
- Start public API surface health as advisory analysis, especially for broad barrels and TypeScript declaration surfaces.
- Keep coupling concentration opt-in until more real-project evidence calibrates useful thresholds.
- Continue using real-project smokes as calibration loops, not as proof that Axiom understands complete semantic architecture.
