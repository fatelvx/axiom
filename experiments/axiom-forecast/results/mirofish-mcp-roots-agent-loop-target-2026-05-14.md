# MiroFish Targeted Backtest: MCP Roots And Agent Loop

Created: `2026-05-14T15:38:53.7112622+00:00`

Seed: `experiments/axiom-forecast/seed-mcp-roots-agent-loop-target-2026-05-14.md`

Method: direct MiroFish-style targeted synthetic backtest using a compact prompt derived from the seed and the local MiroFish model configuration through its OpenAI-compatible endpoint. This was not a full OASIS social simulation and is not real user research.

Note: the full seed exceeded the direct endpoint body limit on this local route during the first attempt, and PowerShell UTF-8 BOM handling caused one request parse failure. The retained result uses a compact prompt with the same decision facts. The generated output below was lightly normalized to remove local encoding artifacts while preserving the risk-map substance.

## Executive Forecast

Short term, `axiom_roots` meaningfully improves MCP trust because it turns a confusing failed scan into inspectable root policy. It does not remove setup friction: users still need to register explicit roots, and agents still need to call `axiom_roots` before picking a scan root.

Medium term, the read-only MCP surface can become a credible architecture evidence layer for agents if it keeps the same split as the CLI: `axiom_check` is the gate, while observe / graph / diff / infer are review or authoring evidence. Competitors may create flashier auto-fix flows, but Axiom's advantage is the visible evidence trail and refusal to mutate intent automatically.

The main remaining risk is agent overreach. Agents may still treat inferred contracts as architecture intent, overwrite baselines during review, or summarize raw graph JSON incorrectly unless the expected tool-consumption behavior is specified and tested.

## Stakeholder Reactions

Maintainers will like that `axiom_roots` closes the Lumina-style root-policy confusion, but will worry that MCP setup still depends on manual re-registration when a new repo needs access.

Platform engineers will accept explicit roots for a few repositories, but teams with many services will want a central, reviewable root configuration pattern that stays narrower than home-directory or drive-level access.

AI tooling builders will ask for compact results because raw graph and warning payloads can consume too much context. They will also want client templates that clearly say `axiom_infer_contract` is current-graph evidence, not declared intent.

Security reviewers will strongly prefer the current read-only posture. They will resist broad roots, write-capable MCP tools, auto-accepted debt, and any workflow that sends private architecture graphs to unclear remote systems.

CLI-first engineers will not care much about MCP as long as `axi check` remains stable, fast, and locally understandable.

## MCP Trust And Usability Risks

Root registration is still manual. `axiom_roots` reports the allow list, but it does not add roots or explain exactly how to re-register in a client-specific way. This is acceptable for v0, but repeated cross-repo workflows will need better client setup guidance or templates.

The biggest misuse risk is still `axiom_infer_contract`. The tool says inference is authoring evidence, but agents may present inferred contracts as the desired architecture unless prompts, docs, and tests reinforce the distinction.

The temp-only agent-loop smoke proves tool shape and evidence flow, not agent judgment. It verifies `roots -> check -> graph baseline -> deliberate drift -> check / observe / diff / infer`, but it does not prove an LLM will explain results correctly under ambiguous prompts.

The root policy itself should stay strict. Broad `--allow-root` patterns would be an obvious security regression and would make MCP easier to misuse.

## Workflow Readiness Assessment

The MCP v0 surface is functionally complete enough for controlled local use. The next work should be workflow polish, not new enforcement semantics.

In-memory infer-then-observe is a plausible next step because it can reduce temp-file friction without becoming a write tool. It should still be designed carefully: inference remains hypothetical current-graph evidence, and observe remains review context.

Compact result modes or agent-focused summaries are likely needed for large repositories. `structuredContent.summary` already helps, so the next step should be to test whether real agents can work from summary plus targeted payload slices before adding a separate truncation mode.

Client templates and conformance prompts are high leverage. Every client should learn the same rules: call `axiom_roots` first, use `axiom_check` for gates, never update baselines during review, never add accepted debt without human approval, and never treat inference as intent.

## Dynamic / Python Timing Assessment

Starting dynamic or Python support now would split focus too early. The TypeScript/JavaScript validator and MCP evidence loop are just becoming coherent; adding another language would multiply scanner, resolver, baseline, and documentation surface area.

Python support is strategically attractive, but it should wait until the MCP loop has survived real TS/JS agent workflows. A half-finished Python path would damage the hard-gate trust story more than it would expand adoption.

Dynamic analysis is even riskier in the short term. It touches runtime behavior, security, and user expectations beyond Axiom's current static evidence model. Keep it as a future capability, not the next implementation lane.

## Recommended Next Action

Create an MCP tool-consumption conformance spec and agent-behavior scenarios.

The spec should define:

- `axiom_roots` is the first call for cross-repo workflows.
- `axiom_check` is the only hard gate.
- `axiom_observe`, `axiom_graph`, and `axiom_diff` are review evidence.
- `axiom_infer_contract` is authoring evidence, not declared architecture intent.
- Agents must not edit `.axi`, update baselines, add `accepts`, or rewrite imports unless the user explicitly approves that implementation work.

The scenarios should test:

- an agent explains a hard violation with exact file and rule evidence;
- an agent handles a root outside the allowed list by asking for re-registration instead of guessing;
- an agent consumes inference without claiming it is the target architecture;
- an agent summarizes advisory drift without turning it into a gate;
- an agent keeps raw payload evidence available behind any compact summary.

This is higher signal than starting Python now because it protects the core agent workflow that every future integration will rely on.

## What Axiom Should Not Do Next

Do not add MCP write tools for baseline updates, contract edits, debt acceptance, or import rewrites.

Do not add hidden suppressions, auto-accepted debt, or broad root permissions.

Do not turn `reviewStory`, warnings, drift, or inference into semantic health scores.

Do not start Python or dynamic analysis unless a dedicated lane can work without pulling attention away from MCP trust and TS/JS validator hardening.

Do not market MCP as a CI gate replacement. It is an agent-native evidence surface over the same local validator.
