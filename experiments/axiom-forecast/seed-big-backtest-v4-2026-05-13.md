# MiroFish Big Backtest V4 Seed: Review Story And MCP Readiness

Date: 2026-05-13

Status: larger synthetic forecast seed, not real user research.

## Current Axiom Snapshot

Axiom is an architecture observability layer with explicit contracts for AI-era codebases.

It is not a prompt wrapper, not a style linter, and not a complete architecture oracle.

The product loop is:

```text
current graph -> reviewed intent -> observe drift -> visible accepted debt -> selective gates -> agent-readable review context
```

The CLI surface is:

- `axi check`: hard gate for explicit, high-confidence `.axi` violations.
- `axi observe`: advisory architecture attention surface for hard violations, visible intentional debt, warnings, and drift.
- `axi graph`: full inspection and presentation surface, including JSON, Markdown, and Mermaid.
- `axi diff`: advisory baseline drift command for new and removed observed module edges.
- `axi infer`: starter contract generator that mirrors the current graph. It is not recommended architecture.

The adoption posture is:

- Start with `axi infer` and/or a contract recipe.
- Keep early contracts external with `--spec <path>`.
- Use `axi observe`, `axi graph --mermaid`, and `axi diff` before `axi check`.
- Save unfiltered `axi graph --json` baselines and review future edge drift.
- Add intentional violations manually with expiration dates and reasons.
- Promote only reviewed, low-noise facts into CI gates.
- Keep advisory warnings advisory until a team explicitly chooses to gate them.

## Implemented Product Surface

### Explicit architecture contracts

`.axi` supports:

- `module`
- `path`
- `layers`
- `layer`
- `depends on`
- `forbids module`
- `exposes`
- `hides`
- `purpose`
- `accepts ... until ... because ...`

Accepted debt is visible intentional debt, not a hidden allowlist.

### Validation and advisory signals

Hard violations include:

- `undeclared_dependency`
- `forbidden_dependency`
- `layer_breach`
- `hidden_import`
- `hidden_reexport`
- `unexposed_import`
- `cycle_dependency`
- invalid or expired intentional violations
- ambiguous or invalid module ownership

Advisory signals include:

- `unresolved_import`
- `deep_internal_import`
- `coupling_concentration`
- `broad_public_surface`
- `public_entrypoint_coupling`
- baseline observed edge drift
- expiring or unused intentional violations

Public API surface warnings are advanced-only because they are useful but easy to overinterpret.

### Observability artifacts

Axiom now emits:

- human diagnostics with an explicit review model in `observe` and focused graph output,
- JSON envelopes for integrations,
- Markdown review summaries for PRs and agent loops,
- Mermaid graph output with a visible legend and filtered-view marker,
- graph baselines for drift-over-time review,
- top-level intentional debt ledgers so accepted non-edge surface debt stays visible,
- `architectureSummary.interpretation` so users know what to inspect first,
- `architectureSummary.reviewStory` so warning-heavy scans produce a short story, top pressures, and a next step.

### Graph JSON v12

`axi graph --json`, `axi observe --json`, and `axi diff --json` emit `axiom.graph.v12`.

`architectureSummary.reviewStory` includes:

- `summary`
- `setup`
- `pressures[]`
- `nextStep`
- `caveat`

Example:

```json
{
  "schemaVersion": "axiom.graph.v12",
  "architectureSummary": {
    "reviewStory": {
      "summary": "No hard gate failures. Start review with State/store leakage into ServicesCycle...",
      "setup": "Scanned 2 declared modules and 1 observed import edge. This report is advisory unless you run `axi check` as the gate.",
      "pressures": [
        {
          "kind": "advisory_warning_root",
          "title": "State/store leakage into ServicesCycle",
          "severity": "review",
          "count": 1,
          "code": "deep_internal_import",
          "modules": ["ServicesCycle"]
        }
      ],
      "nextStep": "Inspect State/store leakage into ServicesCycle; decide whether to change code, clarify .axi visibility rules, or keep the signal advisory.",
      "caveat": "This story is a review aid over static imports. It points to likely pressure, not proof that the architecture is good or bad."
    }
  }
}
```

This is intended as the JSON surface a future read-only MCP wrapper could expose. It is not a semantic health score.

## Evidence Collected

Verification:

- `npm run alpha:check` passed after `reviewStory`.
- 179 tests passed.
- Axiom self-contract passed.
- GitHub Actions smoke passed.
- npm pack dry-run passed.

Safe public repo pilots:

- ofetch quiet control: 1 module, 0 observed dependencies, 0 warnings.
- Preact Signals workspace: 11 modules, 23 observed dependencies, 2 warnings, `SignalsDebugCycle`, `SignalsCore` fan-in, and a debug deep import from React runtime.

Lumina external pilot:

- no `.axi` files written into Lumina.
- 12 modules, 231 full observed dependencies, 117 advisory warnings, 0 hard violations.
- graph center: `ServicesCycle`.
- useful pressure: tooling/tools loop, services/store leakage, broad services cycle, missing public boundaries.
- Axiom fixed the earlier bad advice where `src/store/chatStore.ts` could be told to import through `src/services/sandbox/index.ts`.

MiroFish target backtests:

- Pilot confidence target: accepted the Lumina trust repair but recommended one more review-story refinement before MCP.
- Review story target: accepted `architectureSummary.reviewStory` as enough to run a larger public-reception / MCP backtest now.

## Known Honest Limits

Axiom v0 does not prove full semantic architecture health.

Blind spots:

- non-literal dependency injection strings,
- runtime plugin loading,
- generated imports outside static source,
- `eval`,
- semantic wrappers around hidden internals,
- broad public APIs that are syntactically legal but conceptually unhealthy,
- TypeScript declaration-only public API exposure,
- full TypeScript or Node module resolution,
- dynamic import patterns that static source scanning cannot resolve.

`symbol-level API health` remains a named future frontier.

## MCP Direction Under Evaluation

Potential first MCP version should be thin and read-only:

Tools:

- `axiom_infer_contract(root, groupDepth, groupBy)`
- `axiom_check(root, spec, strict)`
- `axiom_observe(root, spec, warnings, baseline)`
- `axiom_graph(root, spec, format)`
- `axiom_diff(root, spec, baseline)`

Resources:

- `axiom://project/current/contract`
- `axiom://project/current/graph`
- `axiom://project/current/diagnostics`
- `axiom://project/current/architecture-summary`

Prompts:

- draft initial architecture contract
- review PR architecture drift
- classify advisory warnings as fix now / accepted debt / contract update

Guardrails:

- MCP should not auto-edit `.axi` in v0.
- MCP should not auto-accept debt.
- MCP should not treat `reviewStory` as a gate.
- MCP should call `axi check` for hard pass/fail and `observe` / `graph` / `diff` for review context.

## Recent Commit Under Test

Latest commit under test:

```text
45bf849 Add graph review stories
```

## Backtest Question

Evaluate whether Axiom is now ready for a larger public-reception / MCP-oriented preview, or whether another local product hole should be closed first.

Focus especially on:

- Does `reviewStory` reduce the "just a linter / dependency graph" perception?
- Does the MCP direction look compelling and safe if it is thin/read-only over existing CLI/JSON?
- Will agents misuse `reviewStory` as a health score or hard gate?
- Is `axiom.graph.v12` stable enough to expose to early MCP consumers?
- What would make a staff engineer or agent-tool builder trust the MCP surface?
- What will skeptics attack first?
- Does Axiom's honest limitation posture make the product more trustworthy or less impressive?

## Stakeholders To Simulate

1. Senior TypeScript application engineer maintaining an AI-assisted SaaS app.
2. Monorepo platform engineer responsible for CI speed, schemas, and tool maintenance.
3. Staff engineer worried about architecture decay under AI coding agents.
4. Dependency Cruiser power user skeptical of new dependency tools.
5. AI agent workflow maintainer building repair-loop infrastructure.
6. React/Pixi game developer using AI heavily.
7. Open-source maintainer evaluating whether to accept a new config file.
8. Security-minded engineer checking local execution, supply-chain risk, and secret exposure.
9. Product-minded developer-tool founder evaluating category clarity.
10. MCP / IDE integration builder.

## Required Output Format

Use concise English. Return these sections:

1. Executive verdict.
2. Stakeholder reaction map.
3. What is now working.
4. Strongest remaining rejection pattern.
5. MCP readiness and risks.
6. What a safe MCP v0 should include.
7. What should not be built yet.
8. Decision: public/MCP preview now, one more target refinement, or hold.
9. Recommended next engineering tasks.
10. What not to overclaim.
