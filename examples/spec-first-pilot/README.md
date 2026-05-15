# Spec-First Pilot Example

This example is intentionally valid at rest.

It models a small reviewed contract before any generated inference is involved:

- `Domain` is the inner layer and owns pure domain records.
- `Application` may depend on `Domain`, exposes only `src/application/index.ts`, and hides `src/application/internal/**`.
- `UI` may depend on `Application`.
- Dependencies must point inward through `layers Domain -> Application -> UI`.

Run:

```bash
node ../../dist/cli.js check --root .
node ../../dist/cli.js observe --root . --markdown
node ../../dist/cli.js graph --root . --json > .axi/baselines/current.graph.json
node ../../dist/cli.js diff .axi/baselines/current.graph.json --root .
```

Expected result:

- `axi check` passes.
- `axi observe` reports a passing contract.
- `axi diff` is advisory and reports no observed-edge drift against the saved baseline.

The repeatable smoke harness copies this example to a temporary directory, confirms the clean contract passes, then writes deliberate drift files and confirms `axi check` fails:

```bash
npm run spec-first:smoke
```

That smoke is the validator trust loop in miniature:

- human-reviewed `.axi` intent first;
- observed imports second;
- graph baseline and review story as advisory evidence;
- path-scoped intentional debt as visible, expiring architecture debt;
- hard gate only for explicit contract drift.
