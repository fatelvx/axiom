# Targeted MiroFish Backtest Seed: Inference Onboarding Feedback

Date: 2026-05-13

Status: targeted synthetic forecast seed, not real user research.

## Current Axiom Snapshot

Axiom is an architecture observability layer with explicit contracts for AI-era codebases.

The current product model is:

- `axi check`: hard gate for explicit, high-confidence `.axi` violations.
- `axi observe`: review/PR/agent attention surface for hard violations, visible intentional debt, advisory warnings, and drift.
- `axi infer`: onboarding aid that mirrors the current graph and suggests a starter contract. It does not decide architecture intent for the user.
- `--spec <path>`: external pilot contracts so teams can scan a repository before writing `.axi` into it.

Axiom should not claim to be a complete architecture oracle. It should make architecture drift, accepted debt, and system entropy visible, and enforce only when the machine-checkable representation is reliable.

## Recent Product Change Under Test

Commit under test:

```text
2d95910 Improve inference onboarding feedback
```

The change was made after Lumina-side feedback from a real pilot-style scan:

1. When scanning a repository with no `.axi` spec, Axiom previously only returned `no_spec_files`. That was technically correct but not helpful for a new user.
2. `axi infer` could collapse a large strongly connected component into an unreadable generated module name such as:

```text
ServicesServicesAgentLoopServicesMemoryServicesMultiagentServicesSandboxServicesToolsStore
```

This was useful architecture signal, but too analyzer-like and not enough like an architecture consultant.

## Implemented Change

### No-spec onboarding

`no_spec_files` now includes a concrete next-step suggestion:

```text
Run `axi infer --root . > axiom/main.axi` from the project root to create a starter contract,
or pass an external pilot contract with `--spec <path-to-contract.axi>`.
```

### Collapsed cycle inference output

Long collapsed cycle names now use a readable dominant-name style such as:

```text
ServicesCycle
```

The text output now includes:

```text
# collapsed cycle: ServicesCycle
# includes: ServicesAgentLoop, ServicesMemory, ServicesTools, Store
# observed internal edges:
# - ServicesAgentLoop -> ServicesMemory (1)
# - ServicesMemory -> ServicesTools (1)
# - ServicesTools -> Store (1)
# - Store -> ServicesAgentLoop (1)
# reason: inferred groups form a circular dependency, so this starter contract keeps them together.
# review: rename this merged module after deciding whether the cycle should be split.

module ServicesCycle
path "src/services/agentLoop/**"
path "src/services/memory/**"
path "src/services/tools/**"
path "src/store/**"
```

JSON output also includes `collapsedCycles[].internalDependencies[]` with `fromGroup`, `toGroup`, `count`, and import `samples`.

## Verification

The implementation passed:

```text
npm run alpha:check
```

including:

- full test suite: 149 tests
- Axiom self-contract check
- GitHub Actions smoke
- npm pack dry run

## Backtest Question

Evaluate whether this change meaningfully reduces pilot friction and whether it makes `axi infer` feel more like architecture observability rather than a raw dependency analyzer.

Please answer as a MiroFish-style synthetic risk map. Do not treat this as real user research. Do not recommend broad new enforcement semantics. Focus on adoption, comprehension, and whether this is enough to proceed toward another larger backtest or whether a smaller product hole remains.

## Stakeholders To Simulate

1. Senior TypeScript application engineer trying Axiom on a large AI-assisted app.
2. Monorepo platform engineer reviewing CI/pilot adoption.
3. AI agent workflow maintainer who wants agents to read architecture feedback.
4. Skeptical Dependency Cruiser / ESLint user.
5. Small React/Pixi game developer using AI agents.
6. Open-source contributor reading the README and trying `axi infer` first.

## Questions To Answer

1. Does the new `no_spec_files` suggestion reduce the "I ran it and hit a dead end" problem?
2. Does `ServicesCycle` plus included groups and internal edges make collapsed cycles understandable enough for a pilot user?
3. Is the output still too analyzer-like, or does it now feel like useful architecture feedback?
4. Does this strengthen Axiom's differentiation from generic dependency graph tools?
5. What misunderstanding or rejection pattern remains most likely?
6. Should Axiom now run a larger backtest, or do one more small implementation/doc refinement first?
7. What exact next step would have the highest signal-to-noise ratio?

## Required Output Format

Use concise English. Return these sections:

1. Executive verdict.
2. Stakeholder reaction map.
3. Strongest adoption improvement.
4. Remaining rejection pattern.
5. Decision: proceed to larger backtest, run one more small refinement, or hold.
6. Recommended next step.
7. What not to overclaim.
