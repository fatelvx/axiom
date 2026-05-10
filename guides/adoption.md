# Adopting Axiom In A Real Project

Axiom is most useful when it starts small and protects a boundary that already hurts.

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

## CI

Add a script:

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

## Reading Failures

Useful commands:

```bash
axi check --root .
axi graph --root . --violations-only
axi check --root . --json
```

Use human output while developing. Use JSON output for CI annotations, agent feedback, and custom reporting.

## When To Tighten

Start loose:

- Model the important modules.
- Add only the dependencies the code already uses.
- Add one or two `forbids module`, `exposes`, or `hides` rules.

Then tighten:

- Turn on `--warn-unowned`.
- Add missing module paths.
- Move mature contracts to `--strict`.
- Add visibility rules for public package or service boundaries.

The goal is not to describe the perfect architecture on day one. The goal is to stop the next accidental boundary breach.
