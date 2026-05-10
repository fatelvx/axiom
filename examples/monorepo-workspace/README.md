# Monorepo Workspace Example

This example models a small workspace layout:

```text
apps/web
packages/shared
```

Axiom discovers architecture contracts in common monorepo locations by default:

- `apps/*/axiom/**/*.axi`
- `apps/*/*.axi`
- `packages/*/axiom/**/*.axi`
- `packages/*/*.axi`

Run:

```bash
node ../../dist/cli.js check --root .
```

Expected result:

- `apps/web/src/main.ts:2` imports `@example/shared/internal/normalize`.
- That resolves through the workspace package export to `packages/shared/src/internal/normalize.ts`.
- `Shared` hides `packages/shared/src/internal/**`, so Axiom reports `hidden_import`.

Focused graph view:

```bash
node ../../dist/cli.js graph --root . --violations-only
```

The legal import is:

```ts
import { formatLabel } from "@example/shared";
```

The illegal import is:

```ts
import { normalizeLabel } from "@example/shared/internal/normalize";
```
