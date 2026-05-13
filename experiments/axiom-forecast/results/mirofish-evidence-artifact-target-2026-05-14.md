# MiroFish Targeted Backtest: Evidence Artifact Loop

Created: `2026-05-13T19:41:40.629521+00:00`

Seed: `experiments/axiom-forecast/seed-evidence-artifact-target-2026-05-14.md`

Method: direct MiroFish `LLMClient` targeted synthetic backtest using the local MiroFish model configuration. This was not a full OASIS social simulation and is not real user research.

Note: the first Traditional Chinese direct response was mojibake due to local MiroFish encoding fragility. The retained result below is the readable English rerun, lightly normalized to remove local encoding artifacts while preserving the generated risk-map substance.

## Executive Forecast

The Evidence Artifact Loop is a valuable defense against the "disconnected product surfaces" critique, but it is not a moat by itself. It clarifies the artifact that flows through every surface: CI, editor, agent, and MCP. That reduces the risk that GitHub Actions, VS Code, or MCP invent divergent validation semantics, and it gives enterprise reviewers a clearer local file boundary.

The guide is still documentation polish until the artifact is battle-tested on real, messy codebases. The biggest remaining risk is that the portable artifact looks clean in theory but breaks down under real-world import resolution, TypeScript path aliases, monorepo layouts, or large-file noise. The guide enables a thin read-only MCP design sketch, but the next step should still be validator-trust calibration on real projects before shipping an integration surface agents might misuse.

## Stakeholder Reactions

Senior engineers will like the file convention, then ask why `current.graph.json` is not generated fresh on every run and what to do when baseline drift appears. The likely misunderstanding is that a baseline is a reviewed checkpoint, not a moving target to overwrite whenever a branch changes.

AI tooling builders will try to wire agents to read JSON, summarize `reviewStory`, and suggest `accepts` additions. The guide's warnings help, but many builders will still be tempted to create auto-accepted-debt loops. The artifact should be framed as a human-supervised audit trail, not a training-data store for suppressions.

Skeptical static-analysis researchers will compare Axiom to a module-graph linter plus a policy file. They may miss the review story, drift narrative, and intentional-debt ledger that make it an observability workflow rather than a one-shot linter.

Open-source maintainers will worry about `current.graph.json` churn and extra `.axi` directory maintenance. The adoption path needs to keep emphasizing external pilots, focused contracts, and baselines only for stable boundaries.

Enterprise security reviewers will ask whether an MCP server sends the architecture graph to a remote model and whether sensitive paths can be redacted. The guide says read-only and local, but it does not yet include an MCP threat model or sensitivity filter.

## Risk Score Changes

| Risk | Before | After | Change |
| --- | --- | --- | --- |
| Disconnected CI/editor/agent surfaces | High | Medium-low | Down 2 |
| Ad hoc MCP validation semantics | High | Medium | Down 1 |
| Teams not understanding why contracts matter | Medium-high | Medium | Down 1 |
| Incumbents copying simple dependency-rule checks | High | High | No change |
| Developer friction from too many artifacts | Medium | Medium-high | Up 1 |
| Maintainer burnout from integration requests | Medium | Medium | No change |
| Enterprise privacy and trust in agent integrations | Medium | Medium-high | Up 1 |

The guide materially reduces disconnected-surface risk. It does not reduce the incumbent-copying risk because a file convention is easy to imitate. The moat grows only if the review-story generation, debt ledger, resolver quality, and real-project calibration prove that Axiom captures patterns simpler tools cannot.

## Strongest Remaining Objection

Incumbents can replicate the artifact convention without the observability layer. A competitor could publish a contract file, graph baseline, and review-story JSON schema around an ESLint or dependency-graph plugin. The Evidence Artifact Loop buys integration alignment, not algorithmic uniqueness.

Until real-project calibration demonstrates that generated review stories and visible debt capture practical architecture pressure better than simpler tools, the artifact alone is not enough competitive defense.

## Recommended Next Action

Run a public real-project calibration sprint on three to five open-source monorepos or mixed-shape repositories. The sprint should exercise pnpm mirrors, type-only resolution, source scope, large files, and baseline review.

Publish:

- the exact `axiom.config.json` and scan scope,
- the snapshot `current.graph.json` baseline,
- the `axi observe --json` review story and `intentionalDebt[]`,
- a short narrative of what was learned while accepting or rejecting each intentional debt item.

This would turn the Evidence Artifact Loop from a static guide into a visible, repeatable workflow that senior engineers and security reviewers can inspect. It also stress-tests validator behavior before any MCP surface is trusted.

## What Axiom Should Not Do Next

Do not ship an MCP server, even read-only, before the calibration examples are credible enough. Without real-project examples, MCP will invite privacy objections and agent builders may auto-accept debt before they understand the review loop.

Do not add semantic health scores, hidden suppressions, or auto-generated acceptance rules. The artifact loop depends on explicit, time-bounded, reviewable debt.
