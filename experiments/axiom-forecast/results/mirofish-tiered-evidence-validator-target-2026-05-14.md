# MiroFish Targeted Backtest: Tiered Evidence And Validator Landing

Date: 2026-05-14

Seed: `experiments/axiom-forecast/seed-tiered-evidence-validator-target-2026-05-14.md`

Method: direct MiroFish `LLMClient` targeted synthetic backtest using the local MiroFish model configuration. This was not a full OASIS social simulation and is not real user research.

## Executive Forecast

Axiom's core declared-graph versus observed-import validation model remains sound, but first-version trust depends on how carefully the product separates hard validation facts from uncertainty. The tiered evidence idea is useful as an internal guardrail, but shipping visible confidence tiers or public JSON fields too early would add abstraction before `axi check` is trusted enough.

The recent pnpm and Vite fixes are positive evidence because they were treated as general TypeScript monorepo semantics, not repository-specific hacks. The forecast is cautiously positive if the next work stays focused on validator hardening and a broader calibration portfolio instead of expanding GitHub Actions, VS Code, or MCP surfaces immediately.

## Adoption-Positive Interpretation

- The pnpm workspace and Vite type-only declaration fixes show that real-project gaps can be classified and repaired as reusable resolver semantics.
- Tiered evidence can make Axiom more credible internally because it forces a distinction between hard facts, conservative heuristics, configurable conventions, advisory signals, and blind spots.
- Calibration portfolio discipline directly addresses the maintainer worry that every new repository could turn into a one-off patch.
- Keeping integration surfaces thin until the validator is trusted protects the product from becoming a dashboard over uncertain data.

## Skeptical Interpretation

- Tiered confidence is sophisticated but easy to over-ship. Users need to trust the pass/fail contract before they care about nuanced evidence categories.
- pnpm and Vite are not enough portfolio coverage. They are strong infrastructure examples, but they do not prove comfort on app repos, mixed CJS/ESM projects, generated-code-heavy repos, or framework-heavy products.
- The endless-patching risk is real. Without a mandatory gap classifier, resolver work can drift into chasing every target repository's local conventions.
- Static import analysis still has honest blind spots: runtime dependency injection, non-literal dynamic imports, plugin registries, loaders, and semantic API health.

## Top Product Risks

1. Resolver brittleness across diverse monorepo and package-manager shapes.
2. Users overreading import graph validation as proof of runtime or semantic architecture health.
3. Premature public tiered evidence, confidence scores, or trust dashboards weakening the hard-gate story.
4. Configuration tax appearing before a skeptical user sees concrete value from `axi check`.

## Recommended Next Validator Work

1. Expand the calibration portfolio beyond pnpm and Vite with distinct shapes: app repo, UI library, CLI tool, mixed CJS/ESM package, generated-code-heavy repo, and another workspace monorepo.
2. Require every new real-project gap to be classified before implementation: general resolver/scanner semantics, common ecosystem convention, scan-scope issue, project-specific config, or static-analysis blind spot.
3. Harden only repeated, conservative resolver semantics. Do not add built-in behavior merely because one target repo is noisy.
4. Keep `axi check` output focused on hard violations. Put advisory and heuristic interpretation in `axi observe`, `axi graph`, `axi diff`, and review-story surfaces.
5. Use baseline workflows as advisory review evidence through existing `axi diff` and `axi observe --baseline`; do not turn baseline drift into a new hard gate by default.

## Things Not To Do Yet

- Do not expand GitHub Actions, VS Code, or MCP beyond thin wrappers until the validator has more diverse calibration evidence.
- Do not market tiered evidence as proof, certification, or semantic correctness.
- Do not add hidden automatic debt acceptance.
- Do not ship public confidence scores, health scores, or a rich tiered-evidence dashboard before the hard-gate path is trusted.
- Do not make `axi check` fail on advisory baseline drift unless a future explicit contract semantics justifies that separately.

## Axiom Response

Adopt the concept, not the premature surface.

Tiered evidence should guide internal design and docs now:

- hard facts: declared graph, observed graph, exact import sites, hard violations
- conservative heuristics: source mirrors, type-only declaration targets, likely entrypoints
- configurable conventions: source scope, generated folders, workspace/build-output mappings
- advisory signals: graph center, coupling concentration, deep imports, unresolved imports, large files
- blind spots: runtime-only wiring, plugin registries, non-literal loading, semantic API health

Do not add public `confidence` fields or user-facing evidence scores yet. Do not add `axi check --baseline` as a hard failure mode now. The existing model stays: `axi check` is the gate; `axi observe`, `axi graph`, and `axi diff` are review and navigation surfaces.

## Decision

Proceed with validator hardening. Pause broad integration expansion while building a calibration portfolio and making hard violations boringly trustworthy across more repository shapes.
