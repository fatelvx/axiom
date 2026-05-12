# Changelog

## Unreleased

- Linked the public architecture hallucination technical note from the README.
- Updated GitHub Actions dependencies to current major versions while keeping CI on Node 20.
- Added time-bounded `.axi` intentional violation rules with required expiration dates and reasons.
- Added unused intentional violation warnings so stale temporary debt remains visible after code cleanup.
- Added expiring intentional violation warnings 30 days before accepted debt reaches its deadline.
- Added project config and CLI controls for the intentional violation expiry warning window.
- Added `accepts ... until ... because ...` as the preferred `.axi` syntax for visible intentional violations.
- Included warning guardrails in focused graph output so `axi graph --violations-only` acts more like an architecture attention view.
- Added `axi graph --attention` as a product-facing alias for the focused architecture attention view.
- Added pnpm workspace package discovery for internal package export resolution.
- Added `hidden_reexport` to catch exposed entry points that directly re-export hidden module internals.
- Bumped graph JSON to `axiom.graph.v7` so `--attention --json` records the attention filter explicitly.
- Surfaced module `purpose` text in graph and check JSON output.
- Reframed accepted dependency debt as intentional violations in human and JSON output.
- Added public limitations guidance for static-analysis blind spots, escape hatches, and compliant-but-unhealthy module surfaces.
- Updated README positioning and banner language toward architecture awareness plus high-confidence contracts.
- Added a sanitized MiroFish live-forecast result and Chinese generated-output/process excerpt.
- Aligned public docs around the forecast-tested guardrail position: visible accepted debt, honest static-analysis limits, and `symbol-level API health` as a named gap.
- Added opt-in `--warn-public-api-surface` advisory warnings for broad exposed barrels such as `export *`.
- Documented the forecast discipline: use MiroFish-style runs as risk maps and backtests, not as direct product scripts.
- Added `axi observe` as a product-facing architecture attention command for violations, visible debt, and advisory warnings.
- Reframed the public product language around architecture observability with enforceable contracts.
- Added opt-in `--warn-coupling-concentration` advisory warnings for high observed module fan-in or fan-out.
- Explained coupling concentration warnings in focused graph and observe output with observed trigger, thresholds, and involved modules.
- Added `--baseline <graph-json>` for graph and observe output so current observed module edges can be compared with an unfiltered graph snapshot as advisory drift.
- Bumped graph JSON to `axiom.graph.v8` for optional baseline drift output.
- Added `--markdown` for graph and observe output so PRs and agent repair loops can review hard violations, visible debt, warnings, and drift in one summary.
- Added a repeatable synthetic `npm run perf:smoke` harness and recorded initial scan-cost evidence for 2k-file and 10k-file generated workspaces.
- Memoized ownership matching in the validator, reducing the local 10k-file synthetic smoke check from 78.7s to 10.0s in the same harness.
- Added opt-in `--warn-unresolved-imports` advisory warnings for static relative or package `#imports` that Axiom can see but cannot resolve into the observed graph.
- Added a Linux performance smoke GitHub Actions workflow, first-run next-step links, contract robustness guidance, a legacy `export *` migration playbook, and a contribution guide.
- Added a top-level graph JSON `intentionalDebt` ledger and human/Markdown observe output for accepted non-edge surface violations such as `hidden_reexport`.
- Clarified Markdown review notes so agents do not misread visible debt as auto-accepted or expired debt as advisory.
- Added a JSON consumer guide for CI annotation, PR comment, dashboard, and agent integrations.
- Added a comparison and boundaries guide covering ESLint architecture rules, Dependency Cruiser, Nx boundaries, CodeQL, and custom scripts.
- Added a targeted comparison backtest artifact for the "just Dependency Cruiser / ESLint" positioning risk.
- Added a GitHub Actions guide and example workflow that split hard `axi check` gates from `axi observe --markdown` review summaries.
- Added test coverage for the GitHub Actions annotation helper, including PowerShell UTF-16LE redirected JSON.
- Updated package metadata to match the architecture observability plus enforceable contracts positioning.
- Bumped check JSON to `axiom.check.v4` for intentional violation reporting and warning details.

## 0.5.8 - Monorepo Spec Discovery

- Added default `.axi` discovery for common `apps/*` and `packages/*` monorepo contract locations.
- Added a runnable `examples/monorepo-workspace` project that demonstrates package-level contracts and workspace package export resolution.
- Documented monorepo, pnpm workspace, and Turborepo adoption paths.

## 0.5.7 - Public Alpha Packaging

- Renamed the npm package target to `@fatelvx/axiom` because the unscoped `axiom` package name is already taken.
- Removed the private package guard and added npm publish metadata, package files, Node engine metadata, and public scoped publish config.
- Added both `axi` and `axiom` CLI bin entries for installed package usage.
- Added `npm run pack:dry-run` and `npm run alpha:check` for release readiness checks.
- Reworked the README to make the project easier to understand and try from the GitHub landing page.
- Added public getting-started and adoption guides.
- Added an intentionally failing `examples/basic-app` project that demonstrates visibility violations and focused graph output.

## 0.5.6 - Focused Graph Diagnostics

- Added `axi graph --violations-only` to show only observed dependency edges that currently have violations.
- Added violation annotations to graph JSON observed dependency entries and bumped graph JSON to `axiom.graph.v3`.
- Added a fix suggestion for `forbidden_dependency` diagnostics.

## 0.5.5 - Cross-Platform Test Runner

- Replaced the quoted test glob with a small Node test runner script.
- Fixed GitHub Actions on Linux where Node 20 treated `dist/**/*.test.js` as a literal path.

## 0.5.4 - CI Architecture Gate

- Added a GitHub Actions workflow that runs the test suite and Axiom self-contract check.
- Added `npm run ci` as the shared local and CI validation command.
- Documented the repository's CI gate in the README.

## 0.5.3 - Workspace Inference Grouping

- Added `axi infer --group-by workspace` for package-aware starter contracts.
- Reused workspace package metadata from the resolver so inference grouping stays aligned with observed graph resolution.
- Added CLI and inference tests for workspace grouping.

## 0.5.2 - Package Export Resolution

- Added resolver support for package `imports` aliases such as `#internal/*`.
- Added resolver support for root and workspace package `exports` subpaths.
- Added a fixture proving workspace package exports create real observed module edges.

## 0.5.1 - Self Contract

- Added an Axiom contract for Axiom's own production source boundaries.
- Added `npm run axiom:self` to build and run `axi check --strict` against the repository.
- Added root project config for self-check source and spec discovery.
- Resolved TypeScript source files from emitted ESM specifiers such as `./module.js` -> `module.ts`.

## 0.5.0 - Inference Group Depth

- Added `axi infer --group-depth <n>` for more detailed starter contracts.
- Kept default inference grouping at one source directory for low-noise onboarding.
- Added CLI and inference tests for deeper grouping.

## 0.4.1 - Discovery Traversal Pruning

- Added conservative source traversal pruning from static `include` prefixes.
- Kept directory-shaped `exclude` patterns as traversal pruning rules.
- Added tests for wildcard include pruning across nested project layouts.

## 0.4.0 - Infer Visibility Suggestions

- Added commented `exposes` suggestions for inferred module `index.*` entry points.
- Added commented `hides` suggestions for inferred `internal` and `private` folders.
- Added `suggestedExposes` and `suggestedHides` to `axi infer --json` and bumped infer JSON to `axiom.infer.v2`.

## 0.3.1 - Generic Discovery Defaults

- Narrowed built-in ignored directories to common dependency, build, cache, and temporary output folders.
- Kept project-specific generated or runtime folders out of public defaults; use `axiom.config.json` `exclude` for those.

## 0.3.0 - Adoption Modes

- Added `--warn-unowned` and `--strict` adoption modes for unowned source files.
- Added `unowned_source_file` diagnostics.
- Added `warnings` to check and graph JSON output and bumped those schemas to `axiom.check.v2` and `axiom.graph.v2`.

## 0.2.1 - License and Scanner Hardening

- Added Apache-2.0 licensing with package metadata.
- Replaced the line-based import scanner with TypeScript parser-based import discovery.
- Added scanner coverage for multiline imports, side-effect imports, TypeScript `import type`, `import = require`, template-literal dynamic imports, and multiline `require` calls.
- Moved `typescript` to runtime dependencies because the scanner now uses the TypeScript parser at runtime.
- Kept public default ignores generic; project-specific runtime folders should be excluded through project config.

## 0.2.0 - Onboarding and Resolver Hardening

- Added a stable `axiom.check.v1` JSON envelope for `axi check --json`.
- Normalized JSON paths relative to the checked project root.
- Added JSON schema-shape tests for successful and failing checks.
- Documented the JSON output contract in the README.
- Expanded default discovery ignores for generated, cache, build, dependency, and local runtime folders so real projects scan quickly.
- Added `depends on` syntax sugar.
- Added `exposes` and `hides` visibility rules with `unexposed_import` and `hidden_import` diagnostics.
- Added tests for dynamic imports and barrel index import resolution.
- Added `axi graph` and `axi graph --json` for declared, forbidden, visibility, and observed graph inspection.
- Added `axi infer` and `axi infer --json` for starter `.axi` contract generation from current source imports.
- Inference groups source folders into candidate modules and collapses cyclic candidate groups into one starter module so drafts can mirror existing code.
- Added `axiom.config.json` support with source `include`, source `exclude`, and `.axi` `specs` discovery patterns.
- Added `--config <path>` support for `check`, `graph`, and `infer`.
- Added TypeScript `paths` alias resolution from `tsconfig.json` or a configured `tsconfig` path, honoring `baseUrl`.
- Clarified that source `exclude` does not control `.axi` spec discovery; use `specs` for spec discovery.

## 0.1.0 - Architecture Validator MVP

Initial GitHub-ready cut.

Implemented:

- `.axi` parser.
- `axi check` CLI.
- TypeScript/JavaScript relative import scanner.
- Module path ownership.
- Declared graph vs observed graph validation.
- Forbidden dependency checks.
- Undeclared dependency checks.
- Dependency cycle checks.
- Layer order syntax with `layers Core -> UI`.
- Layer breach checks.
- Ambiguous module owner checks.
- Spec validation for missing paths, duplicate modules, unknown modules, unknown layers, and duplicate layer order.
- Human-readable diagnostics with file/line, observed edge, violated rule, and fix suggestions.
- JSON output for CI and agents.
- Fixture projects and test coverage.
