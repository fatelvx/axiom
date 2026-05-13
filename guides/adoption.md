# Adopting Axiom In A Real Project

Axiom is most useful when it starts small, makes drift visible, and protects a boundary that already hurts.

It should not feel like a fully automatic architecture guardian on day one. Treat it as architecture observability first, then tighten mature contracts into CI gates.

## Guardrail Ladder

The comfortable adoption path is a ladder, not a switch:

1. Observe the attention surface with `axi observe --root .`.
2. Measure coverage with `axi check --root . --warn-unowned`.
3. Surface unresolved internal-looking imports with `axi observe --root . --warn-unresolved-imports`.
4. Keep temporary architecture debt visible with `accepts ... until ... because ...`.
5. Inspect likely public-entry bypasses with `axi observe --root . --warn-deep-internal-imports`.
6. Inspect concentrated coupling with `axi observe --root . --warn-coupling-concentration`.
7. Compare against a saved graph with `axi observe --root . --baseline axiom-baseline.json`.
8. Summarize PR or agent review context with `axi observe --root . --markdown`.
9. Visualize observed module dependencies with `axi graph --root . --mermaid`.
10. Use public-surface probes only when the team is ready to review declared `exposes` entry points with `axi observe --root . --warn-public-api-surface`.
11. Move only clear, high-confidence rules into CI with `axi check --root .`.
12. Use `--strict` after whole-repo ownership is intentional.

This keeps Axiom useful for humans and agents without turning every advisory signal into a blocker.

## Guardrail Discipline

When deciding whether to tighten a rule, treat forecasts, reviews, and agent failures as risk signals rather than direct marching orders.

Ask three questions first:

1. Is this a reliable, machine-checkable fact, or only an advisory architecture signal?
2. Will surfacing it help real adopters act sooner, or only quiet a theoretical objection?
3. Does the change preserve Axiom's core difference: explicit architecture intent, visible accepted debt, and high-confidence gates?

If the answer is uncertain, prefer a warning, graph view, or documented limitation before adding a CI failure. Axiom should admit blind spots, make them visible, and then tighten only where the signal proves useful.

If the team already uses ESLint architecture rules, Dependency Cruiser, Nx boundaries, CodeQL, or custom CI scripts, compare responsibilities before adding Axiom as another gate. The recommended boundary is documented in [Comparison And Boundaries](comparison.md): keep existing tools for the problems they already handle well, and use Axiom for declared architecture intent, visible accepted debt, and reviewable drift.

## First-Run Adoption Without Blanket Acceptance

Axiom intentionally does not provide a v0 command that turns every first-run problem into accepted debt automatically.

That kind of helper would make the first run quieter, but it would also make unreviewed architecture debt look endorsed. Use `axi infer` as a current-graph snapshot, keep early contracts external with `--spec`, and add `accepts ... until ... because ...` only after a human has reviewed the tradeoff.

For existing projects, the safer first-run loop is:

```bash
axi infer --root . > axiom-starter.axi
axi observe --root . --spec axiom-starter.axi --markdown
axi graph --root . --spec axiom-starter.axi --mermaid
axi graph --root . --spec axiom-starter.axi --json > axiom-baseline.json
axi diff axiom-baseline.json --root . --spec axiom-starter.axi
```

The starter contract mirrors current imports. Treat it as evidence, not approval. Use the saved baseline to review future drift with `axi diff` for a short drift-only view or `axi observe --baseline` for a fuller review artifact, then tighten only the boundaries that produce reliable signal.

The generated comments are part of the onboarding surface. They remind reviewers to rename modules into team vocabulary, review every `depends on` edge as architecture intent, inspect the import-site evidence that caused each edge, turn visibility suggestions into rules only after review, and avoid blanket debt acceptance. This is one of the main differences from a linter config: the first artifact is a negotiation aid for declared architecture intent, not just a list of rules to appease.

If the inferred draft is too raw, use [Contract Recipes](contract-recipes.md) as a reviewed starting shape. Recipes lower authoring cost without making Axiom decide your architecture for you.

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
  "warnUnresolvedImports": false,
  "warnPublicApiSurface": false,
  "warnCouplingConcentration": false,
  "warnDeepInternalImports": false,
  "warnLargeFiles": false
}
```

`include` and `exclude` control source scanning. `specs` controls `.axi` discovery.
`intentionalViolationExpiryWarningDays` controls how early active intentional violations become warnings before their expiration date. `warnUnresolvedImports`, `warnPublicApiSurface`, `warnCouplingConcentration`, `warnDeepInternalImports`, and `warnLargeFiles` enable advisory signals without turning them into gates.

For a one-off pilot, you can pass source scope directly on the CLI before writing config:

```bash
axi observe --root . --include "src/**" --exclude "src/**/*.test.ts,src/**/*.test.tsx,src/**/*.spec.ts,src/**/*.spec.tsx"
```

Inline `--include` and `--exclude` patterns are added to config patterns for that run. They are scan-scope controls, not architecture rules.

## Performance Comfort

Large repositories should start with explicit scan scope. Axiom includes a synthetic smoke harness for local evidence:

```bash
npm run perf:smoke
npm run perf:smoke -- --modules 100 --files-per-module 100 --cross-imports-per-file 2
```

The first local smoke showed 2,000 generated source files scanning in about 7.8 seconds and 10,000 generated source files scanning in about 78.7 seconds on a Windows i5-8400 machine. After ownership lookup memoization, the same harness improved to about 2.9 seconds for 2,000 files and 10.0 seconds for 10,000 files. Treat this as an honesty check, not a promise for your monorepo. If a full-root scan is too slow, narrow `include`, exclude generated/runtime folders, and keep early contracts focused on the boundaries that matter most.

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

## External Pilot Contracts

When you are testing Axiom on a living project, you may not want to put `axiom/main.axi` into that repository yet. Use `--spec` to keep the contract in a separate workspace while scanning the target repo:

```bash
axi observe --root ../some-app --spec ./contracts/some-app.axi --markdown
axi check --root ../some-app --spec ./contracts/some-app.axi
```

`--spec` accepts a `.axi` file or a directory of `.axi` files and can be repeated. It replaces normal spec discovery for that run. Module `path`, `exposes`, and `hides` patterns in the external contract are still relative to `--root`.

This is a good fit for early adoption: keep the first contract advisory, run `axi observe` with warnings, then move a reviewed contract into the project only when the team is ready for an explicit `axi check` gate.

For a full step-by-step flow, read [Pilot Workflow](pilot-workflow.md).

## Limits And Escape Hatches

Axiom is a static architecture validator, not a full runtime oracle.

Expect blind spots around dependency injection strings, plugin registries, generated imports, `eval`, and other runtime-only paths. If those patterns matter in your project, model the stable source-level boundary first and keep the runtime convention visible in review or future custom checks.

Use `--warn-unresolved-imports` when you want Axiom to surface static relative imports or package `#imports` that it can see but cannot resolve into the observed graph. This is advisory visibility into graph completeness, not proof that every runtime dependency path is known.

Also watch for "compliant but unhealthy" architecture. For example, a giant `index.ts` can make imports pass while concentrating too much coupling in one public surface. Axiom now catches direct `export ... from` leaks and local `import ... from "./internal"` followed by `export { ... }` leaks from hidden paths through exposed entry points. `--warn-public-api-surface` can flag exposed `export *` barrels and entry points that reach many internal files as advisory warnings, but it is an advanced probe, not a default adoption step. Axiom still cannot prove every symbol-level API decision is healthy. Prefer small exposed entry points, explicit `hides` rules for internals, and intentional violations with expiration dates when migration needs time.

Use `--warn-deep-internal-imports` when you want to find relative cross-module imports that bypass a likely `index.*` entry point. This is useful before you are ready to turn `exposes` into a hard rule: it can show where teams or agents are already relying on another module's internal file layout.

`--warn-coupling-concentration` is another pressure signal, not a verdict. It reports modules with high observed fan-in or fan-out so teams can review whether a module is becoming a coordination hub, facade, or hidden dependency magnet. Some hubs are legitimate; the value is making them visible before the shape becomes accidental.

If your team sees a public surface growing too broad, treat that as an architecture review signal even when `axi check` passes. Symbol-level public API health is a future advisory analysis area, not a v0 guarantee.

## Legacy `export *` Surfaces

Large existing barrels are common. Do not hide them with a separate allowlist, and do not try to turn `broad_public_surface` into an intentional violation. It is advisory by design.

Use this migration path instead:

1. Run `axi infer --root .` to capture the current module graph.
2. Add `exposes` for the public entry points that are meant to exist today.
3. Add `hides` for internal folders that should not be imported directly.
4. If the team specifically wants to review public entrypoint growth, run `axi observe --root . --warn-public-api-surface` and treat each broad-barrel or entrypoint-coupling warning as a review item, not a merge blocker.
5. Replace broad barrels with named exports or narrower entry points over time.
6. If a real hidden-path leak or temporary visibility breach appears during migration, use `accepts ... until ... because ...` for that concrete violation only.
7. Remove the intentional violation when the migration is done.

This keeps the debt visible without pretending Axiom can prove full symbol-level API health in v0. Public wrappers around hidden implementation imports are still a valid pattern; the hard violation is the explicit leak of a hidden symbol into an exposed surface.

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

Use `axi observe --root .` or `axi observe --root . --markdown` when reviewing accepted debt. The observe output includes a visible intentional debt ledger that also covers accepted non-edge surface violations, such as a temporary `hidden_reexport` from an exposed entry point.

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
axi graph --root . --mermaid
axi observe --root . --markdown
axi check --root . --json
axi graph --root . --json > axiom-baseline.json
axi observe --root . --baseline axiom-baseline.json
axi observe --root . --baseline axiom-baseline.json --markdown
axi observe --root . --warn-unresolved-imports --warn-coupling-concentration --warn-deep-internal-imports
```

Use human output while developing. Use JSON output for CI annotations and custom reporting. Use Markdown output for PR comments, review artifacts, and agent repair-loop summaries. Use Mermaid output when a visual observed module graph makes the drift discussion easier.

Add `--warn-public-api-surface` separately only when the team is intentionally reviewing declared public entry points.

`axi observe --root .` is the product-facing architecture attention view: it keeps failing edges, intentional violations, and warning guardrails in one focused output. `axi graph --root . --attention` and `--violations-only` remain available when you want the graph command explicitly.

The human attention output begins with its review model so it does not read like a normal linter report: Axiom is comparing declared `.axi` intent with observed source imports, the output is advisory unless you run `axi check`, and filtered attention views omit clean observed edges while keeping the full observed-edge count.

`axi graph --root . --mermaid` renders the observed module dependency graph with layer groupings and a visible legend. `axi observe --root . --mermaid` uses the same focused attention filter as observe, so the diagram marks itself as filtered and is useful for visualizing only the edges under review.

For a concrete GitHub Actions setup, read [GitHub Actions And PR Summaries](github-actions.md). The recommended split is `axi check --json` for the hard gate and `axi observe --markdown` for review context.

If you build on JSON output, read [JSON Consumers](json-consumers.md). Use `axi check --json` for gates, tolerate additive graph fields, and read top-level `intentionalDebt[]` when reviewing accepted debt.

`axi observe --root . --baseline axiom-baseline.json` compares the current observed module edges with an unfiltered `axi graph --json` snapshot. JSON marks this as `advisory_observed_edge_drift`; treat new and removed edges as PR review context first, and promote only the parts that prove consistently useful into stricter automation.

`axi diff axiom-baseline.json --root .` is the shortest first-value view over the same baseline model. It shows only new and removed observed module edges, exits `0`, and stays advisory. Use it when you want architecture drift to be visible before the contract is mature enough to gate.

`axi observe --root . --markdown` and `axi observe --root . --baseline axiom-baseline.json --markdown` keep hard violations, visible intentional debt, advisory warnings, and drift in separate sections. This makes the escape hatch conspicuous without making every advisory signal a blocker. The visible debt section is contract-led, not edge-only, so accepted surface leaks still appear in the review artifact.

## Contract Maintenance Rhythm

A `.axi` contract should stay small enough that someone can own it.

For a first real project, define:

- who reviews contract changes,
- which boundaries are important enough to gate,
- when intentional violations expire,
- when to refresh the graph baseline,
- which advisory warnings are only discussion signals.

Do not keep rules that no one can explain. Axiom's value is preserving declared architecture intent over time; a stale contract becomes the same maintenance burden as any other ignored config file.

## When To Tighten

Start loose:

- Model the important modules.
- Add `purpose` text so graph output carries human-readable intent.
- Add only the dependencies the code already uses.
- Add one or two `forbids module`, `exposes`, or `hides` rules.

Then tighten:

- Turn on `--warn-unowned`.
- Turn on `--warn-unresolved-imports`, `--warn-coupling-concentration`, and `--warn-deep-internal-imports` during architecture review.
- Add `--warn-public-api-surface` later only for advanced public-entrypoint review with active `exposes` rules.
- Add missing module paths.
- Move mature contracts to `--strict`.
- Add visibility rules for public package or service boundaries.

The goal is not to describe the perfect architecture on day one. The goal is to stop the next accidental boundary breach.
