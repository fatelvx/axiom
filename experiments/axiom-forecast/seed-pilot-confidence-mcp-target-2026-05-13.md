# Axiom Targeted Forecast Seed: Pilot Confidence And MCP Timing

Created: 2026-05-13

Status: targeted synthetic forecast seed, not real user research.

This seed evaluates Axiom after the latest Lumina feedback repair, quiet-control pilot, and workspace pilot.

## Product Snapshot

Axiom is an architecture observability layer with explicit contracts for AI-era codebases.

Core model:

- `.axi` declares architecture intent.
- Source scanning observes TypeScript/JavaScript imports.
- Axiom compares declared graph vs observed graph.
- `axi check` is the hard gate.
- `axi observe`, `axi graph`, `axi diff`, Markdown, Mermaid, and JSON are advisory review / observability surfaces.
- Intentional violations are visible accepted debt with expiration dates and reasons.
- Advisory warnings stay advisory until teams explicitly promote a low-noise rule into a gate.

Positioning guardrails:

- Axiom is a guardrail layer, not a complete architecture oracle.
- Axiom does not prove semantic architecture health from import graphs alone.
- A green scan means the observed graph matches declared intent within the scanned scope; it does not prove the system is healthy.
- Inferred contracts mirror current imports; they are not recommended architecture.
- Axiom should reduce adoption friction without hidden framework policy, hidden allowlists, blanket auto-accepted debt, or broad new enforcement semantics.

Current version context:

- npm package version: `0.5.8`
- current commit under review: `3c5e9eb`
- recent commits:
  - `faa80ae` clarified focused output counts, warning-scope notes, warning clusters, and Markdown review wording.
  - `3cdf4ce` made deep-internal-import entrypoint advice source-group aware.
  - `3c5e9eb` polished collapsed cycle names and reran safe small pilots.

## New Change Under Test

Lumina pilot feedback showed that `deep_internal_import` advice could become overconfident inside a broad collapsed module.

Before the fix:

- Lumina's inferred `ServicesCycle` included services, agent loop, MCP, memory, multiagent, sandbox, tooling, tools, and store.
- `observe --spec` parsed the inferred `.axi` later as a normal broad module because collapsed-cycle metadata was only in comments.
- The module happened to contain one `index.ts`: `src/services/sandbox/index.ts`.
- Axiom marked unrelated imports like `src/store/chatStore.ts` as `single_likely_entrypoint` and suggested `src/services/sandbox/index.ts`.
- That advice was wrong: a sandbox index is not the public boundary for store or general services.

After the fix:

- Entry point advice is source-group aware.
- A deep import into `src/store/*` is not told to import through `src/services/sandbox/index.ts`.
- Cross-group entry points remain visible only as context.
- The diagnostic reports `entrypointConfidence: "ambiguous_entrypoints"` with reason `no_same_source_group_entrypoint`.
- The warning remains advisory and asks the user to split the module, add explicit `exposes` / `hides`, or keep the issue visible until the public boundary is named.

## External Pilot Evidence

### Lumina External Pilot

This was an external-spec pilot, not an in-repo adoption. No `.axi` file was written into Lumina.

Older run after `faa80ae`:

- hard violations: 0
- intentional debt: 0
- advisory warnings: 117
- modules: 12
- full observed dependencies: 231
- graph center: `ServicesCycle`
- central modules:
  - `ServicesCycle`: 160 import sites, fan-in 7, fan-out 2
  - `Components`: 92 import sites, fan-in 1, fan-out 7
  - `Types`: 72 import sites, fan-in 9, fan-out 0
- useful interpretation:
  - no hard contract failures, but advisory warnings need review
  - `ServicesCycle` carries the strongest observed coupling
  - compare the graph center with intended architecture before judging health

Human interpretation of Lumina:

- The core signal is not "lint noise"; it points to real architecture pressure.
- `tooling/catalog.ts` imports all tools, while each tool imports tooling contracts/types, creating a tooling/tools loop.
- Services, memory, sandbox, MCP, multiagent, tools, and store are folded together, suggesting unclear runtime boundaries.
- Services directly importing `useChatStore` looks like store leakage; long term, services should receive context/settings/callbacks by injection or events.

Remaining Axiom-side lesson from Lumina:

- Warning clusters are better than raw floods, but root-cause grouping should become more architectural:
  - tooling/tools contract loop
  - services/store leakage
  - missing public boundaries in broad service groups
- Current clusters still partly read as "source module -> target module warning groups" rather than root causes.

### Safe Public Repo Pilots

Safety posture:

- Shallow `git clone` only.
- No target package install.
- No target lifecycle scripts, builds, tests, `npx`, submodules, or GitHub Actions.
- This conservative posture is intentional while supply-chain risk is high.

ofetch:

- scope: `src/**`
- modules: 1
- observed dependencies: 0
- warnings: 0
- interpretation: quiet control; Axiom stayed silent and reminded the reviewer to confirm the scan scope before saving a baseline.

Preact Signals:

- scope: workspace packages under `packages/**`, excluding tests/build output.
- modules: 11
- observed dependencies: 23
- warnings: 2
- useful signal:
  - collapsed cycle: `SignalsDebugCycle`
  - includes: `Signals`, `SignalsDebug`
  - sample cycle path: `Signals -> SignalsDebug -> Signals`
  - `SignalsCore` is a fan-in hub from five modules.
  - one deep internal import: `packages/react/runtime/src/index.ts:21` imports `../../../debug/src/devtools`.
- naming fix:
  - old collapsed cycle name would have been `SignalsSignalsDebug`
  - current output is `SignalsDebugCycle`

## User And Product Questions

The latest friendly external feedback says Axiom is useful and fast, but users need help knowing whether they used it correctly and whether their graph is healthy or risky.

The product thesis is now:

- not just draw the graph
- translate the graph into a short review story
- define "used correctly" through a few first-look questions
- keep depth available, but wrap it in lower-cognitive-load interpretation

MCP remains attractive because agents should be able to ask Axiom for:

- current contract
- observed graph
- diagnostics
- architecture summary
- diff against baseline

But earlier target backtests recommended holding MCP until CLI/JSON surfaces survive more pilot feedback.

## Target Questions

Please answer as a MiroFish-style synthetic risk map. Do not treat this as real user research. Do not hallucinate features Axiom does not have. Do not recommend broad new enforcement semantics or auto-accepted debt.

Evaluate:

1. Did the Lumina entrypoint-confidence repair meaningfully reduce trust risk, or is it still too heuristic for pilot users?
2. Do the Lumina, ofetch, and Preact Signals pilots make Axiom visibly different from a linter / Dependency Cruiser / generic graph visualizer?
3. Is the current "graph interpretation" layer enough for first-time users, or should Axiom add stronger root-cause story generation before a larger backtest?
4. Should Axiom run a larger public-reception / MCP backtest now, or do one more target refinement first?
5. If MCP is still premature, what exact CLI / JSON / report surface must stabilize first?
6. What should Axiom absolutely not build yet?

Return:

1. Executive verdict.
2. Stakeholder reaction map.
3. Evidence that strengthens Axiom's differentiation.
4. Remaining "just a linter" rejection pattern.
5. Recommended next refinement.
6. MCP timing recommendation.
7. Decision: larger backtest now, one more target refinement, or hold.
8. What not to overclaim.
