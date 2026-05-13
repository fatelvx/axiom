# MiroFish Big Backtest V3 - Post Contract Recipes

Created: 2026-05-12T23:55:36.864415+00:00

Method: direct MiroFish `LLMClient` using the local configured model. This is a synthetic forecast and not real user research or a full OASIS social simulation run.

Seed: `experiments/axiom-forecast/seed-big-backtest-v3-2026-05-13.md`
Model: `deepseek-v4-pro` via `api.deepseek.com`
Commits: `d7898a9 Add contract authoring recipes`, `5bdd5b7 Record contract recipes target pilot`
Note: The saved artifact is ASCII-cleaned to avoid local Windows mojibake in generated quotation marks.

## Forecast Output

1. Executive verdict

Axiom is close but not ready for broad overclaiming. The architecture observability framing is credible, but the current surface still misses a low-friction first-value moment. The adoption path can make users feel they must author or review a contract before seeing useful change. A first-class `axi diff` command for baseline drift would make the observability claim tangible without weakening visible-debt discipline.

2. Stakeholder reaction map

- Senior TypeScript app engineer: `axi infer` gives a mirror of the current graph, but the next useful moment is unclear. A baseline diff after a few PRs would make the tool more interesting.
- Monorepo platform engineer: performance evidence is improving, but platform teams need incremental drift across packages before asking teams to maintain another file.
- Staff engineer worried about AI drift: intentional debt and baselines are useful, but a built-in diff would make architecture change over time visible before trusting contracts as gates.
- Dependency Cruiser power user: existing tools can already enforce rules. A first-class drift diff is the clearest reason to try Axiom as something more than another dependency checker.
- AI agent workflow maintainer: drift JSON and Markdown would be useful inputs for repair loops.
- React/Pixi game developer using AI: after an agent rewrites imports, they want to see exactly which module edges changed rather than a wall of lint errors.
- OSS maintainer: a new config file is hard to justify unless there is a quick visible payoff.
- Security-minded engineer: local execution is good, but a clear diff output would make suspicious import drift easier to spot.
- Product-minded developer-tool founder: the category almost works, but observability needs change-over-time, not only a static graph.
- New contributor from README: after `axi infer` and a graph, `axi diff` would teach the workflow more directly.

3. What is now working

- `axi infer` with notices, checklist, and collapsed-cycle output reduces the empty-page problem.
- Contract recipes lower first-draft friction without encouraging blanket auto-acceptance.
- Mermaid output with visible legends makes architecture review more tangible.
- Visible intentional debt with expiration and reason remains a strong differentiator.
- Hard and advisory signals are separated clearly.
- GitHub Actions examples show how to keep `axi check` as the gate and `axi observe` as review context.
- Honest limits around static analysis and symbol-level API health improve credibility.

4. Strongest remaining rejection pattern

The strongest rejection pattern is: "I have to write a contract before I see value." Even with recipes and inference, the first run can look like a static snapshot. A built-in drift diff would invert that experience: save a baseline, make or review a change, run `axi diff`, and see added or removed observed module edges immediately.

5. Category clarity: does "architecture observability layer" land?

The phrase is promising, but it lands best when Axiom shows change over time. Mermaid graphs, baselines, and debt ledgers point in the right direction, but a first-class diff command would make the observability category concrete.

6. Adoption path: what still blocks a first pilot?

The remaining blocker is the missing quick test. A pilot team should be able to:

- run `axi infer`,
- save a baseline,
- make or review a small change,
- run `axi diff`,
- decide whether the drift is worth turning into contract intent.

That path makes contract maintenance feel earned rather than assumed.

7. Technical credibility: what still blocks trust?

The known blind spots are documented well enough for v0. The credibility gap is now product proof: Axiom needs to demonstrate that useful boundary drift is detectable and reviewable over time, not only that a static graph can be inspected.

8. Decision

Run one more local refinement before broader pilot outreach: add a first-class `axi diff` command over the existing baseline drift model.

9. Recommended next step

Implement `axi diff <baseline.json>` or `axi diff --baseline <baseline.json>` with:

- human output focused on new and removed observed module edges,
- Markdown output for PR and agent review,
- JSON output reusing the existing graph envelope and `advisory_observed_edge_drift`,
- Mermaid output that highlights drift edges,
- no new enforcement semantics and no hidden ignore or auto-accept behavior.

10. What not to overclaim

- Do not claim Axiom replaces ESLint, Dependency Cruiser, Nx, or CodeQL.
- Do not claim React/Pixi AI-assisted games prove the whole market.
- Do not claim recipes remove `.axi` maintenance cost.
- Do not claim Axiom detects all architecture decay.
- Do not claim `axi diff` guarantees adoption. It only makes the first-value moment credible.
