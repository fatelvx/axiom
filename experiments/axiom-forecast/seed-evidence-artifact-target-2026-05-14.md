# Targeted MiroFish Backtest Seed: Evidence Artifact Loop

Status: targeted synthetic forecast seed, not real user research.

Use this as a MiroFish-style risk-map prompt after adding the public Evidence Artifact Loop guide.

## Current Axiom State

Axiom is a TypeScript/JavaScript architecture observability layer with enforceable contracts.

The validator-first loop is:

```text
.axi contract -> declared graph
source imports -> observed graph
Axiom compares both -> hard violations, visible debt, advisory warnings, and drift review
```

The current CLI has:

- `axi check` as the hard gate.
- `axi observe`, `axi graph`, and `axi diff` as review surfaces.
- `axi infer` as a current-graph starter contract generator.
- JSON output for check, graph, observe, diff, and infer.
- `architectureSummary.reviewStory` in graph / observe / diff JSON.
- a top-level `intentionalDebt[]` ledger in graph / observe output.
- advisory baseline drift from unfiltered `axi graph --json` baselines.
- visible `.axi` intentional violations with `accepts ... until ... because ...`.

Recent validator hardening includes pnpm workspace source mirrors, Vite-style type-only declaration resolution, no-contract onboarding wording, large-file warnings, composition-root fan-out role hints, and collapsed-cycle cycle-breaking candidates.

## Strategic Critique Being Tested

Recent external critique says Axiom can still fail if:

- GitHub Actions, VS Code, and MCP become disconnected product surfaces.
- `.axi` is too weak, too complex, or too expensive to maintain.
- teams do not understand why architecture contracts matter.
- incumbents copy simple dependency-rule checks.
- developer experience has too much friction.
- a small maintainer burns out trying to build every integration.
- MCP or agent integrations create enterprise privacy and trust concerns.

The product response is not to rush integrations. It is to document one portable adoption artifact:

```text
.axi contract + scan scope + graph baseline + review story + visible intentional debt
```

## New Public Documentation Change

A new public guide `guides/evidence-artifact.md` defines the Evidence Artifact Loop.

It says the boring first artifact is not a new file format, but a convention around files and commands:

- `.axi` contract in `axiom/main.axi` or an external pilot `contracts/<project>.axi`
- scan scope in `axiom.config.json` or CLI `--include` / `--exclude`
- unfiltered graph baseline at `.axi/baselines/current.graph.json`
- generated review story from `axi observe --json` or `--markdown`
- visible intentional debt from `.axi` `accepts ... until ... because ...` plus JSON `intentionalDebt[]`

It recommends:

```text
axiom/
  main.axi
.axi/
  baselines/
    current.graph.json
axiom.config.json
```

It gives local, PR, agent, and MCP loops:

- local: `axi check` for explicit gates, `axi observe --baseline` for review context
- PR: hard gate from `axi check --json`, review story from `axi observe --json`
- agent/MCP: read-only loop over existing commands, no auto-edited contracts, no auto-updated baselines, no auto-accepted debt

It warns not to:

- treat `axi infer` output as a contract without review
- make advisory warnings or drift fail CI by default
- hide accepted debt outside `.axi`
- let agents add `accepts` rules without approval
- parse Markdown when JSON is available
- create a fresh baseline during PR review
- let GitHub Actions, VS Code, or MCP invent their own validation semantics

The README, adoption guide, GitHub Actions guide, JSON consumers guide, and Agent/MCP guide now link to this artifact loop.

## Questions For The Forecast

Answer as a MiroFish-style synthetic risk map. Do not treat this as real user research. Do not hallucinate features Axiom does not have. Do not recommend broad new enforcement semantics, semantic health scores, hidden suppressions, or auto-accepted debt.

Evaluate:

1. Does the Evidence Artifact Loop materially reduce the ecosystem-landing risk, or is it only documentation polish?
2. Does it strengthen Axiom's moat by moving value from one-off checking toward portable contracts, baselines, visible debt, and review stories?
3. What misunderstanding remains most likely for senior engineers, AI tooling builders, skeptical static-analysis researchers, open-source maintainers, and enterprise security reviewers?
4. Is this enough to proceed toward a thin read-only MCP design sketch, or should Axiom still spend the next step on validator trust / real-project calibration?
5. What is the single highest-signal next action after this change?

Output format:

- Executive forecast
- Stakeholder reactions
- Risk score changes after the guide
- Strongest remaining objection
- Recommended next action
- What Axiom should not do next
