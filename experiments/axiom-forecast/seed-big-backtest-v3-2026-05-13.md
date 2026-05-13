# MiroFish Big Backtest V3 Seed: Axiom Post Recipes And Pilot Evidence

Date: 2026-05-13

Status: larger synthetic forecast seed, not real user research.

## Current Axiom Snapshot

Axiom is an architecture observability layer with explicit contracts for AI-era codebases.

It is not a prompt wrapper, not a style linter, and not a complete architecture oracle.

The current product loop is:

```text
current graph -> reviewed intent -> observe drift -> visible accepted debt -> selective gates
```

The CLI surface is:

- `axi check`: hard gate for explicit, high-confidence `.axi` violations.
- `axi observe`: advisory architecture attention surface for hard violations, visible intentional debt, warnings, and drift.
- `axi graph`: full inspection and presentation surface, including JSON, Markdown, and Mermaid.
- `axi infer`: starter contract generator that mirrors the current graph. It is not recommended architecture.

The adoption posture is:

- Start with `axi infer` and/or a contract recipe.
- Keep early contracts external with `--spec <path>`.
- Use `axi observe` and `axi graph --mermaid` before `axi check`.
- Save unfiltered `axi graph --json` baselines and review future edge drift.
- Add intentional violations manually with expiration dates and reasons.
- Promote only reviewed, low-noise facts into CI gates.

## Implemented Product Surface

### Explicit architecture contracts

`.axi` supports:

- `module`
- `path`
- `layers`
- `layer`
- `depends on`
- `forbids module`
- `exposes`
- `hides`
- `purpose`
- `accepts ... until ... because ...`

Accepted debt is visible intentional debt, not a hidden allowlist.

### Validation and advisory signals

Hard violations include:

- `undeclared_dependency`
- `forbidden_dependency`
- `layer_breach`
- `hidden_import`
- `hidden_reexport`
- `unexposed_import`
- `cycle_dependency`
- invalid or expired intentional violations
- ambiguous or invalid module ownership

Advisory signals include:

- `unresolved_import`
- `deep_internal_import`
- `coupling_concentration`
- `broad_public_surface`
- `public_entrypoint_coupling`
- baseline observed edge drift
- expiring or unused intentional violations

Public API surface warnings are advanced-only because they are useful but easy to overinterpret.

### Observability artifacts

Axiom now emits:

- human diagnostics with an explicit review model in `observe` and focused graph output,
- JSON envelopes for integrations,
- Markdown review summaries for PRs and agent loops,
- Mermaid graph output with a visible legend and filtered-view marker,
- graph baselines for drift-over-time review,
- top-level intentional debt ledgers so accepted non-edge surface debt stays visible.

### Authoring and pilot support

Recent adoption-friction work includes:

- `no_spec_files` now tells users to run `axi infer` or pass external `--spec`.
- `axi infer` has a starter-contract notice, authoring checklist, next commands, and readable collapsed-cycle output.
- `guides/contract-recipes.md` provides starter shapes for React/Vite apps, React plus Pixi game clients, TypeScript libraries, pnpm/Turborepo monorepos, and external pilot contracts.
- recipes now include gate-readiness and maintenance-rhythm guidance.
- adoption docs explicitly reject blanket auto-accepted first-run debt.
- pilot docs distinguish code-health audits from boundary-drift scans.

### Evidence collected so far

Real and synthetic evidence:

- local synthetic performance smoke improved from about 78.7 seconds to about 10.0 seconds on a 10,000-file generated workspace after ownership lookup memoization,
- GitHub Actions smoke example proves `axi check --json` can annotate hard violations while `axi observe --markdown` stays review context,
- real-project smoke on nanoid found useful visible `hidden_reexport` debt,
- real-project smoke on zod found deep internal import and public-entrypoint pressure signals, with caveats,
- zod version smoke showed source/import/edge pressure changes across v3 and v4 tags,
- Lumina-style external scan feedback confirmed external `--spec`, observe-first pilots, deep internal imports, and cycle-group readability are valuable,
- prior MiroFish backtests repeatedly warned about adoption friction, linter perception, scan performance, static blind spots, and `symbol-level API health`.

## Known Honest Limits

Axiom v0 does not prove full semantic architecture health.

Blind spots:

- non-literal dependency injection strings,
- runtime plugin loading,
- generated imports outside static source,
- `eval`,
- semantic wrappers around hidden internals,
- broad public APIs that are syntactically legal but conceptually unhealthy,
- TypeScript declaration-only public API exposure,
- full TypeScript or Node module resolution.

`symbol-level API health` remains a named future frontier.

## Recent Commit Under Test

Latest commits under test:

```text
d7898a9 Add contract authoring recipes
5bdd5b7 Record contract recipes target pilot
```

The contract-recipes target pilot concluded:

- recipes reduce the empty-page problem,
- React plus Pixi game clients are a promising AI-assisted adoption wedge,
- recipes do not by themselves defeat the "another config file" objection,
- long-term `.axi` maintenance remains a risk,
- a hallucinated suggestion involving nonexistent `enforce` sections was rejected,
- valid follow-up was added as docs: gate-readiness, contract maintenance rhythm, and pilot contract ownership.

## Backtest Question

Evaluate whether Axiom's current combined product surface is ready for broader pilot outreach or whether one more local product hole should be closed first.

Focus especially on:

- Does Axiom now feel meaningfully different from ESLint architecture rules or Dependency Cruiser?
- Is the adoption path credible for real projects that do not want to write contracts before seeing value?
- Do recipes plus `axi infer` reduce authoring friction without weakening visible-debt discipline?
- Does Mermaid plus baseline drift make "architecture observability" tangible enough?
- Does the product honestly handle static-analysis blind spots and symbol-level API health limits?
- Is the React/Pixi AI-assisted game wedge worth treating as an early user segment?
- What would make a staff engineer or platform engineer trust the tool enough for a pilot?

## Stakeholders To Simulate

1. Senior TypeScript application engineer maintaining an AI-assisted SaaS app.
2. Monorepo platform engineer responsible for CI speed and tool maintenance.
3. Staff engineer worried about architecture decay under AI coding agents.
4. Dependency Cruiser power user skeptical of new dependency tools.
5. AI agent workflow maintainer building repair-loop infrastructure.
6. React/Pixi game developer using AI heavily.
7. Open-source maintainer evaluating whether to accept a new config file.
8. Security-minded engineer checking local execution, supply-chain risk, and secret exposure.
9. Product-minded developer-tool founder evaluating category clarity.
10. New contributor trying Axiom from README only.

## Required Output Format

Use concise English. Return these sections:

1. Executive verdict.
2. Stakeholder reaction map.
3. What is now working.
4. Strongest remaining rejection pattern.
5. Category clarity: does "architecture observability layer" land?
6. Adoption path: what still blocks a first pilot?
7. Technical credibility: what still blocks trust?
8. Decision: broader pilot outreach, one more local refinement, or hold.
9. Recommended next step.
10. What not to overclaim.

Do not recommend broad new enforcement semantics.
Do not recommend hidden ignores or blanket auto-acceptance.
If you propose a feature, it must fit Axiom's current grammar and visible-debt model.
