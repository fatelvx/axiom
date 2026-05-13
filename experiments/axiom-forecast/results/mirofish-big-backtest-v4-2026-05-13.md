# MiroFish Big Backtest V4 - Review Story And MCP Readiness

Created: 2026-05-13

Method: direct MiroFish `LLMClient` using the local configured model. This is a synthetic forecast and not real user research or a full OASIS social simulation run.

Seed: `experiments/axiom-forecast/seed-big-backtest-v4-2026-05-13.md`
Model: `deepseek-v4-pro` via `https://api.deepseek.com`
Commit: `45bf849 Add graph review stories`
Note: Output was cleaned to ASCII punctuation for repository readability.

## Forecast Output

```text
1. Executive verdict

Axiom is ready for a careful, read-only MCP preview and limited public reception targeting senior engineers and agent-loop builders, but not for a broad developer-tool launch. `reviewStory` reduces the "just a linter" perception by giving a narrative entry point, but must be positioned strictly as a review aid. The thin MCP direction is compelling if it stays a transparent wrapper over existing CLI/JSON, with strong guardrails against auto-editing or gating. The biggest risks are misuse of `reviewStory` as a health score and naive MCP consumers expecting full semantic understanding.

2. Stakeholder reaction map

- Senior TypeScript engineer: `reviewStory` helps them look in the right place and feels safe if it stays advisory.
- Monorepo platform engineer: worried about JSON schema stability and wants a deprecation/versioning story before dashboard integration.
- Staff engineer worried about AI decay: sees review story as useful agent context, but wants examples of agents consuming it safely.
- Dependency Cruiser power user: will benchmark against existing rules and attack TypeScript resolution gaps.
- AI agent workflow maintainer: wants `axi observe --json` and review story in repair loops, with clear codes and stable JSON paths.
- React/Pixi game developer: may skip until Axiom can catch runtime coupling, but appreciates honest blind spots.
- Open-source maintainer: still wary of another config file and warning volume.
- Security-minded engineer: comfortable with local read-only use and plain JSON/Markdown output.
- Product-minded devtool founder: likes the category but wants a crisp demo that ends with "not a gate; here is the next step."
- MCP / IDE builder: wants read-only graph/observe resources and no write tools yet.

3. What is now working

- The product loop is coherent: current graph -> reviewed intent -> observe drift -> visible accepted debt -> selective gates -> agent-readable review context.
- `reviewStory` succeeds as a human and agent starting point without becoming a score.
- Visible intentional debt remains a strong differentiator.
- `axiom.graph.v12` gives a versioned integration surface.
- The adoption posture of observe / graph / diff before check reduces early overcommitment.
- Honest limitations improve credibility with serious engineers.
- `axi diff` and baseline drift are already useful for agent loops.
- The Lumina pilot showed real pressure and Axiom corrected its own overconfident entrypoint advice.

4. Strongest remaining rejection pattern

Skeptics will say Axiom is still a dependency graph tool with a contract language that cannot see runtime architecture. It will miss dynamic relationships and still asks teams to maintain `.axi`. The counter is that `.axi` encodes human/agent-reviewable intent, not just source facts, but the value depends on willingness to maintain that intent.

5. MCP readiness and risks

The read-only MCP surface is technically ready because the CLI commands and JSON output exist. The risks are:

- MCP server/version mismatch if graph schemas change without a consumer story.
- Agents treating `reviewStory` as a health score.
- Users expecting MCP to auto-fix drift.
- Missing or stale baselines causing misleading diffs.
- Write tools becoming dangerous before the human-in-the-loop model is proven.

6. What a safe MCP v0 should include

- Read-only tools: graph, observe, diff, infer, and maybe check as pass/fail reporting.
- Resources for current contract, graph, diagnostics, and architecture summary.
- No `.axi` write tools.
- No auto-accepted debt.
- Baseline path handling and baseline freshness visibility.
- Schema version reporting in every resource.
- An integration example for an AI editor or PR comment that presents `reviewStory` as review context, not a build failure.

7. What should not be built yet

- Auto-accept debt or auto-edit `.axi`.
- Symbol-level API health tracking.
- Architecture health scores or grades.
- Full TypeScript checker integration.
- Dashboards before schema/versioning demand is proven.
- MCP write tools such as accepting debt.

8. Decision

Proceed to a limited public/MCP preview, conditional on two small refinements first:

1. Drift baseline lifecycle documentation and a well-known default path.
2. Agent-loop integration recipe showing how to call diff, read `reviewStory`, and propose a review comment without treating it as a gate.

Do not use broad launch language yet.

9. Recommended next engineering tasks

- Document a `.axi/baselines/current.graph.json` convention.
- Show an agent loop that uses `axi check` for gates and `reviewStory` for context.
- Publish or document JSON schema/versioning expectations for `axiom.graph.v12`.
- Add local smoke tests for a future MCP server once it exists.
- Write an MCP integration guide with caveats.
- Consider a later baseline helper command, but do not let agents update baselines automatically.

10. What not to overclaim

- Axiom does not understand architecture semantics.
- `reviewStory` is not sufficient for automated gating.
- MCP will not auto-repair architecture.
- Axiom does not trace runtime or symbolic dependencies.
- Axiom is an observability layer, not a replacement for human architecture judgment.
```

## Axiom Follow-Up Interpretation

This larger backtest moved MCP from "premature" to "limited preview is reasonable" because `reviewStory` now gives agents a stable first paragraph over graph facts.

The result still says the preview needs two immediate guardrails:

- baseline lifecycle guidance so agents do not compare a branch to itself or hide drift,
- and an agent/MCP recipe that keeps `axi check` as the hard gate while using `reviewStory` as review context.

Those guardrails are now implemented as `guides/agent-loop.md`, with README / JSON consumer / GitHub Actions links.
