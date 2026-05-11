# Adopting Axiom In A Real Project

Axiom is most useful when it starts small, makes drift visible, and protects a boundary that already hurts.

It should not feel like a fully automatic architecture guardian on day one. Treat it as an architecture attention layer first, then tighten mature contracts into CI gates.

## Good First Rules

Choose one or two rules that would catch real mistakes:

```axi
module UI
path "src/ui/**"
depends on Services

module Services
path "src/services/**"
exposes "src/services/index.ts"
hides "src/services/internal/**"
```

This lets UI use Services, but blocks direct imports into private service files.

## Project Config

Use `axiom.config.json` to keep source discovery focused:

```json
{
  "include": ["src/**"],
  "exclude": ["src/**/*.test.ts", "src/generated/**"],
  "specs": ["axiom/**/*.axi"],
  "tsconfig": "tsconfig.json"
}
```

`include` and `exclude` control source scanning. `specs` controls `.axi` discovery.

## Monorepos

Axiom discovers specs from common workspace locations by default:

```text
apps/*/axiom/**/*.axi
apps/*/*.axi
packages/*/axiom/**/*.axi
packages/*/*.axi
```

This works well for Turborepo and many pnpm workspace repos:

```text
apps/web/axiom/main.axi
packages/shared/.axi
```

If your repo uses a different shape, set `specs` explicitly:

```json
{
  "include": ["apps/*/src/**", "packages/*/src/**"],
  "specs": ["services/*/axiom/**/*.axi", "libs/*/.axi"]
}
```

Use workspace-aware inference when drafting the first contract:

```bash
axi infer --root . --group-by workspace
```

## CI

After the first npm publish, install the scoped package:

```bash
npm install -D @fatelvx/axiom
```

Then add a script:

```json
{
  "scripts": {
    "axiom": "axi check --root ."
  }
}
```

Then in GitHub Actions:

```yaml
name: Axiom

on:
  pull_request:
  push:
    branches: [main]

jobs:
  axiom:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run axiom
```

Until Axiom is published to npm, use a local checkout or package installation strategy that fits your repository.

## Progressive Ownership

Default mode ignores unowned source files, which makes partial adoption practical.

Use warning mode to measure coverage:

```bash
axi check --root . --warn-unowned
```

Use strict mode when every source file should be owned:

```bash
axi check --root . --strict
```

## Intentional Violations

Temporary intentional violations belong in the architecture contract, with a date and a reason:

```axi
module UI
path "src/ui/**"
forbids module ServicesInternal
suppresses forbidden_dependency to ServicesInternal until 2027-06-30 because "legacy import while the public service API is split out"
```

Active intentional violations let `axi check` pass but remain visible in human output, JSON output, and focused graph output. Entries expiring within 30 days are warnings, expired intentional violations fail the check, and unused entries are warnings, so old architecture debt does not become invisible policy.

## Reading Failures

Useful commands:

```bash
axi check --root .
axi graph --root . --violations-only
axi check --root . --json
```

Use human output while developing. Use JSON output for CI annotations, agent feedback, and custom reporting.

`axi graph --root . --violations-only` is also useful as an architecture attention view: it keeps failing edges, intentional violations, and warning guardrails in one focused output.

## When To Tighten

Start loose:

- Model the important modules.
- Add `purpose` text so graph output carries human-readable intent.
- Add only the dependencies the code already uses.
- Add one or two `forbids module`, `exposes`, or `hides` rules.

Then tighten:

- Turn on `--warn-unowned`.
- Add missing module paths.
- Move mature contracts to `--strict`.
- Add visibility rules for public package or service boundaries.

The goal is not to describe the perfect architecture on day one. The goal is to stop the next accidental boundary breach.
