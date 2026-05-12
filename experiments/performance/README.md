# Axiom Performance Experiments

This folder records repeatable performance smoke checks for Axiom.

The goal is not to claim production-scale monorepo readiness from synthetic data. The goal is to make scan comfort measurable, catch regressions, and keep the product honest about CI cost.

## Smoke Harness

From the repository root:

```bash
npm run perf:smoke
```

The script:

- builds the CLI
- creates a temporary synthetic TypeScript workspace
- writes an `.axi` contract for generated modules
- runs `node dist/cli.js check --root <temp-root>`
- reports fixture size, imports scanned, observed dependencies, and elapsed `axi check` time
- deletes the temporary workspace unless `--keep` is passed

Scale it up with:

```bash
npm run perf:smoke -- --modules 100 --files-per-module 100 --cross-imports-per-file 2
```

Machine-readable output:

```bash
npm run perf:smoke -- --json
```

## Reading Results

Treat these runs as cold synthetic smoke checks.

They are useful for:

- detecting obvious scan regressions
- comparing local changes before and after resolver/discovery work
- producing honest public evidence about current scan cost

They are not enough to prove:

- real monorepo performance
- CI comfort on every team
- resolver behavior on complex package export graphs
- incremental PR-only scan speed

Real adoption still needs scoped configs, pilot repositories, and eventually resolver/discovery caching if larger cold runs stay expensive.
