# Changelog

## Unreleased

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
