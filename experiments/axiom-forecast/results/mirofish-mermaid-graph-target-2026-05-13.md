# MiroFish Target Backtest - Mermaid Graph Output

Date: 2026-05-13

Method:

- Direct targeted `LLMClient` prompt through the local MiroFish runtime.
- Same local DeepSeek configuration as previous target pilots.
- Not a full OASIS social simulation rerun.

Product snapshot:

- Current Axiom master after `axi graph --mermaid` and `axi observe --mermaid`.
- Mermaid output is presentation-oriented over the existing graph result.
- `axi graph --mermaid` visualizes observed module dependencies grouped by declared layer.
- `axi observe --mermaid` uses the same attention filter as observe.
- Machine-readable graph output remains `axi graph --json`.
- Full alpha check passed before the pilot: 155 tests plus self-contract check.

Target question:

Does a visual dependency graph strengthen Axiom's architecture observability direction before a larger backtest, or does it make Axiom look like a generic dependency graph visualizer?

## Executive Verdict

The feature is directionally useful but needed one small repair before a larger backtest.

The visual graph helps adoption because it gives users a fast "where are we bleeding?" view: modules, layer groupings, observed import edges, import counts, and drift/debt codes are visible in one artifact.

The high-risk misunderstanding is that a skeptical developer may see only a Mermaid graph and classify Axiom as a prettier `madge` or Dependency Cruiser output. The declared-intent and observability boundaries must be visible in the rendered diagram itself, not only in hidden Mermaid comments or surrounding docs.

## Strongest Adoption Improvement

The diagram makes architecture drift easier to discuss in pilots, PRs, and agent repair loops. It compresses long edge lists into a reviewable shape and makes concentrated dependency paths easier to notice.

## Remaining Rejection Pattern

The graph can be misread as:

- a complete architecture diagram,
- a declared architecture topology,
- a generic dependency graph visualizer,
- or an enforcement map.

That risk is especially high because Mermaid comments are not visible after rendering.

## Required Small Repair

Add a mandatory visible legend to every Mermaid output:

- Nodes are declared `.axi` modules, grouped by declared layer when present.
- Edges are observed imports.
- Edge labels show import counts and drift/debt codes.
- Mermaid output is presentation-only; JSON is the machine-readable surface.
- Filtered views must say they are filtered and that clean observed dependencies are omitted.

## Follow-Up Taken

Axiom now renders an in-diagram `Axiom graph legend` block.

For `axi observe --mermaid`, `axi graph --attention --mermaid`, and `axi graph --violations-only --mermaid`, the rendered graph now includes a `FILTERED` view note and says clean observed dependencies are omitted.

## Decision

Proceed to a larger backtest after this legend repair is committed and self-guard checks pass.

## What Not To Overclaim

Do not describe Mermaid output as:

- a declared architecture diagram,
- generated architecture documentation,
- an enforcement map,
- or proof of semantic architecture health.

It is an observability lens over observed import reality, with drift/debt callouts against declared `.axi` intent.
