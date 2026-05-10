# Basic App Example

This example is intentionally invalid.

It models a common app boundary:

- `UI` may depend on `Services`.
- `Services` exposes only `src/services/index.ts`.
- `Services` hides `src/services/internal/**`.

Run:

```bash
node ../../dist/cli.js check --root .
```

Expected result:

- `src/ui/view.ts:2` imports a non-exposed Services file.
- `src/ui/view.ts:3` imports a hidden Services internal file.

Use the focused graph view:

```bash
node ../../dist/cli.js graph --root . --violations-only
```

The legal import is:

```ts
import { getDashboardTitle } from "../services";
```

The illegal imports are:

```ts
import { buildDashboardModel } from "../services/feature";
import { issueServiceToken } from "../services/internal/token";
```
