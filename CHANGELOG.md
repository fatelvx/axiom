# Changelog

## Unreleased

- Added a stable `axiom.check.v1` JSON envelope for `axi check --json`.
- Normalized JSON paths relative to the checked project root.
- Added JSON schema-shape tests for successful and failing checks.
- Documented the JSON output contract in the README.
- Expanded default discovery ignores for generated, cache, build, dependency, and local runtime folders so real projects scan quickly.
- Added `depends on` syntax sugar.
- Added `exposes` and `hides` visibility rules with `unexposed_import` and `hidden_import` diagnostics.
- Added tests for dynamic imports and barrel index import resolution.

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
