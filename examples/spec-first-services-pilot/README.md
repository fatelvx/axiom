# Spec-First Services Boundary Pilot

This example models a small app boundary that looks closer to an AI-built product:

- `Contracts` owns shared service/store types.
- `Services` owns runtime behavior and exposes only `src/services/index.ts`.
- `Store` owns local state and exposes only `src/store/index.ts`.
- `Components` and `Hooks` may call `Services` and `Store`, but should not import their internals.
- One legacy component has visible, path-scoped debt while the boundary migrates.

Run:

```bash
node ../../dist/cli.js check --root .
node ../../dist/cli.js observe --root . --markdown
node ../../dist/cli.js graph --root . --json > .axi/baselines/current.graph.json
node ../../dist/cli.js diff .axi/baselines/current.graph.json --root .
```

Expected result:

- `axi check` passes with `0` hard violations.
- The legacy service bypass is reported as visible intentional debt, not hidden suppression.
- `axi observe` and `axi diff` stay advisory review surfaces.

The repeatable smoke harness copies this example to a temporary directory, then verifies:

- the reviewed contract passes with visible debt;
- another services-internal bypass still fails as `hidden_import`;
- new `Services -> Store` and `Store -> Services` edges fail as `undeclared_dependency`.

Run the full rehearsal:

```bash
npm run spec-first:smoke
```
