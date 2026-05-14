# Getting Started With Axiom

Axiom gives TypeScript and JavaScript projects a lightweight architecture observability layer with explicit contracts.

The short version:

```text
.axi contract -> declared graph
source imports -> observed graph
Axiom compares both and reports architecture drift
```

Use it first to make drift visible. Promote rules to hard CI failures only when the contract is explicit and high-confidence.

## 1. Install

Axiom's npm package target is `@fatelvx/axiom`. The unscoped `axiom` package name is already used by another package, so the public alpha uses a scoped package.

In a project:

```bash
npm install -D @fatelvx/axiom@alpha --save-exact
npx axi --help
```

For a first read-only architecture pass:

```bash
npx axi infer --root . --include "src/**"
npx axi observe --root . --include "src/**" --warn-large-files
```

From this repository checkout:

```bash
npm install
npm run build
npm install -g .
```

Then run:

```bash
axi --help
```

You can also use the local build without global install:

```bash
node dist/cli.js check --root examples/basic-app
```

## 2. Run The Example

The fastest way to feel the tool is the intentionally invalid example:

```bash
node dist/cli.js check --root examples/basic-app
```

You should see two violations:

- `unexposed_import`: UI imports a Services file that is not part of the public surface.
- `hidden_import`: UI imports a Services internal file.

For a smaller view:

```bash
node dist/cli.js observe --root examples/basic-app
node dist/cli.js observe --root examples/basic-app --markdown
node dist/cli.js graph --root examples/basic-app --violations-only
node dist/cli.js graph --root examples/basic-app --mermaid
```

## 3. Write A First Contract

Create `axiom/main.axi` in your project:

```axi
layers Domain -> App -> UI

module Domain
path "src/domain/**"
layer Domain
exposes "src/domain/index.ts"

module Services
path "src/services/**"
layer App
depends on Domain
exposes "src/services/index.ts"
hides "src/services/internal/**"

module UI
path "src/ui/**"
layer UI
depends on Services
```

If this shape does not match your project, start from [Contract Recipes](contract-recipes.md) instead of writing from a blank page. The recipes are reviewed starting points, not hidden defaults.

This says:

- Domain is the inner layer.
- Services may depend on Domain.
- UI may depend on Services.
- Other modules should import Services through `src/services/index.ts`.
- `src/services/internal/**` is private.

## 4. Run The Check

```bash
axi check --root .
```

If the code follows the contract, Axiom exits `0`.

If the code breaks the contract, Axiom exits `1` and prints the file, line, observed dependency, rule, and suggested fix.

## 5. Adopt Gradually

You do not need to model the whole repository on day one.

Start with one boundary that matters:

- UI should not import backend internals.
- Domain should not import React.
- Runtime code should not import test helpers.
- Public services should be used through an index file.

By default, files not owned by a module path are ignored. Use these when the contract is mature:

```bash
axi check --root . --warn-unowned
axi check --root . --strict
```

Use this advanced probe only when you already have active `exposes` rules and want advisory review prompts for broad exposed barrels or growing facade entry points:

```bash
axi observe --root . --warn-public-api-surface
axi check --root . --warn-public-api-surface
```

Use this when you want advisory visibility into static internal-looking imports Axiom can see but cannot resolve:

```bash
axi observe --root . --warn-unresolved-imports
axi check --root . --warn-unresolved-imports
```

Use this when you want advisory review prompts for modules that may be turning into coupling hubs:

```bash
axi observe --root . --warn-coupling-concentration
axi check --root . --warn-coupling-concentration
```

Use this when you want advisory review prompts for relative imports that bypass likely module entry points:

```bash
axi observe --root . --warn-deep-internal-imports
axi check --root . --warn-deep-internal-imports
```

Use this when you want to see architecture drift since a known graph snapshot:

```bash
axi graph --root . --json > axiom-baseline.json
axi diff axiom-baseline.json --root .
axi diff axiom-baseline.json --root . --markdown
axi observe --root . --baseline axiom-baseline.json
axi observe --root . --baseline axiom-baseline.json --markdown
```

Use `axi diff` when you want the shortest drift-only review: new and removed observed module edges since the baseline. Use `axi observe --baseline` when you also want hard violations, visible intentional debt, advisory warnings, and drift in one review artifact.

Use `--markdown` when the output should become a PR comment, review note, or agent repair-loop message. `axi diff --markdown` stays drift-focused; `axi observe --markdown` keeps hard violations, visible intentional debt, advisory warnings, and drift in separate sections.

Plain `axi observe` output also states its review model: declared `.axi` intent is compared with observed source imports, the command stays advisory and exits `0`, and clean observed edges may be omitted from the attention view. This is intentional; use `axi check` when you want a CI gate.

Use `--mermaid` when you want to see the observed module dependency graph visually:

```bash
axi graph --root . --mermaid
axi observe --root . --mermaid
```

Mermaid output is presentation output over the same graph result. The rendered diagram includes a legend that distinguishes declared `.axi` modules from observed import edges and marks filtered `observe` views. It does not change validation or CI behavior.

If you are only testing Axiom and do not want to add `axiom/main.axi` to the target repository yet, keep the contract somewhere else and pass it explicitly:

```bash
axi observe --root ../some-app --spec ./contracts/some-app.axi --markdown
```

The contract paths still point at files under `--root`.

When a project has a legacy `export *` surface or one public entry point that re-exports many internals, keep `--warn-public-api-surface` advisory, treat broad aggregation as a review question rather than a defect, and follow the migration playbook in [Adopting Axiom In A Real Project](adoption.md#legacy-export--surfaces).

If you already use ESLint architecture rules, Dependency Cruiser, Nx boundaries, CodeQL, or custom scripts, read [Comparison And Boundaries](comparison.md) before replacing anything. Axiom is meant to add declared intent, visible accepted debt, and drift review; it is not a substitute for every existing static-analysis tool.

## 6. Generate A Starter Draft

For an existing project:

```bash
axi infer --root .
```

For a more detailed draft:

```bash
axi infer --root . --group-depth 2
```

For a workspace or monorepo:

```bash
axi infer --root . --group-by workspace
```

The inferred contract is a starting point, not a final architecture. The output marks itself as a current-graph snapshot because it mirrors today's dependency shape rather than recommending what the architecture should become. It also includes an authoring checklist, next commands, and evidence comments before inferred `depends on` edges so the first `.axi` draft is easier to review. Rename modules, add layers, tighten `depends on`, and add `exposes` or `hides` after review. Save a graph baseline, then run `axi diff` after changes to see drift before deciding what should become a gate. If inference collapses a cycle, read the included groups, cycle path sample, and observed internal edges as a clue about where boundaries are tangled. If it prints architecture pressure notes, inspect those large files before assuming a quiet import graph means responsibilities are cleanly split.

For common project shapes such as React apps, React plus Pixi game clients, TypeScript libraries, and monorepos, compare the inferred graph with [Contract Recipes](contract-recipes.md) before turning the draft into declared intent.

If the graph is useful but hard to interpret, read [Read The Graph](read-the-graph.md). If you are sending Axiom to another developer for a quick trial, use the [10-Minute Pilot Card](pilot-card.md).

## 7. Try A Monorepo

Axiom discovers common workspace contract locations by default:

```text
apps/*/axiom/**/*.axi
apps/*/*.axi
packages/*/axiom/**/*.axi
packages/*/*.axi
```

Run the workspace example:

```bash
node dist/cli.js check --root examples/monorepo-workspace
node dist/cli.js observe --root examples/monorepo-workspace
node dist/cli.js graph --root examples/monorepo-workspace --violations-only
```

The example shows `apps/web` importing a hidden internal file from `packages/shared`.

## 8. Add A PR Summary

After the first contract works locally, wire it into CI with a split gate and review summary:

```bash
axi check --root . --json
axi observe --root . --markdown
```

Use [GitHub Actions And PR Summaries](github-actions.md) for a copyable workflow that turns hard violations into GitHub annotations while keeping advisory warnings, visible debt, and drift in the job summary.
