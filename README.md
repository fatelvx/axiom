# Axiom

[![CI](https://github.com/fatelvx/axiom/actions/workflows/ci.yml/badge.svg)](https://github.com/fatelvx/axiom/actions/workflows/ci.yml)

![Axiom architecture awareness banner](assets/banner.svg)

**Lightweight architecture awareness and enforceable contracts for AI-era codebases.**

Axiom reads `.axi` contracts, scans real TypeScript and JavaScript imports, and shows where the observed code graph drifts from declared architecture intent. It can fail CI for high-confidence boundaries, but its first job is to make architecture drift visible enough for humans and agents to act on.

> Axiom is part of an ongoing experiment to make architecture hallucinations in AI-generated code observable and enforceable. Read the technical note: [Architecture Hallucinations in LLM-Generated Code](https://gist.github.com/fatelvx/99fadeae8014a1ddc1e8b67727481ee5).

```text
.axi contract -> declared graph
source imports -> observed graph
Axiom compares both -> architecture violations with file, line, rule, and fix
```

Axiom is not a prompt wrapper and not a style linter. It is an architecture awareness layer with compiler-style checks: it turns boundaries that usually live in docs, reviews, and memory into visible graph feedback, warnings, intentional violations, and CI gates where the contract is clear enough.

Status: public alpha / developer preview. The validator is usable today, but the `.axi` language and JSON schemas may still evolve before a stable 1.0.

## Product Direction

Axiom is deliberately not starting as a fully automatic architecture guardian. That would be too rigid and too noisy for real codebases.

The near-term product is:

- architecture drift awareness
- dependency direction tracking
- module boundary warnings
- semantic ownership mapping through `.axi`
- intentional violations that stay visible instead of being hidden
- hard failures only for explicit, high-confidence contracts

This matters more in AI-era repositories because agents can change many files quickly. Axiom should let agents communicate with the architecture contract, while the tool mediates what is a hard violation, what is accepted debt, and what is advisory drift.

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
node dist/cli.js graph --root examples/basic-app --violations-only
node dist/cli.js graph --root examples/basic-app --attention
```

## What It Checks

Axiom v0.5.8 currently supports:

- Module ownership with `path`.
- Multiple source paths per module.
- Allowed dependencies with `depends on`.
- Forbidden module edges with `forbids module`.
- Layer direction with `layers Core -> UI`.
- Public/private module surfaces with `exposes` and `hides`.
- Direct hidden-path re-exports from exposed entry points.
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
- Starter contract inference with `axi infer`.
- Focused graph output with `axi graph --violations-only`.

## What It Does Not Prove

Axiom v0 is intentionally honest about its blind spots:

- It does not fully observe runtime-only dependency paths such as string-based dependency injection, plugin registries, generated imports, or `eval`.
- It does not prove that a module is semantically well-designed. Axiom can catch direct hidden-path re-exports, but code can still become too coupled through broad barrel exports or overly large public entry points.
- It does not replace ESLint, TypeScript, tests, or review. Axiom focuses on architecture intent: declared graph, observed graph, drift, warnings, intentional violations, and CI gates for clear contracts.
- It does not make `.axi` maintenance free. Use `axi infer` to start from the current graph, then tighten only the boundaries that matter.
- It does not promise whole-monorepo speed without scope control. Use `include`, `exclude`, and focused contract locations to keep large repositories comfortable in CI.

The product goal is not perfect automatic architecture governance. The goal is a shared, machine-checkable awareness layer where humans and agents can see drift early, accept temporary debt visibly, and enforce high-confidence boundaries.

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
axi graph --root <project>
axi infer --root <project>
```

Use them like this:

- `axi check`: validate code against `.axi`; exits `1` on violations.
- `axi graph`: inspect declared and observed graphs; exits `0` even with violations.
- `axi graph --violations-only` or `axi graph --attention`: show failing edges, intentional violations, and warning guardrails.
- `axi infer`: print a starter `.axi` draft from existing imports.

Useful flags:

```bash
axi check --root . --json
axi check --root . --warn-unowned
axi check --root . --strict
axi graph --root . --json
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
  "intentionalViolationExpiryWarningDays": 30
}
```

Fields:

- `include`: source files to scan. If omitted, Axiom scans supported source files outside default ignored directories.
- `exclude`: source files or directories to skip in addition to default ignored directories.
- `specs`: `.axi` files to read. Defaults to `axiom/**/*.axi` and `*.axi`.
- `tsconfig`: TypeScript config path used for `paths` alias resolution. Defaults to `tsconfig.json` when present.
- `intentionalViolationExpiryWarningDays`: warn when accepted intentional violations expire within this many days. Defaults to `30`.

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

Tune the warning window per project with `intentionalViolationExpiryWarningDays` in `axiom.config.json`, or for one command with `--intentional-violation-warning-days <n>`.

## JSON Output

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

`axi graph --json` emits `axiom.graph.v7`. Each observed dependency includes `violations` and `intentionalViolations` arrays. With `--violations-only` or `--attention`, `observedDependencies` is filtered to the edges that need attention or have accepted architecture debt, warning guardrails are still shown with details, and `summary.observedDependencies` keeps the full count. The JSON `filters` object marks whether the focused output came from the product-facing `--attention` alias.

## CI

This repository dogfoods Axiom in GitHub Actions:

```bash
npm ci
npm run ci
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
- [Basic App Example](examples/basic-app)
- [Monorepo Workspace Example](examples/monorepo-workspace)

## Violation Types

Axiom can currently report:

- `forbidden_dependency`
- `undeclared_dependency`
- `hidden_import`
- `hidden_reexport`
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
npm run alpha:check
npm run check:fixture
node dist/cli.js check --root examples/basic-app
```

## Roadmap

Near-term:

- A clearer architecture attention view.
- Better monorepo performance and resolver caching.
- Downstream project CI recipes.
- More TypeScript module resolution hardening.
- Drift scoring that starts advisory, not as a hard gate.

Later:

- Capability rules such as wall clock, network, filesystem, and random.
- AI context compiler as a derived output.
- Agent repair loop.

## License

Apache-2.0. See [LICENSE](LICENSE).
