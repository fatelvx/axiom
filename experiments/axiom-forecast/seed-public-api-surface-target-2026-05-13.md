# Targeted MiroFish Backtest Seed: Public API Surface Probe

Date: 2026-05-13

Status: targeted synthetic forecast seed, not real user research.

## Current Axiom Snapshot

Axiom is an architecture observability layer with explicit contracts for AI-era codebases.

The current product model is:

- `axi check`: hard gate for explicit, high-confidence `.axi` violations.
- `axi observe`: review/PR/agent attention surface for hard violations, visible intentional debt, advisory warnings, and drift.
- `axi infer`: onboarding aid that mirrors the current graph and suggests visibility rules as comments. It does not decide architecture intent for the user.
- `--spec <path>`: external pilot contracts so teams can scan a repo before writing `.axi` into it.

Axiom must not claim to be a complete architecture oracle. It should make architecture drift, accepted debt, and system entropy visible, and only enforce intent when the machine-checkable representation is reliable.

## Recent Product Change Under Test

`--warn-public-api-surface` now includes two advisory warnings:

- `broad_public_surface`: an exposed entry point uses broad `export *` / `export * as` barrels.
- `public_entrypoint_coupling`: an exposed entry point reaches at least four same-module internal files through imports or re-exports.

Both are advisory. They do not fail `axi check` by themselves.

Product rationale:

Teams and AI agents can produce directory-compliant code that still decays architecturally. For example, consumers can import only `index.ts`, but that public entry point can grow into a large accidental facade. Axiom cannot prove semantic API health, but it can surface visible facade pressure.

Important boundary:

Public API surface warnings require active `exposes` rules. Raw `axi infer` output usually leaves exposes suggestions as comments, so a zero public API warning count is expected unless a declared or probe contract is used.

## Pilot Evidence

Pilot reports:

- `experiments/real-project-smokes/results/public-api-pilot-2026-05-13.md`
- `experiments/real-project-smokes/results/zod-version-smoke-public-api-2026-05-13.md`

### nanoid probe

- Ref: `964d1e0`
- Source files: 18
- Imports: 56
- Unique observed edges: 1
- Hard violations: 0
- Intentional debt: 0
- Warnings: 1
- Public API warnings: 0
- Deep imports: 0
- Coupling: 0
- Warning code: `unused_suppression: 1`

Interpretation:

The nanoid probe did not produce public-surface noise. The `unused_suppression` warning is useful visible-debt cleanup feedback: if an accepted violation is no longer observed, the contract should eventually be cleaned.

### zod inferred workspace contract

- Ref: `v4.4.3`
- Source files: 406
- Imports: 1103
- Unique observed edges: 7
- Hard violations: 0
- Intentional debt: 0
- Warnings: 2
- Public API warnings: 0
- Deep imports: 1
- Coupling: 1
- Warning codes: `coupling_concentration: 1`, `deep_internal_import: 1`

Important interpretation:

`public_entrypoint_coupling` stayed quiet under the inferred zod contract because `axi infer` does not activate public entrypoint intent on the user's behalf. This is adoption-safe behavior, not a missing signal.

### zod public-surface probe contract

- Ref: `v4.4.3`
- Source files: 406
- Imports: 1103
- Hard violations: 0
- Intentional debt: 0
- Warnings: 21
- Public API warnings: 21
- Warning codes: `broad_public_surface: 19`, `public_entrypoint_coupling: 2`

Notable warning details:

- `packages/zod/src/v4/core/index.ts` reaches 15 same-module internal files.
- `packages/zod/src/v4/locales/index.ts` reaches 52 same-module internal files.

Interpretation:

This does not prove those facades are wrong. Locales may be an intentionally broad aggregation point. The question is whether surfacing this as "facade pressure" helps developers review public entrypoints before AI-assisted edits make the public surface harder to reason about.

## Backtest Question

Evaluate whether public-surface probe contracts should become part of Axiom's recommended pilot workflow, or remain an advanced calibration tool.

Please answer as a MiroFish-style synthetic risk map. Do not treat the pilot as proof of maintainer intent. Do not recommend hard-gating public API warnings by default.

## Stakeholders To Simulate

1. Senior TypeScript library maintainer.
2. Monorepo platform engineer.
3. AI coding workflow maintainer.
4. Skeptical Dependency Cruiser / ESLint user.
5. Small React/Pixi game developer using AI agents.
6. Open-source contributor reading the README for the first time.

## Questions To Answer

1. Will developers understand "public-surface probe" as an optional observability lens, or will they think Axiom is making an unfair architecture judgment?
2. Does `public_entrypoint_coupling` feel meaningfully different from generic fan-in/fan-out linting?
3. Is the zod `locales/index.ts` result more likely to be seen as useful visible facade pressure, or as an obvious false positive because locale aggregation is expected?
4. Should Axiom recommend public-surface probes in the pilot workflow, or keep them as an advanced pattern until more real-project evidence exists?
5. What exact wording should Axiom use to avoid overclaiming semantic API health?
6. What is the smallest next product/docs/engineering change that reduces misunderstanding without expanding `.axi` too much?

## Required Output Format

Use concise English. Return these sections:

1. Executive verdict.
2. Stakeholder reaction map.
3. Strongest adoption wedge.
4. Strongest rejection pattern.
5. Decision: recommended pilot workflow, advanced calibration only, or hold.
6. Suggested wording for public docs.
7. Next engineering/doc tasks, ordered.
8. What not to claim.
