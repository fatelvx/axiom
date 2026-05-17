# Changelog

## Unreleased

- Added observed import-kind evidence to check and graph JSON import sites, plus human, Markdown, and drift rendering for literal dynamic imports, `require`, re-exports, and type imports.
- Extended MCP conformance smoke and public conformance docs so fresh agents treat `import.kind` as descriptive observed evidence, not a warning, hard rule, or new `.axi` syntax.
- Scanned literal `module.require()` calls as CommonJS observed dependency evidence and reported non-literal `module.require()` calls through the existing dynamic dependency warning path.
- Added conservative Python `.py` source discovery and static import scanning for `import ...`, `from ... import ...`, explicit relative imports, and repo-local module/package resolution without executing Python or inspecting virtual environments.
- Added `pythonImportRoots` config for ordered, repo-local Python static import roots when the default root / `src` / `src/*` heuristic is ambiguous.

## 0.6.0-alpha.4 - Install Safety Docs

- Updated public install and CI examples to use the exact reviewed package version, `npm install --ignore-scripts`, and `npx --no-install` local-bin execution.
- Clarified that `--no-install` keeps `axi` / `axiom` commands bound to the installed scoped package instead of fetching a different command from the registry.
- No validator, scanner, MCP, or contract behavior changed in this release.

## 0.6.0-alpha.3 - Trust Loop Hardening

- Added opt-in `--warn-dynamic-imports` / `warnDynamicImports` advisory warnings for non-literal `import()` and `require()` expressions that static graphing cannot resolve into observed dependency edges.
- Dynamic dependency warnings now include a short expression preview in JSON, human, and Markdown output so reviewers can distinguish internal runtime wiring from external plugin lookups.
- Composition-root fan-out detection now counts type-only imports from likely entry files, keeping `AppEntry` review pressure labeled as composition-root context instead of generic coupling concentration.
- Extended `npm run spec-first:smoke` so the public spec-first example verifies the full `.axi + graph baseline + reviewStory + visible intentional debt` artifact loop before checking deliberate hard-gate drift.

## 0.6.0-alpha.1 - Static Contract Loop

- Linked the public architecture hallucination technical note from the README.
- Updated GitHub Actions dependencies to current major versions while keeping CI on Node 20.
- Added time-bounded `.axi` intentional violation rules with required expiration dates and reasons.
- Added unused intentional violation warnings so stale temporary debt remains visible after code cleanup.
- Added expiring intentional violation warnings 30 days before accepted debt reaches its deadline.
- Added project config and CLI controls for the intentional violation expiry warning window.
- Added `accepts ... until ... because ...` as the preferred `.axi` syntax for visible intentional violations.
- Added optional `at "<path-or-glob>"` scopes for `.axi` intentional violations so accepted debt can be limited to one import site or exposed surface.
- Added `axi infer` `reviewStory` output and bumped infer JSON to `axiom.infer.v8` so first-contract authoring surfaces can summarize setup, pressures, and next steps without treating inference as declared intent.
- Preserved `axi infer` `reviewStory` in real-project diff smoke `baselineInference` reports and bumped the report kind to `axiom.real-project-diff-smoke.v3`.
- Added `Calibration Classification` metadata to real-project diff smoke reports and bumped the report kind to `axiom.real-project-diff-smoke.v4`.
- Added a framework/tooling calibration batch covering Express, Fastify, ESLint, SvelteKit, and UUID without target installs or validator behavior changes.
- Added a targeted MiroFish backtest for the framework/tooling calibration batch, reinforcing a spec-first pilot before broad MCP or VS Code work.
- Refined composition-root advisory presentation so likely app entry fan-out appears as `composition_root_pressure` in human and Markdown review output while preserving `coupling_concentration` in structured validator warnings.
- Added a spec-first pilot example and `npm run spec-first:smoke` harness that proves a reviewed `.axi` contract passes cleanly and catches deliberate visibility and layer drift as hard `axi check` failures.
- Added a dependency-free read-only MCP preview contract with tool descriptors, JSON schemas, CLI invocation mapping, and structured-result wrapping for `axiom_check`, `axiom_observe`, `axiom_graph`, `axiom_diff`, and `axiom_infer_contract`.
- Added a minimal dependency-free `axi-mcp` / `axiom-mcp` stdio server with MCP lifecycle, `tools/list`, `tools/call`, allowed-root validation, and CLI execution timeouts.
- Added an MCP client setup guide for Codex registration, client reload behavior, root scoping, native-tool verification, and safe agent handoff prompts.
- Added an agent-readable MCP result `summary` that indexes gate status, counts, review story, drift counts, and tool-error hints while preserving the full CLI JSON payload.
- Added `structuredContent.summary.topSignals[]` to MCP architecture results so agents can start with compact evidence pointers for hard violations, warning roots, collapsed cycles, large files, drift, and dependency pressure while the full payload remains authoritative.
- Added Alpha Notes for the first Static Contract Loop milestone, including static-only limits and MiroFish-style synthetic backtest attribution.
- Added `npm run release:candidate:smoke` to pack the local tarball, inspect packaged contents and bin aliases, and run the packaged CLI against included examples, Vue SFC fixtures, monorepo paths, inference JSON, and the MCP entry point without publishing.
- Added Vue single-file component source discovery, resolver support, and `<script>` / `<script setup>` import scanning for static front-end architecture evidence.
- Added `axiom_roots` as a read-only MCP tool so agents can inspect configured allowed roots before choosing a scan root.
- Added `npm run mcp:smoke` to verify the local MCP stdio server, read-only tool listing, structured contract-failure evidence, and allowed-root rejection before client registration.
- Added `npm run mcp:agent-loop:smoke` to verify a temp-only MCP workflow across roots, clean check, graph baseline, deliberate drift, observe, diff, and infer evidence.
- Added an MCP conformance guide for blank-agent testing without internal project memory.
- Added `npm run mcp:conformance:smoke` to verify roots-first handling, gate versus advisory semantics, inference-as-authoring-evidence, and baseline non-mutation.
- Added `axiom_observe_inferred_contract`, a read-only MCP workflow that runs inference, observes with a server-managed temporary inferred spec, and returns both payloads without writing `.axi` into the target repository.
- Extended MCP stdio smoke and server tests to exercise all seven read-only tools through `tools/call`: `axiom_roots`, `axiom_check`, `axiom_observe`, `axiom_graph`, `axiom_diff`, `axiom_infer_contract`, and `axiom_observe_inferred_contract`.
- Extended MCP stdio smoke and server tests to cover invalid tool names, missing roots, malformed arguments, outside-root spec paths, and stable JSON-RPC error codes.
- Extended MCP stdio smoke and server tests to wrap CLI execution failures and timeouts as structured tool errors instead of transport failures.
- Included warning guardrails in focused graph output so `axi graph --violations-only` acts more like an architecture attention view.
- Added `axi graph --attention` as a product-facing alias for the focused architecture attention view.
- Added pnpm workspace package discovery for internal package export resolution.
- Added `hidden_reexport` to catch exposed entry points that directly re-export hidden module internals.
- Extended `hidden_reexport` to catch exposed import-then-export leaks from hidden module internals while allowing public wrappers around hidden implementation imports.
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
- Added `npm run github-actions:smoke` to verify the GitHub Actions PR integration example against the built CLI.
- Updated package metadata to match the architecture observability plus enforceable contracts positioning.
- Bumped check JSON to `axiom.check.v4` for intentional violation reporting and warning details.
- Added a real-project smoke report for nanoid and zod, and fixed workspace inference so package root files do not overlap package `src/**` modules.
- Added opt-in `--warn-deep-internal-imports` advisory warnings for relative cross-module imports that bypass likely `index.*` entry points.
- Added a real-project version smoke harness for comparing architecture pressure across repository tags.
- Added a real-project diff smoke harness for repeatable `axi infer` -> graph baseline -> `axi diff` calibration across two repository refs.
- Added `--spec <path>` for check, graph, and observe so external pilot contracts can scan a target repo without writing `.axi` files into it.
- Added a pilot workflow guide that separates code-health audits from Axiom boundary-drift scans and keeps early adoption observe-first.
- Added `axi diff` as a first-class advisory baseline-drift command over the existing graph model, with human, JSON, Markdown, and Mermaid output.
- Added contract recipes and updated onboarding docs so pilots can move from inferred starter contracts to graph baselines and `axi diff` before adopting CI gates.
- Made generated CLI artifacts round-trip through Windows PowerShell redirection: baseline graph JSON and external `.axi` specs can now be read when saved as UTF-16LE.
- Made `axiom.config.json` loading tolerate BOM-encoded config files.
- Added `.benchmark_tmp` to default ignored temporary output directories.
- Added `allObservedDependencies[]` and `shownObservedDependencies[]` to graph / observe JSON so attention-mode machine consumers can distinguish the full observed graph from the filtered view.
- Tightened deeper `axi infer` folder grouping so parent folders with direct files use non-overlapping `*` ownership when child folders become separate modules.
- Added `--include` and `--exclude` scope controls to the real-project diff smoke harness.
- Changed mixed long inferred cycle fallback names from concatenated `CycleGroup...` names to `MixedCycle`.
- Added clone-only real-project diff smoke artifacts for Zustand and Hono, including a source-scoped Hono run.
- Added a reusable Axiom logo and refreshed the README banner around the radar / declared-vs-observed visual system.
- Added `architectureSummary` to graph / observe / diff JSON and bumped graph JSON to `axiom.graph.v10` for agent, dashboard, and future MCP consumers.
- Added a GitHub Actions summary helper that renders `axi observe --json` `architectureSummary` into a job summary while keeping `axi check` as the only gate.
- Added `architectureSummary.interpretation` and bumped graph JSON to `axiom.graph.v11` so graph output can say what to inspect first, which modules are central, and why the result is advisory rather than a semantic health score.
- Refined quiet graph interpretation so passing scans still suggest comparing the graph center with intended architecture before saving a baseline.
- Added cycle path samples to collapsed-cycle inference output and bumped infer JSON to `axiom.infer.v5`.
- Added CLI `--include` and `--exclude` source-scope flags for check, graph, observe, diff, and infer.
- Added a read-the-graph guide and 10-minute pilot card so external users can interpret diagrams, quiet scans, advisory pressure, and first-run pilot results without treating Axiom like a generic linter.
- Clarified focused graph output by separating shown dependency edges from full observed dependencies in human, Markdown, and Mermaid summaries.
- Added warning-scope notes and warning clusters so advisory-heavy pilots surface likely root causes before listing individual files.
- Softened `deep_internal_import` entrypoint advice for broad or collapsed modules with multiple likely entry points instead of pretending one index file is authoritative.
- Refined `deep_internal_import` entrypoint confidence to use same-source-group entrypoints only, preventing broad collapsed modules from recommending an unrelated `index.*` file.
- Reworked warning clusters into likely warning roots for deep imports, including state/store leakage, tool boundary pressure, ambiguous public boundaries, and public-entry bypasses.
- Improved inferred collapsed-cycle names with repeated prefixes, so cycles such as `Signals` plus `SignalsDebug` no longer become `SignalsSignalsDebug`.
- Added `architectureSummary.reviewStory` and bumped graph JSON to `axiom.graph.v12` so graph / observe / diff output can summarize setup, top review pressures, and the next step for humans and future agent adapters.
- Added an Agent And MCP Integration guide covering read-only agent loops, baseline lifecycle, review-story consumption, and MCP v0 guardrails.
- Added an Evidence Artifact Loop guide that defines `.axi + baseline + reviewStory + intentionalDebt` as the portable adoption artifact for local runs, PRs, agents, and future IDE/MCP surfaces.
- Added a targeted MiroFish backtest artifact for the Evidence Artifact Loop, keeping MCP behind real-project calibration instead of letting ecosystem surfaces outrun validator trust.
- Added no-contract scan summaries and opt-in `--warn-large-files` advisory warnings so quiet import graphs do not hide intra-file responsibility pressure.
- Added advisory architecture pressure notes to `axi infer` and bumped infer JSON to `axiom.infer.v6`.
- Added cycle-breaking candidates to collapsed-cycle inference output and bumped infer JSON to `axiom.infer.v7`.
- Refined the logo and banner visual system so radar nodes no longer rely on off-center text inside circles.
- Simplified the logo into a cleaner abstract observability mark and restored the banner's radar-card layout with aligned review-story text.
- Hardened `pnpm-workspace.yaml` package discovery so workspace package resolution supports inline `packages: [...]` YAML sequences as well as block lists.
- Mapped workspace package `exports` / `main` targets from common build output directories such as `lib` and `dist` back to existing `src` mirrors, improving source-only monorepo graph completeness.
- Added no-install pnpm workspace smoke artifacts for Vite and pnpm itself.
- Resolved `.d.ts`, `.d.mts`, and `.d.cts` targets for scanner-confirmed type-only imports and exports, fixing Vite-style `#types/*` / `#dep-types/*` unresolved warnings without masking runtime imports to declaration files.
- Added a Vue core source-scoped evidence artifact calibration showing the `.axi + baseline + reviewStory + intentionalDebt` loop can make minor-version workspace drift reviewable without target installs or validator changes.
- Added a Headless UI React calibration and updated the evidence artifact guidance to preserve inferred collapsed-cycle evidence before saving a graph baseline.
- Added baseline inference summaries to real-project diff smoke reports so collapsed-cycle candidates and large-file pressure remain visible even when the saved graph baseline is quiet.

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
