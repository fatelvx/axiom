# Targeted MiroFish Backtest Seed: Contract Recipes And Authoring Friction

Date: 2026-05-13

Status: targeted synthetic forecast seed, not real user research.

## Current Axiom Snapshot

Axiom is an architecture observability layer with explicit contracts for AI-era codebases.

The current product model is:

- `axi check`: hard gate for explicit, high-confidence `.axi` violations.
- `axi observe`: review/PR/agent attention surface for hard violations, visible intentional debt, advisory warnings, and drift.
- `axi graph`: inspection and presentation surface, including JSON, Markdown, and Mermaid graph output.
- `axi infer`: onboarding aid that mirrors the current graph and suggests a starter contract. It does not decide architecture intent for the user.
- `--spec <path>`: external pilot contracts so teams can scan a repository before writing `.axi` into it.

Axiom should not claim to be a complete architecture oracle. It should make architecture drift, accepted debt, and system entropy visible, and enforce only when the machine-checkable representation is reliable.

## Recent Product Change Under Test

Commit under test:

```text
d7898a9 Add contract authoring recipes
```

The change was made after a larger backtest reinforced that adoption friction is now one of the strongest product risks:

- Existing projects may not want to write or maintain `.axi` contracts before seeing value.
- `axi infer` helps, but a raw current-graph snapshot can still feel like analyzer output.
- Axiom must avoid a blanket `axi adopt` flow that automatically accepts first-run debt.
- The product needs to make `.axi` easier to author while preserving visible-debt discipline.

## Implemented Change

Added `guides/contract-recipes.md` and linked it from README, Getting Started, Adoption, and Pilot Workflow.

The guide provides reviewed starter shapes for:

- React or Vite app.
- React plus Pixi game client.
- TypeScript library package.
- pnpm or Turborepo monorepo.
- External pilot contract.

The guide explicitly says:

- Recipes are starter shapes, not universal architecture truth.
- Use `axi infer` to inspect the current graph, then compare it with the closest recipe.
- Run `axi observe` and `axi graph --mermaid` before promoting anything to `axi check`.
- Do not accept all first-run violations automatically.
- Do not model every folder on day one.
- Do not treat `axi infer` as recommended architecture.
- Do not make advisory warnings into CI failures unless the team intentionally promotes that policy.

Representative recipe loop:

```bash
axi infer --root . > contracts/current-graph.axi
axi observe --root . --spec contracts/app.axi --markdown
axi graph --root . --spec contracts/app.axi --mermaid
axi graph --root . --spec contracts/app.axi --json > axiom-baseline.json
```

Representative product loop:

```text
current graph -> reviewed intent -> observe drift -> visible accepted debt -> selective gates
```

## Verification

The implementation passed:

```text
npm run alpha:check
```

including:

- full test suite: 155 tests
- Axiom self-contract check
- GitHub Actions smoke
- npm pack dry run

The npm pack dry run confirmed that `guides/contract-recipes.md` is included in the package tarball.

## Backtest Question

Evaluate whether contract recipes meaningfully reduce `.axi` authoring friction and make Axiom more visibly different from a linter or generic dependency graph tool.

Please answer as a MiroFish-style synthetic risk map. Do not treat this as real user research. Do not recommend broad new enforcement semantics. Focus on adoption, comprehension, and whether this is enough to proceed toward a larger backtest or whether a smaller product hole remains.

## Stakeholders To Simulate

1. Senior TypeScript application engineer trying Axiom on a large AI-assisted app.
2. Monorepo platform engineer reviewing CI/pilot adoption.
3. AI agent workflow maintainer who wants agents to read architecture feedback.
4. Skeptical Dependency Cruiser / ESLint user.
5. Small React/Pixi game developer using AI agents.
6. Open-source contributor reading the README and trying `axi infer` first.
7. Staff engineer worried about long-term `.axi` maintenance cost.

## Questions To Answer

1. Do recipes reduce the empty-page problem enough to make a first pilot more likely?
2. Do recipes strengthen the distinction between `.axi` as declared architecture intent and a normal linter config?
3. Is the React plus Pixi game recipe a useful adoption wedge for AI-assisted game projects, or too niche?
4. Does this change reduce pressure for a dangerous blanket `axi adopt` auto-accept flow?
5. What misunderstanding or rejection pattern remains most likely?
6. Should Axiom now run a larger backtest, or do one more small implementation/doc refinement first?
7. What exact next step has the highest signal-to-noise ratio?

## Required Output Format

Use concise English. Return these sections:

1. Executive verdict.
2. Stakeholder reaction map.
3. Strongest adoption improvement.
4. Remaining rejection pattern.
5. Decision: proceed to larger backtest, run one more small refinement, or hold.
6. Recommended next step.
7. What not to overclaim.

