# MiroFish Targeted Backtest: Framework/Tooling Calibration Batch

Created: `2026-05-14T08:31:32.7107845Z`

Seed: `experiments/axiom-forecast/seed-framework-tooling-calibration-target-2026-05-14.md`

Method: direct MiroFish `LLMClient` targeted synthetic backtest using the local MiroFish model configuration. This was not a full OASIS social simulation and is not real user research. No target repository installs, `npx`, dependency refreshes, target builds, target tests, or target scripts were run.

Note: the generated forecast treated "no maintainer-authored/human-reviewed `.axi` contract" too broadly as "no `.axi` spec was used." The retained interpretation below corrects that nuance: the diff-smoke harness did use a temporary inferred external `.axi` baseline, but the batch still did not prove real spec authoring or maintainer-declared intent.

## Executive Forecast

MiroFish scored this checkpoint at **4/10 credibility for a first alpha validator and ecosystem path**.

That score is intentionally harsh. The calibration batch meaningfully de-risks clone-only source scanning across multiple JS/TS repository shapes, advisory signal discipline, scan-scope handling, and safe execution during an npm supply-chain risk period. It also reinforces that the calibration portfolio can block target-specific validator changes.

The batch does **not** prove the most important adoption claim yet: that a human-reviewed `.axi` contract can catch meaningful declared-vs-observed drift in a real project, explain the result clearly, and produce a portable evidence artifact that GitHub Actions, VS Code, and MCP can all consume without inventing new semantics.

## What The Batch De-Risks

- Cross-project scanner stability over five mixed-shape repositories.
- No-install safety posture: clone-only source reads, no lifecycle scripts, no target tests/builds/actions/submodules/`npx`.
- Low-noise advisory behavior: Express showed one reviewable deep import, Fastify stayed quiet while preserving large-file pressure notes, ESLint preserved collapsed-cycle and large-file evidence, and SvelteKit/UUID became quiet after explicit scope tightening.
- Portfolio discipline: the right decision was "no validator change" instead of tuning defaults around the latest target.
- Environment visibility: the npm CLI Windows checkout failure was correctly classified as harness/environment evidence rather than an Axiom architecture signal.

## What It Does Not Prove

- Maintainer-authored `.axi` authoring ergonomics.
- Whether `.axi` is expressive enough for real boundary intent, exceptions, and visible debt in a non-toy project.
- Whether hard violations are trusted enough for PR review.
- Whether the portable artifact is useful beyond reports generated from inferred baselines.
- Whether GitHub Actions, VS Code, or MCP users can navigate the same evidence without misunderstanding advisory warnings as hard proof.

## Remaining Risks

The strongest risk is **spec-authoring credibility**. If Axiom can scan many repositories but cannot help a team write and maintain a meaningful `.axi`, it collapses back into a dependency-graph reviewer.

The second risk is **spec-less false confidence**. Quiet observed graphs are useful controls, but they should not be marketed as validation. Validation starts when declared intent exists and Axiom catches drift from it.

The third risk is **integration surfaces outrunning the contract**. A read-only MCP or GitHub Action that exposes observed graph facts without declared intent, drift, and intentional debt would weaken the trust story.

The fourth risk is **scope as hidden tuning**. SvelteKit and UUID needed explicit exclusions. That is acceptable for pilots, but the product must make scan scope visible and reviewable rather than magical.

## Recommended Next Move

Checkpoint 1 should be a **spec-first pilot on one real or realistic project**:

- author a small human-reviewed `.axi` contract rather than relying only on inferred baselines;
- introduce or replay a deliberate boundary violation;
- show `axi check` catching the hard violation;
- show `axi observe --json/--markdown` carrying review story, warnings, and intentional-debt state separately;
- save the resulting `.axi + baseline + reviewStory + intentionalDebt` artifact.

Checkpoint 2 can then be a **minimal GitHub Actions trust pass**:

- run `axi check` as the only hard gate;
- publish `axi observe` as a review summary/artifact;
- keep advisory warnings visibly separate from hard failures;
- avoid merge-blocking from heuristic warnings.

This keeps the path aligned with the product thesis: single-repo validator trust first, ecosystem surfaces second.

## No-Go Lines

- Do not claim "alpha validator" from spec-less or inferred-only smokes.
- Do not ship an MCP graph query that exposes only observed imports without declared intent, drift, and visible debt.
- Do not hard-gate advisory warnings.
- Do not add semantic health scores, hidden suppressions, or broad AI repair automation.
- Do not expand to template inheritance or contract sharing before at least one spec-first pilot proves the core loop.

## Local Decision

Adopt the forecast as a pressure map, not as literal scoring truth. The score is conservative because it discounts inferred baseline contracts, but the recommendation is useful: the next validator checkpoint should prove a human-reviewed `.axi` contract catching deliberate drift before broad MCP or VS Code work.
