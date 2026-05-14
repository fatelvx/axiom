# Axiom

[![CI](https://github.com/fatelvx/axiom/actions/workflows/ci.yml/badge.svg)](https://github.com/fatelvx/axiom/actions/workflows/ci.yml)

![Axiom architecture observability banner](assets/banner.svg)

**Static architecture contracts for AI-era TypeScript and JavaScript codebases.**

Axiom compares the architecture you declared in `.axi` with the imports that actually exist in source code.

Use it to:

- fail CI on explicit boundary drift,
- review advisory architecture pressure before it becomes a rule,
- keep intentional debt visible,
- give agents the same evidence humans and CI see.

`Static Contract Loop` milestone: usable today for static TS/JS import graphs. Dynamic evidence, Python, VS Code, and contract sharing are post-static work.

[Quick Start](#quick-start) | [Example Contract](#example-contract) | [Commands](#commands) | [Integrations](#integrations) | [Limits](#limits) | [Guides](#guides)

## The Loop

| Input | Axiom Builds | Output |
| --- | --- | --- |
| `.axi` contract | Declared graph | What the architecture says should be allowed |
| TS/JS imports | Observed graph | What the code actually imports |
| Baseline + debt | Review context | Drift, advisory pressure, and accepted violations |

A hard gate is only one part of the loop:

```text
axi check   = CI gate for reviewed contracts
axi observe = review story, warnings, debt, drift
axi infer   = starter contract evidence, not architecture intent
axi diff    = advisory observed-edge drift against a graph baseline
```

## Why It Exists

AI agents and humans both guess architecture from nearby files. That works until a codebase changes faster than reviewers can keep the global shape in their heads.

Axiom turns rules like this:

```text
UI may depend on Services, but only through the public Services entry point.
Services internals must stay private.
Domain must not import UI.
```

into a machine-checkable contract with file, line, rule, and fix guidance.

It is not a prompt wrapper and not a style linter. It is an architecture observability layer with enforceable contracts where the intent is clear enough.

## Quick Start

From this repository:

```bash
npm install
npm run build
node dist/cli.js check --root examples/basic-app
```

The example intentionally fails:

```text
error unexposed_import src/ui/view.ts:2
  UI imports a non-exposed path from Services.

error hidden_import src/ui/view.ts:3
  UI imports hidden path from Services.
```

Try the review surface:

```bash
node dist/cli.js observe --root examples/basic-app
node dist/cli.js graph --root examples/basic-app --attention
```

Try the spec-first gate rehearsal:

```bash
node dist/cli.js check --root examples/spec-first-pilot
npm run spec-first:smoke
```

## Example Contract

Write `axiom/main.axi`:

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

That hard error is different from an advisory public-entry bypass. In a looser early contract that has module paths but not strict `hides` / `exposes` rules yet, `--warn-deep-internal-imports` can still point at imports that bypass a likely `index.*` entry point:

```ts
import { parseToken } from "../services"; // likely public entry point
import { parseToken } from "../services/internal/token"; // advisory deep_internal_import
```

The hidden internal import becomes an explicit contract violation when `hides` says `internal/**` is private. Without that strict contract, the same shape can still be a review signal: Axiom can see code reaching around a likely entry point, but it does not fail CI unless the team turns that intent into a clear contract.

## Static v0 Coverage

Axiom v0.5.8 is focused on static TypeScript and JavaScript architecture evidence, including Vue single-file component script imports.

| Area | Supported |
| --- | --- |
| Contract model | `module`, `path`, `depends on`, `forbids module`, `layers`, `exposes`, `hides`, `purpose` |
| Hard violations | dependency drift, layer breaches, hidden imports, hidden re-exports, ambiguous owners, broken specs |
| Advisory review | deep internal imports, public API surface pressure, coupling concentration, unresolved imports, large files |
| Scanner | TS/JS parser imports, Vue SFC `<script>` imports, `require`, literal dynamic imports, multiline imports, barrel `index.*` files |
| Resolver | relative paths, `.vue` components, tsconfig `paths`, package `imports`, workspace `exports` / `main`, pnpm workspaces |
| Adoption | loose mode, `--warn-unowned`, `--strict`, time-bounded intentional violations |
| Outputs | human, JSON, Markdown, Mermaid, review stories, `topSignals`, baseline drift |
| Agent surfaces | GitHub Actions examples, JSON consumer guide, read-only MCP server |

## How To Read A Graph

Start with three questions:

1. Are there hard violations, visible accepted debt, or advisory warnings?
2. Which module is the graph center by observed import pressure?
3. Does that shape match the architecture you expected?

`axi graph`, `axi observe`, and JSON summaries now include an interpretation layer for this first read. It can say, for example, that the scoped graph is quiet, that a module is becoming a fan-in hub, or that a contract is failing before the diagram should be treated as stable. The interpretation is intentionally conservative: it helps you navigate the graph, but the evidence still lives in the exact violation, warning, drift, and import-site lists.

When a scan is quiet, the next step is not "declare victory". Compare the graph center with the shape you expected, check whether huge files are hiding responsibilities inside one module, then save an unfiltered `axi graph --json` baseline if that shape is intentional.

For concrete examples of failing contracts, quiet graphs, advisory pressure, and React plus Pixi game clients, read [Read The Graph](guides/read-the-graph.md).

## Limits

Axiom v0 is intentionally honest about its blind spots:

- It does not fully observe runtime-only dependency paths such as string-based dependency injection, plugin registries, generated imports, or `eval`.
- It can optionally warn about static relative or package `#imports` that the scanner sees but cannot resolve with `--warn-unresolved-imports`, but it still cannot see non-literal runtime wiring.
- It does not prove that a module is semantically well-designed. Axiom can catch direct hidden-path re-exports and local import-then-export leaks from hidden internals, `--warn-public-api-surface` can flag broad `export *` barrels and exposed entry points that reach many internal files, and `--warn-deep-internal-imports` can flag relative imports that bypass likely entry points, but code can still become too coupled through wrappers, facades, or overly large public entry points. This is the `symbol-level API health` gap.
- It does not prove that concentrated fan-in or fan-out is wrong. `--warn-coupling-concentration` surfaces modules that may be turning into coordination hubs so humans and agents can review the pressure before it becomes hidden debt.
- It does not prove that a quiet import graph means the code is internally well-factored. `--warn-large-files` only surfaces large-file pressure as an advisory review prompt; it is not a general complexity metric or a refactor mandate.
- It does not replace ESLint, TypeScript, tests, or review. Axiom focuses on architecture intent: declared graph, observed graph, drift, warnings, intentional violations, and CI gates for clear contracts.
- It does not replace Dependency Cruiser, Nx boundaries, CodeQL, or custom repository scripts. See [Comparison And Boundaries](guides/comparison.md) for where Axiom is useful and where other tools are stronger.
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

## Commands

```bash
axi check --root <project>
axi observe --root <project>
axi graph --root <project>
axi diff <baseline-json> --root <project>
axi infer --root <project>
```

Use them like this:

- `axi check`: validate code against `.axi`; exits `1` on violations.
- `axi observe`: show the architecture attention surface; exits `0`, explains the declared-intent vs observed-import review model, and focuses violations, visible debt, and warnings.
- `axi graph`: inspect declared and observed graphs; exits `0` even with violations.
- `axi diff`: compare current observed module edges against a saved `axi graph --json` baseline; exits `0` and stays advisory.
- `axi graph --violations-only` or `axi graph --attention`: show failing edges, intentional violations, and warning guardrails.
- `axi graph --mermaid`: print a visual Mermaid flowchart of observed module dependencies with a built-in legend.
- `axi infer`: print a starter `.axi` draft from existing imports, plus a review checklist for turning the draft into intent.

Useful flags:

```bash
axi check --root . --json
axi observe --root .
axi observe --root . --markdown
axi graph --root . --mermaid
axi observe --root . --warn-public-api-surface
axi observe --root . --warn-unresolved-imports
axi observe --root . --warn-coupling-concentration
axi observe --root . --warn-deep-internal-imports
axi observe --root . --warn-large-files
axi check --root . --warn-unowned
axi check --root . --warn-public-api-surface
axi check --root . --warn-unresolved-imports
axi check --root . --warn-coupling-concentration
axi check --root . --warn-deep-internal-imports
axi check --root . --warn-large-files
axi check --root . --strict
axi observe --root ../some-app --spec ./contracts/some-app.axi --markdown
axi graph --root . --json
axi observe --root . --mermaid
axi graph --root . --json > axiom-baseline.json
axi diff axiom-baseline.json --root .
axi diff axiom-baseline.json --root . --markdown
axi observe --root . --baseline axiom-baseline.json
axi observe --root . --baseline axiom-baseline.json --markdown
axi infer --root . --group-depth 2
axi infer --root . --group-by workspace
```

## Integrations

| Surface | Status | Use it for |
| --- | --- | --- |
| GitHub Actions | Example workflow included | Keep `axi check` as the PR gate and attach `axi observe` as review context |
| JSON / Markdown | Stable v0 schemas | Feed CI annotations, PR summaries, dashboards, and agents |
| MCP | Read-only stdio preview | Let agents query roots, checks, graphs, diffs, inference, and temporary inferred review evidence |

Start with [GitHub Actions And PR Summaries](guides/github-actions.md), [JSON Consumers](guides/json-consumers.md), or [MCP Client Setup](guides/mcp-client-setup.md).

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

Inference prints a draft to stdout and does not write files. The output says up front that it mirrors the current dependency graph, not recommended architecture. It also includes a short inference review story, an authoring checklist, next commands, and evidence comments before each inferred `depends on` edge so reviewers can see which import sites created the edge. Treat it as a starting point: rename modules, add layers, tighten `depends on`, and add `exposes` or `hides` after review. When `axi infer` collapses cyclic candidate groups, it lists the included groups, a cycle path sample, and observed internal edges so the cycle is useful architecture feedback instead of just a strange generated name. If very large files appear, infer also prints advisory architecture pressure notes so a quiet folder graph does not hide responsibilities concentrated inside one file.

For a quick first-value loop, save a baseline and then use `axi diff` after a change:

```bash
axi graph --root . --spec axiom-starter.axi --json > axiom-baseline.json
axi diff axiom-baseline.json --root . --spec axiom-starter.axi
```

`axi diff` is not a gate. It shows added and removed observed module edges so drift is visible before the team decides which parts deserve enforcement.

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

For early pilots, you can keep the contract outside the scanned repository:

```bash
axi observe --root ../some-app --spec ./contracts/some-app.axi --markdown
axi check --root ../some-app --spec ./contracts/some-app.axi
```

`--spec` accepts a `.axi` file or a directory containing `.axi` files. Repeat it for multiple files. Source paths inside those contracts are still relative to `--root`, so this is useful when you want to scan a repo without adding `axiom/main.axi` yet.

For one-off pilots, inline source scope can keep the scan focused without writing config first:

```bash
axi observe --root ../some-app --spec ./contracts/some-app.axi \
  --include "src/**" \
  --exclude "src/**/*.test.ts,src/**/*.test.tsx,src/**/*.spec.ts,src/**/*.spec.tsx" \
  --warn-deep-internal-imports
```

`--include` and `--exclude` add source discovery patterns for that run. They support comma lists and repeated flags. Use `axiom.config.json` once the scope becomes stable enough to keep.

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
  "warnCouplingConcentration": false,
  "warnDeepInternalImports": false,
  "warnLargeFiles": false
}
```

Fields:

- `include`: source files to scan. If omitted, Axiom scans supported source files outside default ignored directories.
- `exclude`: source files or directories to skip in addition to default ignored directories.
- `specs`: `.axi` files to read. Defaults to root contracts plus common `apps/*` and `packages/*` contract locations.
- `tsconfig`: TypeScript config path used for `paths` alias resolution. Defaults to `tsconfig.json` when present.
- `intentionalViolationExpiryWarningDays`: warn when accepted intentional violations expire within this many days. Defaults to `30`.
- `warnUnresolvedImports`: opt into advisory warnings for owned files with static relative or package `#imports` that Axiom cannot resolve.
- `warnPublicApiSurface`: opt into advisory warnings for broad exposed barrels such as `export *`.
- `warnCouplingConcentration`: opt into advisory warnings for modules with high observed fan-in or fan-out.
- `warnDeepInternalImports`: opt into advisory warnings for relative cross-module imports that bypass likely entry points.
- `warnLargeFiles`: opt into advisory warnings for source files large enough that architecture pressure may be hidden inside one file.

Default discovery skips common dependency, build, cache, and temporary output folders:

```text
.cache
.benchmark_tmp
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

Use `at "<path-or-glob>"` before `until` when the debt should only apply to one import or exposed surface:

```axi
accepts hidden_reexport to Services at "src/services/index.ts" until 2027-06-30 because "legacy public barrel cleanup"
```

For import violations, `at` matches the importing file. For `hidden_reexport`, it matches the exposed file that leaked the hidden path. Same-code violations elsewhere still fail.

`axi observe` and `axi observe --markdown` show a dedicated visible debt ledger. That ledger is not limited to dependency edges, so accepted surface violations such as `hidden_reexport` still appear even when the focused observed graph has no edge to show.

Tune the warning window per project with `intentionalViolationExpiryWarningDays` in `axiom.config.json`, or for one command with `--intentional-violation-warning-days <n>`.

## Public API Surface Warnings

To inspect the `symbol-level API health` pressure point without turning it into a hard gate, advanced users can opt into public surface warnings:

```bash
axi check --root . --warn-public-api-surface
axi observe --root . --warn-public-api-surface
axi graph --root . --attention --warn-public-api-surface
```

Today this flags broad exposed barrels such as `export * from "./feature"` or `export * as feature from "./feature"`. It also flags exposed entry points that reach at least four same-module internal files, including named re-export facades such as `export { feature } from "./feature"`. It is advisory: the check still exits `0` unless there are real violations.

This is an advanced observability lens for projects that already have active `exposes` rules. A high count is not an API-quality verdict. Some entry points, such as locale or icon aggregators, are intentionally broad. Treat the warning as visible facade pressure: a prompt to review, document, or intentionally accept the shape, not a default onboarding gate.

Separate from that advisory warning, `hidden_reexport` is a hard, high-confidence violation when an exposed file leaks a hidden path directly, either with `export ... from "./internal"` or with `import ... from "./internal"` followed by `export { ... }`. Public wrappers around hidden implementation imports are still allowed; Axiom only flags the explicit hidden symbol leak.

## Unresolved Import Warnings

To inspect observed-graph blind spots without turning them into a hard gate, opt into unresolved import warnings:

```bash
axi observe --root . --warn-unresolved-imports
axi check --root . --warn-unresolved-imports
axi graph --root . --attention --warn-unresolved-imports
```

Today this flags static relative imports and package `#imports` from owned files when Axiom can see the import but cannot resolve it to a source or type declaration file. Declaration files are only considered for scanner-confirmed type-only imports and exports, so runtime imports to `.d.ts` files still remain unresolved. It is advisory: the check still exits `0` unless there are real violations. Treat it as a prompt to configure `tsconfig` or package imports, restore a missing file, or acknowledge that generated/runtime wiring is outside the observed graph.

## Coupling Concentration Warnings

To inspect architecture pressure without turning it into a hard gate, opt into coupling concentration warnings:

```bash
axi observe --root . --warn-coupling-concentration
axi check --root . --warn-coupling-concentration
axi graph --root . --attention --warn-coupling-concentration
```

Today this flags a module when the observed graph shows fan-in from at least four distinct modules or fan-out to at least four distinct modules. It is advisory: the check still exits `0` unless there are real violations. Treat it as a review prompt for modules that may be becoming coordination hubs, broad facades, or hidden dependency magnets.

## Deep Internal Import Warnings

To inspect likely public-entry bypasses before formalizing `exposes` rules, opt into deep internal import warnings:

```bash
axi observe --root . --warn-deep-internal-imports
axi check --root . --warn-deep-internal-imports
axi graph --root . --attention --warn-deep-internal-imports
```

Today this flags relative cross-module imports that target a non-`index.*` file when the target module has a likely `index.*` entry point. It is advisory: the check still exits `0` unless there are real violations. Treat it as a prompt to import through a public entry point, or to add explicit `exposes` / `hides` rules when a deep path is intentional.

When an inferred or broad module has multiple source groups, Axiom only recommends an `index.*` entry point from the same source group as the deep import. If the only entry point lives in another group, the warning is marked ambiguous instead of pretending that entry point is the public boundary for the whole collapsed module. That usually means the contract should split the module, declare a narrower public surface, or keep the warning as a review prompt until the team names the boundary.

## Large File Warnings

Some projects have very few files and a quiet import graph, but most architecture pressure lives inside huge files. To surface that review risk without making it a gate, opt into large-file warnings:

```bash
axi observe --root . --warn-large-files
axi check --root . --warn-large-files
axi graph --root . --attention --warn-large-files
```

Today this flags source files at 800 lines or more and reports basic file shape data such as imports, exports, functions, and classes. It is advisory: the check still exits `0` unless there are real violations. Treat it as a prompt to inspect responsibilities inside the file, not as proof that the file must be split immediately.

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

`axi graph --json` and `axi observe --json` emit `axiom.graph.v12`. Each observed dependency includes `violations` and `intentionalViolations` arrays. Graph JSON also includes `architectureSummary` so agents, dashboards, and future MCP adapters can read the review mode, status, top signals, suggested next actions, and a short interpretation layer without parsing Markdown. `architectureSummary.interpretation` gives a headline, quick-read notes, first things to inspect, and central modules by observed import pressure. `architectureSummary.reviewStory` adds a compact setup summary, top review pressures, and a next step so large warning sets read as an architecture review instead of a raw lint flood. It is guidance over the same static import graph, not a health score or semantic architecture proof. The top-level `intentionalDebt` ledger keeps accepted non-edge violations, such as hidden public-surface re-exports, visible to PR comments and agents. With `--violations-only`, `--attention`, or `observe`, `observedDependencies` remains a compatibility alias for the shown attention edges, while `allObservedDependencies[]` always carries the full observed graph and `shownObservedDependencies[]` carries the filtered view. `summary.observedDependencies` keeps the full count, `summary.shownObservedDependencies` keeps the shown count, warning guardrails are still shown with details, and the JSON `filters` object marks focused attention output.

Human, Markdown, and Mermaid output use the same distinction: focused views say `shown dependency edges` separately from `full observed dependencies`, so an attention view can show zero edges while still reporting advisory warnings. Warning counts only include advisory checks enabled for that command or config; use the same `--warn-*` flags when comparing `observe`, `graph`, Markdown, and Mermaid output.

If you are building a CI annotation, PR comment, dashboard, or agent integration on top of JSON output, follow [JSON Consumers](guides/json-consumers.md). In short: use `axi check --json` for hard gates, tolerate additive fields, and treat `intentionalDebt[]` as the authoritative accepted-debt ledger for graph / observe output.

For the recommended file and command convention that ties contracts, graph baselines, review stories, and visible debt together, read [Evidence Artifact Loop](guides/evidence-artifact.md).

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

Review output also states that Axiom does not auto-accept debt. Accepted debt must already be declared in `.axi` with an expiration date and reason, and expired or invalid intentional violations remain hard failures in `axi check`.

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

For a fuller PR workflow, use [GitHub Actions And PR Summaries](guides/github-actions.md). It shows how to keep `axi check --json` as the hard gate, convert hard violations into GitHub annotations, and append `axi observe --json` `architectureSummary` as review context without making advisory warnings or drift accidental blockers.

## Guides

- [Getting Started](guides/getting-started.md)
- [Adopting Axiom In A Real Project](guides/adoption.md)
- [Contract Recipes](guides/contract-recipes.md)
- [Pilot Workflow](guides/pilot-workflow.md)
- [Evidence Artifact Loop](guides/evidence-artifact.md)
- [Read The Graph](guides/read-the-graph.md)
- [10-Minute Pilot Card](guides/pilot-card.md)
- [Comparison And Boundaries](guides/comparison.md)
- [GitHub Actions And PR Summaries](guides/github-actions.md)
- [JSON Consumers](guides/json-consumers.md)
- [Agent And MCP Integration](guides/agent-loop.md)
- [MCP Client Setup](guides/mcp-client-setup.md)
- [MCP Conformance](guides/mcp-conformance.md)
- [MCP Preview](guides/mcp-preview.md)
- [Publishing The Public Alpha](guides/publishing-alpha.md)
- [Contributing](CONTRIBUTING.md)
- [Basic App Example](examples/basic-app)
- [Monorepo Workspace Example](examples/monorepo-workspace)
- [GitHub Actions Example](examples/github-actions)

## Violation Types

Axiom can currently report:

- `forbidden_dependency`
- `undeclared_dependency`
- `hidden_import`
- `hidden_reexport`
- `broad_public_surface`
- `public_entrypoint_coupling`
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
npm run mcp:smoke
npm run perf:smoke
npm run github-actions:smoke
npm run release:candidate:smoke
npm run alpha:check
npm run check:fixture
node dist/cli.js check --root examples/basic-app
```

## Community

Questions, contract-design discussions, and rough ideas are welcome. Use [GitHub Discussions](https://github.com/fatelvx/axiom/discussions) for open-ended design conversation when available, or [open an issue](https://github.com/fatelvx/axiom/issues) for bugs and concrete feature requests. See [CONTRIBUTING.md](CONTRIBUTING.md) before proposing `.axi` language changes.

## Roadmap

Current milestone:

- `v0.6.0` candidate: Static Contract Loop. The static TS/JS validator, review surfaces, GitHub Actions examples, and read-only MCP evidence loop should be packaged and dogfooded.

Next:

- Dynamic TS/JS evidence taxonomy: literal dynamic imports, detectable non-literal dynamic imports, runtime composition blind spots.
- More release-candidate testing from packaged tarballs and clean temp projects.
- More spec-first pilots on real repositories before stronger CI claims.
- VS Code authoring and drift navigation over the same CLI/JSON evidence.
- Contract templates, inheritance, and sharing only after the single-repo validator loop is trusted.

Later:

- Python scanner support after dynamic TS/JS evidence is classified.
- Capability rules such as wall clock, network, filesystem, and random.
- AI context compiler and repair loops as derived outputs, not replacements for validation.

## License

Apache-2.0. See [LICENSE](LICENSE).
