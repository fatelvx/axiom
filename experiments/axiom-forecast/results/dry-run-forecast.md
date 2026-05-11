# Dry-Run Forecast: Social Reception Of Axiom

This is a local dry run using the prepared MiroFish seed and protocol. It is not a full MiroFish simulation because the MiroFish runtime requires LLM and Zep Cloud credentials.

## Executive Forecast

Axiom's strongest near-term reception is likely among teams already using AI coding agents in codebases where architecture drift is visible and painful. The weakest reception is likely from senior engineers who see import-boundary tools as old news unless Axiom clearly demonstrates why AI-era workflows make the problem newly urgent.

The winning position is not "AI architecture firewall." It is:

```text
Architecture awareness and enforceable contracts for AI-edited codebases.
```

## Segment Reactions

| Segment | Likely Reaction | Adoption Trigger | Main Objection |
| --- | --- | --- | --- |
| AI coding tool builder | Interested quickly | Agent-readable diagnostics and repair loops | Needs structured output and low false positives |
| Startup CTO | Interested if demo is fast | Prevent agent-driven architecture drift | Does not want config tax |
| Enterprise architect | Interested but cautious | Visible policy, accepted debt, CI gate | Needs evidence and governance workflow |
| DevOps/CI owner | Skeptical | Fast scans and stable JSON | Worried about CI bottlenecks |
| Skeptical senior engineer | Dismissive at first | Clear differentiation from Dependency Cruiser | "This is just linting" |
| Open-source maintainer | Curious but conservative | One-command example and no repo churn | Does not want another config file |
| Monorepo maintainer | Interested | pnpm/workspace support and focused graph | Needs scale proof |
| Agent framework developer | Interested | Contract feedback loop for agents | Wants APIs, not only CLI text |
| Noisy-linter hater | Resistant | Warning-first adoption and visible escape hatches | Fears false positives |

## Strongest Adoption Wedge

The best wedge is:

```text
AI agent changes a codebase, Axiom catches architecture drift before CI merge.
```

This is more compelling than generic architecture governance. It connects directly to a new behavior: AI edits too many files too quickly for human memory and review alone.

## Strongest Rejection Pattern

The strongest rejection is:

```text
"Dependency Cruiser already does this."
```

Axiom must answer this in the first 30 seconds with:

- declared graph vs observed graph
- intentional violations as visible contract communication
- warning-to-error adoption path
- future agent feedback loop
- architecture intent, not only dependency syntax

## Most Dangerous Misunderstanding

The most dangerous misunderstanding is that Axiom claims to prove architecture quality.

It should keep saying:

- v0 validates high-confidence import and visibility intent
- it does not prove semantic coupling is healthy
- it makes drift visible before every signal becomes a hard gate

## Intentional Violations Forecast

Intentional violations are likely valuable if they are framed as visible architecture debt, not suppressions.

Positive interpretation:

- gives teams a migration path
- lets agents negotiate with the contract
- prevents permanent hidden allowlists

Negative interpretation:

- can look bureaucratic if too verbose
- may be abused if expiration warnings are ignored

Recommendation:

Keep `accepts ... until ... because ...` prominent in README and graph attention output. Add review/reporting examples next.

## Feature Priority Forecast

High priority:

- faster first-use demo
- `axi graph --attention` examples
- JSON examples for agents
- scan timing and file count output for monorepo confidence
- richer `axi infer` review workflow
- public comparison page vs Dependency Cruiser / ESLint

Medium priority:

- drift score as advisory only
- PR annotation recipe
- baseline snapshots for architecture drift over time
- package publish and downstream CI recipe

Defer:

- broad semantic code quality scoring
- capability detection as a main product pitch
- automatic AI repair
- full runtime dependency modeling

## README/GitHub Page Changes

Recommended changes:

- Add a "Why not Dependency Cruiser?" section.
- Add a "For AI agents" section with one JSON diagnostic example.
- Add a "Adopt in stages" diagram: infer -> warn -> attention -> strict.
- Add a monorepo scale note with measured source file/import counts.
- Show intentional violations as a first-class feature, not an exception footnote.

## CLI/Diagnostics Changes

Recommended changes:

- Add scan duration to summary output.
- Add `axi check --summary-json` or keep full JSON but document summary fields better.
- Add `axi graph --attention --json` examples for agent loops.
- Consider `axi debt` later for intentional violations and expiry review.

## Roadmap Changes

Near-term roadmap should emphasize:

1. publish alpha package
2. comparison/migration guide vs existing dependency tools
3. scan performance and timing visibility
4. intentional violation review/debt view
5. agent-readable validation packet

Avoid moving capability checks earlier unless users demand them from real pilot feedback.

## Evidence Users Will Demand

Users will want:

- sample repo before/after
- scan time on medium and large repos
- false positive examples and how they are handled
- exact behavior when `.axi` is partial
- how to avoid contract maintenance explosion
- comparison to existing tools

## Surprising Insight

The strongest product story may not be "Axiom prevents bad AI code." It may be:

```text
Axiom gives AI agents a reviewable contract negotiation surface.
```

The contract is not only a wall. It is a shared protocol for humans and agents to decide whether a change is forbidden, accepted debt, or advisory drift.
