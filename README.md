# Axiom

[![CI](https://github.com/fatelvx/axiom/actions/workflows/ci.yml/badge.svg)](https://github.com/fatelvx/axiom/actions/workflows/ci.yml)

![Axiom architecture observability banner](assets/banner.svg)

**Architecture observability, visible debt, and enforceable contracts for AI-era codebases.**

Axiom reads `.axi` contracts, scans real TypeScript and JavaScript imports, and shows where the observed code graph drifts from declared architecture intent. It can fail CI for high-confidence boundaries, but its first job is to make architecture drift and accepted debt observable enough for humans and agents to act on.

> Axiom is part of an ongoing experiment to make architecture hallucinations in AI-generated code observable and enforceable. Read the technical note: [Architecture Hallucinations in LLM-Generated Code](https://gist.github.com/fatelvx/99fadeae8014a1ddc1e8b67727481ee5).

```text
.axi contract -> declared graph
source imports -> observed graph
Axiom compares both -> architecture violations with file, line, rule, and fix
```

Axiom is not a prompt wrapper and not a style linter. It is an architecture observability layer with enforceable contracts: it turns boundaries that usually live in docs, reviews, and memory into visible graph feedback, warnings, intentional violations, and CI gates where the contract is clear enough.

Status: public alpha / developer preview. The validator is usable today, but the `.axi` language and JSON schemas may still evolve before a stable 1.0.

## Product Direction

Axiom is deliberately not starting as a fully automatic architecture guardian. That would be too rigid and too noisy for real codebases.

The near-term product is:

- architecture drift awareness
- dependency direction tracking
- module boundary warnings
- module fan-in/fan-out concentration warnings
- semantic ownership mapping through `.axi`
- intentional violations that stay visible instead of being hidden
- hard failures only for explicit, high-confidence contracts

Code can be locally correct while globally collapsing. Axiom's job is to make that collapse visible before it becomes normal, then enforce only the parts of the contract that are clear enough to trust.

This matters more in AI-era repositories because agents can change many files quickly. Axiom should let agents communicate with the architecture contract, while the tool mediates what is a hard violation, what is accepted debt, and what is advisory drift.

## Forecast Signal

A live MiroFish forecast was run on 2026-05-11 against Axiom's current product seed. It used synthetic stakeholder profiles and simulated social reactions, so it is not market proof or a replacement for real users. Its value is product-risk discovery.

Treat forecast output as a risk map, not an action script. Axiom should absorb the problems it surfaces, then decide changes through the product's own filter: is the signal reliably checkable, does the change help real adopters instead of only quieting skeptics, and does it preserve Axiom's core difference as an architecture contract validator rather than a broad semantic oracle?

The sharpest finding was `symbol-level API health`: Axiom can validate import and visibility intent, and it can catch direct hidden-path re-exports, but it cannot prove that broad public API surfaces are semantically healthy.

A later targeted backtest of `axi observe` accepted the observability direction and picked module fan-in/fan-out concentration as the next low-noise signal to try. That signal is now opt-in because high coupling is an architecture pressure point, not automatic proof of bad design.

A targeted backtest after ownership lookup memoization accepted the performance improvement as a material reduction in CI-friction risk, but shifted the highest-signal objection toward observed-graph blind spots. Axiom now has opt-in unresolved import warnings for static internal-looking imports that the scanner can see but the resolver cannot map into the source graph.

The forecast also predicted rejection if Axiom looks like:

- Dependency Cruiser with a new syntax
- another noisy linter
- a slow CI step
- a false architecture firewall

So the public product promise is deliberately narrower: make drift visible, keep accepted debt reviewable, and fail CI only for explicit high-confidence rules. Read the summarized forecast in [MiroFish Live Forecast: Axiom Reception](experiments/axiom-forecast/results/mirofish-live-run-2026-05-11.md), or the Chinese process/output excerpt in [MiroFish Live Forecast 中文過程與輸出摘錄](experiments/axiom-forecast/results/mirofish-live-run-2026-05-11.zh.md).

## Why It Exists

AI coding agents are fast, but they often guess architecture from nearby files. Humans do this too. If your boundary is "UI may use Services, but only through the public Services entry point", that rule needs to be machine-checkable.

Axiom lets you write:

```axi
module Services
path "src/services/**"
exposes "src/services/index.ts"
hides "src/services/internal/**"

module UI
path "src/ui/**"
depends on Services
```

Then this is allowed:

```ts
import { getDashboardTitle } from "../services";
```

And this is reported:

```ts
import { issueServiceToken } from "../services/internal/token";
```

## Try It In 60 Seconds

From this repository:

```bash
npm install
npm run build
node dist/cli.js check --root examples/basic-app
```

The example intentionally fails:

```text
Axiom check failed.
violations: 2

error unexposed_import src/ui/view.ts:2
  UI imports a non-exposed path from Services.
  observed: UI -> Services via "../services/feature"
  rule: Services exposes src/services/index.ts (axiom/main.axi:13)
  fix: Import an exposed entry point from Services, or add an exposes rule for this public API.

error hidden_import src/ui/view.ts:3
  UI imports hidden path from Services.
  observed: UI -> Services via "../services/internal/token"
  rule: Services hides src/services/internal/** (axiom/main.axi:14)
  fix: Import an exposed entry point from Services, or move the shared code behind a public boundary.
```

For a smaller graph view:

```bash
node dist/cli.js observe --root examples/basic-app
node dist/cli.js graph --root examples/basic-app --violations-only
node dist/cli.js graph --root examples/basic-app --attention
```

Choose your next step:

- Existing project: start with `axi infer --root .`, then follow [Adopting Axiom In A Real Project](guides/adoption.md).
- CI path: read the [CI](#ci) section and the dogfooded workflow in [.github/workflows/ci.yml](.github/workflows/ci.yml).
- Real contract shape: inspect [examples/monorepo-workspace](examples/monorepo-workspace) for package-level contracts.

## What It Checks

Axiom v0.5.8 currently supports:

- Module ownership with `path`.
- Multiple source paths per module.
- Allowed dependencies with `depends on`.
- Forbidden module edges with `forbids module`.
- Layer direction with `layers Core -> UI`.
- Public/private module surfaces with `exposes` and `hides`.
- Direct hidden-path re-exports from exposed entry points.
- Opt-in public API surface warnings for broad exposed barrels with `--warn-public-api-surface`.
- Opt-in coupling concentration warnings for modules with high observed fan-in or fan-out with `--warn-coupling-concentration`.
- Opt-in unresolved import warnings for static relative or package `#imports` that Axiom can see but cannot resolve with `--warn-unresolved-imports`.
- TypeScript/JavaScript import scanning through the TypeScript parser.
- Relative imports, barrel `index.*` files, dynamic imports, `require`, and multiline imports.
- TypeScript `paths` aliases from `tsconfig.json`.
- Package `imports` and workspace package `exports` for internal package-style imports.
- Workspace package discovery from `package.json` workspaces and `pnpm-workspace.yaml`.
- Common monorepo contract discovery under `apps/*` and `packages/*`.
- Gradual adoption with default loose mode, `--warn-unowned`, and `--strict`.
- Intentional violations that require an expiration date and reason.
- Module `purpose` text surfaced in graph and JSON output for lightweight intent awareness.
- Human output and stable JSON output for CI and agents.
- Markdown architecture review summaries for PRs and agent repair loops with `axi observe --markdown`.
- Starter contract inference with `axi infer`.
- Architecture attention output with `axi observe`.
- Baseline-aware observed edge drift with `axi observe --baseline <graph-json>`.
- Focused graph output with `axi graph --violations-only`.
- Scan summaries with module, source-file, import, and observed-dependency counts.

## What It Does Not Prove

Axiom v0 is intentionally honest about its blind spots:

- It does not fully observe runtime-only dependency paths such as string-based dependency injection, plugin registries, generated imports, or `eval`.
- It can optionally warn about static relative or package `#imports` that the scanner sees but cannot resolve with `--warn-unresolved-imports`, but it still cannot see non-literal runtime wiring.
- It does not prove that a module is semantically well-designed. Axiom can catch direct hidden-path re-exports, and `--warn-public-api-surface` can flag broad `export *` barrels, but code can still become too coupled through overly large public entry points. This is the `symbol-level API health` gap.
- It does not prove that concentrated fan-in or fan-out is wrong. `--warn-coupling-concentration` surfaces modules that may be turning into coordination hubs so humans and agents can review the pressure before it becomes hidden debt.
- It does not replace ESLint, TypeScript, tests, or review. Axiom focuses on architecture intent: declared graph, observed graph, drift, warnings, intentional violations, and CI gates for clear contracts.
- It does not make `.axi` maintenance free. Use `axi infer` to start from the current graph, then tighten only the boundaries that matter.
- It does not promise whole-monorepo speed without scope control. Use `include`, `exclude`, and focused contract locations to keep large repositories comfortable in CI.

The product goal is not perfect automatic architecture governance. The goal is a shared, machine-checkable observability layer where humans and agents can see drift early, accept temporary debt visibly, and enforce high-confidence boundaries.

## Contract Robustness

Axiom treats broken contracts as visible diagnostics instead of silently skipping them:

- Syntax errors become `parse_error` diagnostics with file and line locations.
- Duplicate modules, missing module paths, unknown modules, unknown layers, duplicate layer orders, ambiguous owners, and declared dependency cycles are validation errors.
- The parser keeps collecting diagnostics after a bad line where it can, so one typo does not hide the rest of the contract.
- `.axi` files are declarative text. Axiom does not execute contract code, macros, or plugins.
- Glob patterns are compiled for matching; Axiom does not expand a glob into an unbounded rule graph. Source discovery still walks real files, so large repositories should use scoped `include` and `exclude` patterns.

There is no public hard budget yet for pathological glob complexity or contract size. Treat this as a known hardening frontier: keep contracts small, keep source scope explicit, and report cases where contract parsing or matching becomes expensive.

## Performance Smoke

Axiom includes a repeatable synthetic performance smoke harness so scan comfort can be measured instead of hand-waved:

```bash
npm run perf:smoke
npm run perf:smoke -- --modules 100 --files-per-module 100 --cross-imports-per-file 2
```

Local results on Windows x64 / Node v24.14.1 / Intel i5-8400:

| Run | Source files | Imports scanned | `axi check` duration |
| --- | ---: | ---: | ---: |
| Initial baseline | 2,000 | 3,880 | 7.8s |
| Initial baseline | 10,000 | 19,700 | 78.7s |
| After ownership lookup memoization | 2,000 | 3,880 | 2.9s |
| After ownership lookup memoization | 10,000 | 19,700 | 10.0s |

These are cold synthetic runs, not production benchmark proof. The latest run shows that repeated ownership matching was a real early bottleneck, but large monorepos still need scoped `include`/`exclude` config, focused contract locations, pilot evidence, and future resolver/discovery caching before Axiom should claim broad CI comfort.

Linux numbers are collected separately by the [Performance Smoke](.github/workflows/perf-smoke.yml) workflow on `ubuntu-latest`, which uploads JSON artifacts for 2k-file and 10k-file synthetic runs. The README should only publish those numbers after a workflow artifact exists, not by extrapolating from local Windows results.

## Install

Requirements:

- Node.js 20+
- npm

Local checkout:

```bash
npm install
npm run build
```

Optional global install from this checkout:

```bash
npm install -g .
axi check --root examples/basic-app
```

Axiom's npm package target is `@fatelvx/axiom`. The unscoped `axiom` package name is already used by another package, so the first alpha release uses a scoped package.

Until the first npm publish, use this repository checkout. After publishing:

```bash
npm install -D @fatelvx/axiom
npx axi check --root .
npx @fatelvx/axiom check --root .
```

## Core Commands

```bash
axi check --root <project>
axi observe --root <project>
axi graph --root <project>
axi infer --root <project>
```

Use them like this:

- `axi check`: validate code against `.axi`; exits `1` on violations.
- `axi observe`: show the architecture attention surface; exits `0` and focuses violations, visible debt, and warnings.
- `axi graph`: inspect declared and observed graphs; exits `0` even with violations.
- `axi graph --violations-only` or `axi graph --attention`: show failing edges, intentional violations, and warning guardrails.
- `axi infer`: print a starter `.axi` draft from existing imports.

Useful flags:

```bash
axi check --root . --json
axi observe --root .
axi observe --root . --markdown
axi observe --root . --warn-public-api-surface
axi observe --root . --warn-unresolved-imports
axi observe --root . --warn-coupling-concentration
axi check --root . --warn-unowned
axi check --root . --warn-public-api-surface
axi check --root . --warn-unresolved-imports
axi check --root . --warn-coupling-concentration
axi check --root . --strict
axi graph --root . --json
axi graph --root . --json > axiom-baseline.json
axi observe --root . --baseline axiom-baseline.json
axi observe --root . --baseline axiom-baseline.json --markdown
axi infer --root . --group-depth 2
axi infer --root . --group-by workspace
```

## First Contract

Create `axiom/main.axi`:

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

Run:

```bash
axi check --root .
```

This contract says:

- UI can depend on Services.
- Services can depend on Domain.
- Domain cannot depend outward on App or UI.
- Other modules should import Services through `src/services/index.ts`.
- `src/services/internal/**` is private.

## Existing Projects

For an existing codebase, start with inference:

```bash
axi infer --root .
```

For deeper folder grouping:

```bash
axi infer --root . --group-depth 2
```

For monorepos:

```bash
axi infer --root . --group-by workspace
```

Inference prints a draft to stdout and does not write files. Treat it as a starting point: rename modules, add layers, tighten `depends on`, and add `exposes` or `hides` after review.

## Monorepos

Axiom understands common npm, pnpm, and Turborepo-style workspace layouts.

By default it discovers `.axi` specs from:

```text
axiom/**/*.axi
*.axi
apps/*/axiom/**/*.axi
apps/*/*.axi
packages/*/axiom/**/*.axi
packages/*/*.axi
```

This lets a repo keep package-level contracts near the package:

```text
apps/web/axiom/main.axi
packages/shared/.axi
```

Try the monorepo example:

```bash
node dist/cli.js check --root examples/monorepo-workspace
node dist/cli.js graph --root examples/monorepo-workspace --violations-only
```

Use `axiom.config.json` `specs` when your workspace layout is different.

## Project Config

Axiom reads `axiom.config.json` from the project root when present:

```json
{
  "include": ["src/**"],
  "exclude": ["src/**/*.test.ts", "src/generated/**"],
  "specs": ["axiom/**/*.axi"],
  "tsconfig": "tsconfig.json",
  "intentionalViolationExpiryWarningDays": 30,
  "warnUnresolvedImports": false,
  "warnPublicApiSurface": false,
  "warnCouplingConcentration": false
}
```

Fields:

- `include`: source files to scan. If omitted, Axiom scans supported source files outside default ignored directories.
- `exclude`: source files or directories to skip in addition to default ignored directories.
- `specs`: `.axi` files to read. Defaults to `axiom/**/*.axi` and `*.axi`.
- `tsconfig`: TypeScript config path used for `paths` alias resolution. Defaults to `tsconfig.json` when present.
- `intentionalViolationExpiryWarningDays`: warn when accepted intentional violations expire within this many days. Defaults to `30`.
- `warnUnresolvedImports`: opt into advisory warnings for owned files with static relative or package `#imports` that Axiom cannot resolve.
- `warnPublicApiSurface`: opt into advisory warnings for broad exposed barrels such as `export *`.
- `warnCouplingConcentration`: opt into advisory warnings for modules with high observed fan-in or fan-out.

Default discovery skips common dependency, build, cache, and temporary output folders:

```text
.cache
.git
.next
.nuxt
.svelte-kit
.turbo
.vite
build
coverage
dist
node_modules
out
target
temp
tmp
```

Project-specific generated or runtime folders should go in your own `exclude` config.

## Adoption Modes

By default, Axiom ignores source files that are not owned by any module `path`. This keeps partial adoption cheap.

Use warning mode to measure coverage:

```bash
axi check --root . --warn-unowned
```

Use strict mode once every discovered source file should be owned:

```bash
axi check --root . --strict
```

## Intentional Violations

When a real project needs a temporary intentional violation, keep it visible in `.axi`:

```axi
module UI
path "src/ui/**"
forbids module ServicesInternal
accepts forbidden_dependency to ServicesInternal until 2027-06-30 because "legacy import while the public service API is split out"
```

Intentional violations only apply to observed dependency and visibility violations. Expired intentional violations fail the check, invalid entries cannot hide violations, entries expiring within 30 days become warnings, and unused entries are warnings so old architecture debt stays visible after the code is cleaned up.

`axi observe` and `axi observe --markdown` show a dedicated visible debt ledger. That ledger is not limited to dependency edges, so accepted surface violations such as `hidden_reexport` still appear even when the focused observed graph has no edge to show.

Tune the warning window per project with `intentionalViolationExpiryWarningDays` in `axiom.config.json`, or for one command with `--intentional-violation-warning-days <n>`.

## Public API Surface Warnings

To inspect the `symbol-level API health` pressure point without turning it into a hard gate, opt into public surface warnings:

```bash
axi check --root . --warn-public-api-surface
axi observe --root . --warn-public-api-surface
axi graph --root . --attention --warn-public-api-surface
```

Today this flags broad exposed barrels such as `export * from "./feature"` or `export * as feature from "./feature"`. It is advisory: the check still exits `0` unless there are real violations. Treat it as a review prompt when an exposed entry point starts hiding coupling behind one public surface.

## Unresolved Import Warnings

To inspect observed-graph blind spots without turning them into a hard gate, opt into unresolved import warnings:

```bash
axi observe --root . --warn-unresolved-imports
axi check --root . --warn-unresolved-imports
axi graph --root . --attention --warn-unresolved-imports
```

Today this flags static relative imports and package `#imports` from owned files when Axiom can see the import but cannot resolve it to a source file. It is advisory: the check still exits `0` unless there are real violations. Treat it as a prompt to configure `tsconfig` or package imports, restore a missing file, or acknowledge that generated/runtime wiring is outside the observed graph.

## Coupling Concentration Warnings

To inspect architecture pressure without turning it into a hard gate, opt into coupling concentration warnings:

```bash
axi observe --root . --warn-coupling-concentration
axi check --root . --warn-coupling-concentration
axi graph --root . --attention --warn-coupling-concentration
```

Today this flags a module when the observed graph shows fan-in from at least four distinct modules or fan-out to at least four distinct modules. It is advisory: the check still exits `0` unless there are real violations. Treat it as a review prompt for modules that may be becoming coordination hubs, broad facades, or hidden dependency magnets.

## JSON And Markdown Output

`axi check --json` emits `axiom.check.v4`:

```json
{
  "schemaVersion": "axiom.check.v4",
  "ok": false,
  "summary": {
    "modules": 2,
    "specFiles": 1,
    "sourceFiles": 2,
    "importsScanned": 1,
    "observedDependencies": 1,
    "violations": 1,
    "intentionalViolations": 0,
    "warnings": 0
  },
  "violations": [
    {
      "code": "hidden_import",
      "message": "UI imports hidden path from Services.",
      "location": {
        "filePath": "src/ui/view.ts",
        "line": 3
      },
      "details": {
        "observed": "UI -> Services",
        "rule": "Services hides src/services/internal/**",
        "suggestion": "Import an exposed entry point from Services, or move the shared code behind a public boundary."
      }
    }
  ]
}
```

`axi graph --json` and `axi observe --json` emit `axiom.graph.v9`. Each observed dependency includes `violations` and `intentionalViolations` arrays. Graph JSON also includes a top-level `intentionalDebt` ledger so accepted non-edge violations, such as hidden public-surface re-exports, stay visible to PR comments and agents. With `--violations-only`, `--attention`, or `observe`, `observedDependencies` is filtered to the edges that need attention or have accepted architecture debt, warning guardrails are still shown with details, and `summary.observedDependencies` keeps the full count. The JSON `filters` object marks focused attention output.

Use an unfiltered graph JSON file as a baseline when you want to inspect architecture drift in a PR or agent run:

```bash
axi graph --root . --json > axiom-baseline.json
axi observe --root . --baseline axiom-baseline.json
```

The baseline comparison reports new and removed observed module edges. It is an observability surface, not a hard gate; JSON marks it as `advisory_observed_edge_drift`. Axiom rejects filtered baselines from `--attention` or `--violations-only` so drift is not computed from incomplete graph data.

Use Markdown output when the result should be pasted into a PR comment, agent repair loop, or review artifact:

```bash
axi observe --root . --markdown
axi observe --root . --baseline axiom-baseline.json --markdown
```

Markdown output is a review summary, not a new validator path. It separates hard violations, visible intentional debt, advisory warnings, and baseline drift so humans and agents can negotiate with the architecture contract without treating every signal as a hard gate. Visible debt is listed from the contract ledger, not only from dependency edges, so accepted surface leaks remain conspicuous.

## CI

This repository dogfoods Axiom in GitHub Actions:

```bash
npm ci
npm run ci
```

The repository also has a separate performance smoke workflow that records Linux synthetic scan evidence without making the normal CI gate slower:

```bash
node scripts/perf-smoke.mjs --json
node scripts/perf-smoke.mjs --modules 100 --files-per-module 100 --cross-imports-per-file 2 --json
```

For your own project, add a script:

```json
{
  "scripts": {
    "axiom": "axi check --root ."
  }
}
```

Then run that script in CI after installing dependencies.

## Guides

- [Getting Started](guides/getting-started.md)
- [Adopting Axiom In A Real Project](guides/adoption.md)
- [Publishing The Public Alpha](guides/publishing-alpha.md)
- [Contributing](CONTRIBUTING.md)
- [Basic App Example](examples/basic-app)
- [Monorepo Workspace Example](examples/monorepo-workspace)

## Violation Types

Axiom can currently report:

- `forbidden_dependency`
- `undeclared_dependency`
- `hidden_import`
- `hidden_reexport`
- `broad_public_surface`
- `coupling_concentration`
- `unresolved_import`
- `unexposed_import`
- `unowned_source_file`
- `invalid_suppression`
- `expired_suppression`
- `expiring_suppression`
- `unused_suppression`
- `layer_breach`
- `ambiguous_module_owner`
- `cycle_dependency`
- `unknown_module`
- `unknown_layer`
- `duplicate_module`
- `duplicate_layer_order`
- `missing_module_path`
- `parse_error`
- `no_spec_files`

## Development

```bash
npm run ci
npm test
npm run axiom:self
npm run perf:smoke
npm run alpha:check
npm run check:fixture
node dist/cli.js check --root examples/basic-app
```

## Community

Questions, contract-design discussions, and rough ideas are welcome. Use [GitHub Discussions](https://github.com/fatelvx/axiom/discussions) for open-ended design conversation when available, or [open an issue](https://github.com/fatelvx/axiom/issues) for bugs and concrete feature requests. See [CONTRIBUTING.md](CONTRIBUTING.md) before proposing `.axi` language changes.

## Roadmap

Near-term:

- A clearer architecture attention view.
- Better monorepo performance and resolver caching.
- Downstream project CI recipes.
- More TypeScript module resolution hardening.
- Drift and architecture health surfaces that start advisory, not as hard gates.
- Evolution graph views for visible architecture change over time.
- Baseline-aware drift refinement for CI comments and agent repair loops.
- Public comparison and evidence for how Axiom differs from ESLint architecture rules, Dependency Cruiser, Nx boundaries, and custom CI scripts.
- Symbol-level public API surface analysis as an advisory research area, not a v0 hard gate.

Later:

- Capability rules such as wall clock, network, filesystem, and random.
- AI context compiler as a derived output.
- Agent repair loop.

## License

Apache-2.0. See [LICENSE](LICENSE).
