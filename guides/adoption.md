# Adopting Axiom In A Real Project

Axiom is most useful when it starts small, makes drift visible, and protects a boundary that already hurts.

It should not feel like a fully automatic architecture guardian on day one. Treat it as architecture observability first, then tighten mature contracts into CI gates.

## Guardrail Ladder

The comfortable adoption path is a ladder, not a switch:

1. Observe the attention surface with `axi observe --root .`.
2. Measure coverage with `axi check --root . --warn-unowned`.
3. Keep temporary architecture debt visible with `accepts ... until ... because ...`.
4. Inspect broad public surfaces with `axi observe --root . --warn-public-api-surface`.
5. Inspect concentrated coupling with `axi observe --root . --warn-coupling-concentration`.
6. Compare against a saved graph with `axi observe --root . --baseline axiom-baseline.json`.
7. Move only clear, high-confidence rules into CI with `axi check --root .`.
8. Use `--strict` after whole-repo ownership is intentional.

This keeps Axiom useful for humans and agents without turning every advisory signal into a blocker.

## Guardrail Discipline

When deciding whether to tighten a rule, treat forecasts, reviews, and agent failures as risk signals rather than direct marching orders.

Ask three questions first:

1. Is this a reliable, machine-checkable fact, or only an advisory architecture signal?
2. Will surfacing it help real adopters act sooner, or only quiet a theoretical objection?
3. Does the change preserve Axiom's core difference: explicit architecture intent, visible accepted debt, and high-confidence gates?

If the answer is uncertain, prefer a warning, graph view, or documented limitation before adding a CI failure. Axiom should admit blind spots, make them visible, and then tighten only where the signal proves useful.

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
  "tsconfig": "tsconfig.json",
  "intentionalViolationExpiryWarningDays": 30,
  "warnPublicApiSurface": false,
  "warnCouplingConcentration": false
}
```

`include` and `exclude` control source scanning. `specs` controls `.axi` discovery.
`intentionalViolationExpiryWarningDays` controls how early active intentional violations become warnings before their expiration date. `warnPublicApiSurface` and `warnCouplingConcentration` enable advisory signals without turning them into gates.

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

Axiom also reads package boundaries from `package.json` workspaces and `pnpm-workspace.yaml` when resolving internal package exports.

## Limits And Escape Hatches

Axiom is a static architecture validator, not a full runtime oracle.

Expect blind spots around dependency injection strings, plugin registries, generated imports, `eval`, and other runtime-only paths. If those patterns matter in your project, model the stable source-level boundary first and keep the runtime convention visible in review or future custom checks.

Also watch for "compliant but unhealthy" architecture. For example, a giant `index.ts` can make imports pass while concentrating too much coupling in one public surface. Axiom now catches direct `export ... from` leaks from hidden paths through exposed entry points, and `--warn-public-api-surface` can flag exposed `export *` barrels as advisory warnings, but it still cannot prove every symbol-level API decision is healthy. Prefer small exposed entry points, explicit `hides` rules for internals, and intentional violations with expiration dates when migration needs time.

`--warn-coupling-concentration` is another pressure signal, not a verdict. It reports modules with high observed fan-in or fan-out so teams can review whether a module is becoming a coordination hub, facade, or hidden dependency magnet. Some hubs are legitimate; the value is making them visible before the shape becomes accidental.

If your team sees a public surface growing too broad, treat that as an architecture review signal even when `axi check` passes. Symbol-level public API health is a future advisory analysis area, not a v0 guarantee.

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
accepts forbidden_dependency to ServicesInternal until 2027-06-30 because "legacy import while the public service API is split out"
```

Active intentional violations let `axi check` pass but remain visible in human output, JSON output, and focused graph output. Entries expiring within 30 days are warnings, expired intentional violations fail the check, and unused entries are warnings, so old architecture debt does not become invisible policy.

Use a shorter or longer warning window if your team reviews architecture debt on a different cadence:

```bash
axi check --root . --intentional-violation-warning-days 14
```

## Reading Failures

Useful commands:

```bash
axi observe --root .
axi check --root .
axi graph --root . --violations-only
axi graph --root . --attention
axi check --root . --json
axi graph --root . --json > axiom-baseline.json
axi observe --root . --baseline axiom-baseline.json
axi observe --root . --warn-public-api-surface --warn-coupling-concentration
```

Use human output while developing. Use JSON output for CI annotations, agent feedback, and custom reporting.

`axi observe --root .` is the product-facing architecture attention view: it keeps failing edges, intentional violations, and warning guardrails in one focused output. `axi graph --root . --attention` and `--violations-only` remain available when you want the graph command explicitly.

`axi observe --root . --baseline axiom-baseline.json` compares the current observed module edges with an unfiltered `axi graph --json` snapshot. JSON marks this as `advisory_observed_edge_drift`; treat new and removed edges as PR review context first, and promote only the parts that prove consistently useful into stricter automation.

## When To Tighten

Start loose:

- Model the important modules.
- Add `purpose` text so graph output carries human-readable intent.
- Add only the dependencies the code already uses.
- Add one or two `forbids module`, `exposes`, or `hides` rules.

Then tighten:

- Turn on `--warn-unowned`.
- Turn on `--warn-public-api-surface` and `--warn-coupling-concentration` during architecture review.
- Add missing module paths.
- Move mature contracts to `--strict`.
- Add visibility rules for public package or service boundaries.

The goal is not to describe the perfect architecture on day one. The goal is to stop the next accidental boundary breach.
