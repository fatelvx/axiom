# Axiom Calibration Portfolio

This file keeps real-project smokes from becoming target-specific tuning.

The repeatable diff smoke harness now writes the same classification into each generated JSON and Markdown report. Prefer filling those fields at run time so the artifact carries its own implementation decision.

Each smoke should answer two questions before any implementation change:

1. What repository shape did Axiom just exercise?
2. Is the observed gap a general validator gap, a common ecosystem convention, a scan-scope choice, a project-specific config need, or an honest static-analysis blind spot?

## Gap Classes

- `general-resolver-scanner`: A reusable import discovery, resolution, ownership, or graph-building behavior that many repositories likely need.
- `common-ecosystem-convention`: A repeated ecosystem convention that deserves conservative built-in support after more than one calibration signal.
- `scan-scope`: The smoke question was too broad or narrow; solve with `include`, `exclude`, or a clearer pilot question.
- `project-config`: The repository needs explicit local config such as generated folders, source roots, or contract paths.
- `static-blind-spot`: Axiom can see a limitation but should not pretend to prove it, such as runtime plugin loading or semantic API health.
- `advisory-signal-calibration`: The hard graph is usable, but an advisory warning needs more evidence before becoming louder or more prominent.
- `quiet-control`: No meaningful gap appeared; keep the repository as a low-noise regression control.

## Current Portfolio Snapshot

| Repo / run | Shape | Main calibration signal | Gap class | Decision |
| --- | --- | --- | --- | --- |
| nanoid public-surface pilot | small TypeScript library | `hidden_reexport` can reveal public entry leaks, but accepted surface debt may need finer scope later | advisory-signal-calibration | Keep as visible violation/debt work; do not add hidden ignores |
| zod version and public API smokes | TypeScript library with broad public surfaces | broad barrels and public-entrypoint coupling are useful but easy to overread | advisory-signal-calibration | Keep public API surface warnings opt-in and advanced |
| zustand diff smoke | small quiet library control | quiet graph stayed quiet | quiet-control | Keep as a quiet control |
| Hono whole-repo and source-scoped smokes | framework/library with tests and benchmarks | whole-repo scope surfaced test/benchmark coupling; source scope changed the question | scan-scope | Treat scope as part of pilot design, not resolver code |
| ofetch / ky / Preact Signals batch | small libraries and multi-package source tree | flat libraries may need deeper grouping; Preact Signals surfaced a real package cycle | advisory-signal-calibration | Use as graph interpretation and inferred-name calibration |
| pnpm workspace smokes | large pnpm monorepo | package exports pointed at built `lib` files while source clone had `src` mirrors | general-resolver-scanner | Implemented conservative build-output source mirror resolution |
| Vite type-only package imports smoke | pnpm workspace with declaration aliases | `#types/*` and `#dep-types/*` point to `.d.ts` files for type-only imports | general-resolver-scanner | Implemented declaration resolution only for scanner-confirmed type-only imports |
| yargs production diff smoke | CLI parser library with TypeScript source and ESM/Deno shims | Deno platform shim imports clone-missing `build/lib/yerror.js` while `lib/yerror.ts` exists | common-ecosystem-convention candidate | Do not change code yet; track relative build-output source mirrors for repeated evidence |
| Vue core evidence artifact calibration | framework/compiler/runtime TypeScript workspace | inferred baseline plus graph baseline surfaced one precise minor-version edge drift and zero unresolved imports | quiet-control / advisory-signal-calibration | Do not change code; keep as artifact-loop evidence and continue portfolio coverage |
| Headless UI React calibration | UI component library package with public facade | inferred starter collapsed six source groups into one cycle; public-surface probe exposed broad barrel/facade pressure | advisory-signal-calibration | Do not change validator behavior; preserve infer cycle evidence in diff-smoke reports and keep public API probes explicit |
| Prettier source diff smoke | CLI formatter with language/plugin source packages | inferred baseline preserved seven collapsed-cycle stories, five large-file pressure notes, and two new minor-version edges into plugin surfaces | advisory-signal-calibration / scan-scope | Do not change validator behavior; keep deep-import warnings opt-in and use this as CLI-tool artifact calibration |
| Express / Fastify / ESLint / SvelteKit / UUID batch | framework libs, large tooling source, framework package source, and small mixed package surface | three quiet controls, one low-noise CJS framework advisory, and one larger tooling pressure case; source-tree tests/specs required explicit scope exclusions | quiet-control / advisory-signal-calibration / scan-scope | Do not change validator behavior; keep warnings opt-in, treat scope as pilot design, and retry package-manager workspace coverage with a short workdir |
| Private Python bot infer-scope calibration | Python app with root entry code, command/cog modules, and multiple `src/*` import roots | explicit include scope was silently narrowed by `axi infer` to `src/**`, hiding AppEntry/Cogs from the starter contract | general-resolver-scanner / scan-scope | Fixed infer source selection so explicit includes override the automatic `src/**` preference; keep Python runtime modelling out of scope |
| node-glob source-scoped diff smoke | small TypeScript Node package with dual CJS/ESM package surface | `src/**` runtime graph stayed quiet across `v13.0.0 -> v13.0.6`: 7 source files, 37 imports, 1 inferred module, 0 module-edge drift, 0 warnings | quiet-control / scan-scope | Record as mixed package-surface quiet control; do not add resolver behavior from one quiet source-scoped run |
| npm/cli workspaces diff smoke | npm workspaces package-manager monorepo with root CLI source and workspace package libs | `lib/**` plus `workspaces/*/lib/**` scanned 205 source files and 943 imports across `v11.14.0 -> v11.14.1`, inferred 13 modules, saw 48 observed dependency sites, 0 edge drift, and 2 coupling advisories | quiet-control / advisory-signal-calibration | Record as the first non-pnpm workspace calibration; do not change resolver, scanner, or dynamic behavior from this quiet patch-range result |
| Nitro source dynamic diff smoke | TypeScript server framework/build tool with runtime presets, CLI lazy commands, and dynamic-require helpers | `src/**` scanned 158 source files and 738 imports across `v2.9.6 -> v2.9.7`, inferred 2 modules with 1 collapsed cycle, saw 0 edge drift, and surfaced 4 focused `dynamic_dependency_expression` advisories with expression previews | static-blind-spot / advisory-signal-calibration | Keep dynamic warnings opt-in review evidence for runtime loading blind spots; do not change scanner, resolver, or gate behavior from this run |

## Missing Coverage

The current portfolio is still too infrastructure- and library-heavy. Before broad integration expansion, add no-install smokes for:

- framework app repo, such as a Next.js or Remix-style app
- additional CLI tool repo with command modules, preferably one that does not import clone-missing build output
- package with mixed CJS and ESM entry points beyond the node-glob source-scoped quiet control, preferably one where source imports package subpaths or generated dual outputs are part of the actual scan question
- generated-code-heavy repo where source scope matters
- additional non-pnpm workspace variants, such as Yarn workspaces or Lerna-style packages
- UI component library with barrel exports and design-system entry points beyond the first Headless UI React probe
- one more dynamic-heavy repo to compare against Nitro before making dynamic warnings more prominent in onboarding or release notes

## New Smoke Record Template

Use this template in each new report.

```markdown
## Calibration Classification

- Repo shape:
- Safety posture:
- Scope question:
- Axiom command surface:
- Main signal:
- Gap class:
- Decision:
- Code changed:
- Follow-up:
```

## Implementation Rule

Do not change resolver, scanner, or validation behavior just because one repository is noisy.

Built-in behavior should require a reusable explanation:

- The pattern appears in more than one real-world shape, or is a clear standard ecosystem pattern.
- The fix preserves hard/runtime correctness.
- The fix does not hide unresolved graph uncertainty.
- The result can be tested in fixtures and described without naming the target repository.

If those conditions are not met, document scope, config, or limitation instead.
