# Changelog

## Unreleased

- Linked the public architecture hallucination technical note from the README.
- Updated GitHub Actions dependencies to current major versions while keeping CI on Node 20.
- Added planned `.axi` suppressions with required expiration dates and reasons.
- Added unused suppression warnings so stale temporary exceptions remain visible after code cleanup.
- Included warning guardrails in focused graph output so `axi graph --violations-only` acts more like an architecture attention view.
- Surfaced module `purpose` text in graph and check JSON output.
- Bumped check JSON to `axiom.check.v3` and graph JSON to `axiom.graph.v4` for suppressed violation reporting.

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

## 0.1.0 - Architecture Firewall MVP

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
