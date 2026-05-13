# Targeted MiroFish Backtest Seed: Tiered Evidence And Validator Landing

Date: 2026-05-14

Status: targeted synthetic forecast seed, not real user research.

## Context

Axiom is an architecture observability layer with enforceable contracts for AI-era codebases.

Core model:

- `.axi` declared architecture contract
- source scanner observed import graph
- validation compares declared intent vs observed imports
- hard violations fail `axi check`
- `axi observe`, `axi graph`, and `axi diff` provide advisory review surfaces
- `architectureSummary.reviewStory` helps humans and agents understand what to inspect first
- `intentionalDebt` keeps accepted architecture debt visible and time-bounded
- graph baselines make observed edge drift reviewable without turning drift into a hard gate

Current ecosystem target:

1. Make the single-repository validator very trustworthy.
2. Treat `.axi + baseline + reviewStory + intentionalDebt` as a portable evidence artifact bundle.
3. Use GitHub Actions for PR trust.
4. Use VS Code for authoring and drift navigation.
5. Use MCP for read-only agent queries over the same evidence.
6. Only later explore contract templates, inheritance, organization sharing, and cross-repository contract networks.

## Recent Validator Calibration Evidence

Recent no-install, clone-only real-project smokes:

- pnpm workspace smoke:
  - `pnpm-workspace.yaml` inline `packages: [...]` support was added after real workspace evidence.
  - workspace package `exports` / `main` targets under `lib` or `dist` now map back to existing `src` mirrors.
  - `pnpm/pnpm` source-scoped smoke changed from an empty observed graph to about 1,500 observed workspace import sites.

- Vite type-only declaration smoke:
  - Vite uses package `imports`: `#types/* -> ./types/*.d.ts` and `#dep-types/* -> ./src/types/*.d.ts`.
  - Axiom now resolves `.d.ts`, `.d.mts`, and `.d.cts` targets only when the scanner confirms the import is type-only.
  - Vite source-scoped smoke changed from 60 `unresolved_import` warnings to 0 warnings while keeping runtime imports to declaration-only targets unresolved.

These were treated as general TypeScript monorepo semantics, not Vite-specific or pnpm-specific product hacks.

## New Product Guardrail

Axiom should avoid target overfitting.

Real-project gaps should be classified before implementation:

- general resolver or scanner semantics
- common ecosystem convention that deserves conservative built-in support after repeated evidence
- scan-scope or pilot-question issue handled by `include` / `exclude`
- project-specific configuration that belongs in user config
- honest static-analysis blind spot that should stay visible as advisory uncertainty or limitation

Proposed future JSON / integration direction:

Axiom should move toward tiered evidence confidence:

- stable core facts: hard contract violations, declared graph, observed graph, exact import sites
- conservative resolver heuristics: source mirrors, declaration-only type targets, likely entrypoints
- configurable conventions: source scopes, generated folders, build-output/source mappings
- advisory signals: graph center, coupling concentration, large files, deep imports, unresolved imports
- explicit blind spots: runtime DI, plugin registries, non-literal loading, semantic correctness, full symbol-level API health

This should help GitHub Actions, VS Code, and MCP distinguish hard gates from heuristic or advisory evidence.

## Risk To Evaluate

The maintainer is worried that if Axiom keeps scanning new products, every repository will expose different gaps and the project may never truly become reliable.

The strategic question:

Can Axiom handle most real TypeScript/JavaScript repository shapes by combining stable core validation, conservative ecosystem heuristics, explicit configuration, advisory warnings, and visible blind spots?

Or will it remain an endless patchwork of repo-specific resolver behavior?

## Please Forecast

Answer as a MiroFish-style synthetic risk map. Do not treat this as real user research. Do not hallucinate features Axiom does not have. Do not recommend broad new enforcement semantics, semantic health scores, hidden suppressions, or auto-accepted debt.

Evaluate:

1. Does tiered evidence confidence make Axiom more credible, or does it add confusing abstraction before the first version lands?
2. Is the calibration portfolio discipline enough to prevent overfitting?
3. Which validator gaps are most likely to block a first real landing despite recent pnpm and Vite fixes?
4. What should be the next 2-4 concrete validator-first implementation steps before GitHub Actions / VS Code / MCP work expands?
5. What wording or product promise should Axiom avoid so users do not misunderstand heuristics as proof?
6. What would make a skeptical senior engineer say "this is now useful enough to try on a real PR"?

Output:

- Executive forecast
- Adoption-positive interpretation
- Skeptical interpretation
- Top product risks
- Recommended next validator work
- Things not to do yet
- Decision: proceed, pause, or change direction
