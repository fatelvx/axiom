# MiroFish Targeted Backtest: Graph Interpretation And MCP Readiness

Created: 2026-05-13T09:43:54.939786+00:00

Method: direct MiroFish `LLMClient` using the local configured model. This is a synthetic forecast and not real user research or a full OASIS social simulation run.

Seed: `experiments/axiom-forecast/seed-graph-interpretation-mcp-target-2026-05-13.md`
Model: `deepseek-v4-pro` via `https://api.deepseek.com`
Commit: `886337b Add graph interpretation guidance`
Note: Output requested ASCII punctuation to avoid local Windows mojibake in saved artifacts. The saved excerpt below was lightly cleaned for encoding artifacts only.

## Forecast Output

```text
Executive verdict
Axiom's new graph interpretation layer is a solid step toward reducing blank "did I use this right?" confusion, but it does not eliminate the need for architecture literacy. The headline, quickRead, and lookFirst checklist give users a starting handrail, while central-module pressure surfaces coupling that Dependency Cruiser-style tools usually leave buried. The risk of a false "health score" is present but well-caveated. The MCP surface would be a promising adoption wedge for AI-assisted workflows, but only after CLI/JSON outputs prove stable in real use. Axiom is not yet mature enough to justify a large backtest; one targeted documentation and interpretation refinement round will pay off more than a premature MCP push.

Stakeholder reaction map
- Solo / small-team game developer (like pilot): "Oh, so I look at the center first and check violations. That helps. Still need to understand what a 'good' graph looks like, but at least I'm not staring at a tangle." Might bounce if the central module is obvious.
- Senior front-end architect in a mid-size org: "Headline and look-first are a clear checklist I can paste into a PR review. The caveat is honest. I still need to map 'graph center' to my own mental model." Will want more examples.
- Platform engineering / DevX team: "Interpretation makes Axiom a better fit for guardrail-onboarding programs. We'd push for MCP read-only tools for code-review agents, but only after the JSON schema is quiet for a few months."
- AI-tooling early adopters: "MCP could be a differentiator: imagine Cursor running axi observe and telling me my import graph is drifting. But if the underlying schema churns, agent integrations will break and create distrust."
- Skeptic who uses Madge / Dependency Cruiser: "You've added a layer of interpretation, but the core data is still an import graph. Fan-in/out doesn't tell me if my architecture is good. I'll wait until you prove it prevents real regressions."

Strongest improvement
The "look first" checklist (hard signals -> graph center -> shape fit) gives users a repeatable, non-magical inspection routine. It separates signal-ranking from visual overwhelm and makes the tool feel more like a triage assistant than a firehose.

Remaining rejection pattern
Users who want a red/green "architecture health score" will still feel lost. The caveat says interpretation is not proof of semantic health, but the framing "Contract is failing" can read as a binary judgement. Once violations are cleared, the headline may say nothing actionable, leaving users to stare at a neutral graph with no next step. That moment will feel like the tool ran out of things to say.

Specific small fix
When the contract is passing, replace a bland "Contract is passing" headline with a second-level guidance: e.g., "No violations. Your graph center is [X]. Does that match your intended shape? Compare with a baseline or check for drift over time." This keeps the tool useful even in a green state, preventing the "now what?" silence.

MCP timing recommendation
Do not ship an MCP surface until you have at least two releases with no JSON schema version bumps and at least three real teams using the CLI successfully in CI. A premature read-only MCP will attract agent-builders, but if the output shape changes they will complain or, worse, build fragile prompt-wrapping that then fails silently. Wait until v11 is stable and the interpretation layer has survived a few external back-and-forth feedback rounds.

Decision: larger backtest now, one more target refinement, or hold
One more target refinement. Run a quick, low-cost second pilot with 3 to 5 developers using the new banner, README "How To Read A Graph", and the interpretation JSON. Specifically test the passing-contract emptiness. Gather brief qualitative feedback but do not polish for public launch yet. After that, a controlled backtest with real repos (including some with no violations) will tell you whether the interpretation actually reduces confusion or just moves it.

What not to overclaim
- Do not claim centralModules represent a "health score" or quality metric; fan-in/out from static import graphs is a coupling signal, not a semantic architecture verdict.
- Do not position "How to Read a Graph" as making architecture decisions for users; it reduces blindness, not replaces judgement.
- Do not promise that an MCP integration will make agents architecturally intelligent; it will only give agents the same import-graph clues a human gets, plus the same caveats.
- Do not market Axiom as "the tool that solves architecture drift"; it is an observability layer with enforceable guardrails: drift detection, not drift prevention.
```

## Axiom Follow-Up Interpretation

This target run accepts the graph interpretation direction, but it warns that quiet / passing scans can still create a "now what?" moment. The useful issue is not to add a health score. The useful issue is to keep guidance alive when there are no violations: compare the graph center with intended architecture, then save a baseline if the shape is intentional.

Follow-up taken after the target run:

- Updated the quiet graph headline so passing scans say to compare the graph center with intended architecture before saving a baseline.
- Kept MCP as a later read-only adapter direction, not the next implementation step.
- Kept `centralModules` framed as import-pressure navigation, not a quality metric.
