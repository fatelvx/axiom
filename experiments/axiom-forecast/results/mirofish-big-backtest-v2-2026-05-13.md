# MiroFish Big Backtest V2 - Post Mermaid Legend Repair

Date: 2026-05-13

Method:

- Direct multi-stakeholder `LLMClient` prompt through the local MiroFish runtime.
- Same local DeepSeek configuration as previous pilots.
- Larger synthetic reception forecast, not a full OASIS social simulation rerun.
- Treat this as a risk map, not real user research or an action script.

Product snapshot:

- Architecture observability positioning.
- `.axi` declared intent plus source import scanner.
- `axi check`, `axi observe`, `axi graph`, `axi infer`.
- External `--spec` pilot contracts.
- Visible intentional debt with expiration and reason.
- Advisory warnings for unresolved imports, coupling concentration, deep internal imports, public surface pressure, and baseline drift.
- Mermaid visual graph output with an in-diagram legend and filtered-view marker.
- Full alpha check passed after the latest change: 155 tests, self-contract, GitHub Actions smoke, and pack dry-run.

## Executive Verdict

The forecast was more skeptical than the smaller target pilot.

It judged Axiom as directionally credible, but still at risk of being perceived as "a linter with architecture vocabulary" unless the product can show drift over time, low-noise onboarding, and real performance evidence on larger repos.

The strongest objection remains adoption friction: existing repositories may not want to write or maintain `.axi` contracts before they see value.

## Stakeholder Signal

- Skeptical monorepo maintainers will compare Axiom to ESLint, Dependency Cruiser, Nx, and custom CI.
- AI-heavy startup developers like the guardrail idea but do not want contract authoring overhead.
- Open-source maintainers will reject noisy CI steps quickly.
- Platform engineers need deterministic runtime and published performance evidence.
- Staff engineers are the strongest early believers if Axiom helps architectural review.
- Dependency Cruiser power users need a sharper differentiation story.
- Product-minded founders understand the "architecture observability for AI-era code" category.
- Security-conscious engineers care that Axiom scans locally and does not execute target code.

## Useful Warnings

The forecast identified three product-critical pressure points:

1. First-run and observe noise can kill adoption before the value is understood.
2. "Architecture observability" must increasingly mean change over time, not only point-in-time warnings.
3. Performance evidence on larger real repos matters before wider outreach.

## Questionable Recommendation

The forecast recommended an `axi adopt` command that would infer the current state and automatically wrap existing violations as intentional debt with a default reason and expiration.

This is not safe to implement as stated.

Why:

- It would normalize accepted debt before a human has reviewed the tradeoff.
- It conflicts with Axiom's rule that accepted debt must be explicit, visible, reasoned, and owned.
- It could turn Axiom into the hidden allowlist pattern it is trying to avoid.
- It also partly misunderstands `axi infer`: the current starter contract mirrors existing imports and tends to preserve current reality, not create a wall of red by itself.

The valid underlying problem is adoption friction, not the proposed blanket auto-accept mechanism.

## Follow-Up Taken

The public adoption guidance now explicitly says Axiom does not provide a blanket auto-accept adoption command in v0.

Instead, early pilots should:

- use `axi infer` as a reviewed current-graph snapshot,
- keep contracts external with `--spec` until the team is ready,
- use `axi observe` and `axi graph --mermaid` for review,
- add intentional violations manually only for reviewed migration debt,
- save graph baselines and use `axi observe --baseline` to observe drift over time.

## Decision

Conditional go for broader pilot outreach, not public overclaiming.

Before rewriting the GitHub page as a broader alpha launch, Axiom should collect at least one more larger-repo pilot with:

- scan runtime,
- warning count,
- top architectural signals,
- whether the Mermaid and Markdown artifacts helped a real reviewer,
- and whether `--spec` avoided adoption friction.

## Next Experiments

1. Larger repo pilot: run external-contract observe/graph against a repo larger than nanoid, preferably zod-sized or TanStack/tRPC-sized.
2. Noise audit: record warnings per source file and decide which signals should stay advanced-only.
3. Drift-over-time proof: save a graph baseline, scan a later version or branch, and show the changed edges rather than only the full graph.
