# Axiom Forecast Seed

## Product Snapshot

Axiom is an architecture observability layer with enforceable contracts for AI-era codebases.

It reads `.axi` architecture contracts, scans real TypeScript and JavaScript imports, compares declared architecture intent with the observed source graph, and reports:

- hard violations
- intentional violations accepted by contract
- advisory warnings

Axiom is not a prompt wrapper. The validator loop is the trusted sensor and braking system behind the observability layer:

```text
.axi contract + source scanner -> declared graph vs observed graph -> diagnostics
```

The product thesis is:

```text
Code can be locally correct while globally collapsing.
```

Axiom's job is to make architecture drift, accepted debt, and entropy accumulation visible before they become normal, then enforce only the high-confidence parts of the contract.

Public repo:

```text
https://github.com/fatelvx/axiom
current master after the axi observe / observability positioning update
```

## Current CLI

```bash
axi check --root .
axi observe --root .
axi observe --root . --warn-public-api-surface
axi observe --root . --warn-coupling-concentration
axi graph --root .
axi graph --root . --attention
axi infer --root .
```

Current supported checks include:

- module ownership with `path`
- allowed dependencies with `depends on`
- forbidden module edges with `forbids module`
- layer direction with `layers Core -> UI`
- public/private module surfaces with `exposes` and `hides`
- direct hidden-path re-exports through `hidden_reexport`
- gradual ownership adoption with loose mode, `--warn-unowned`, and `--strict`
- intentional violations with `accepts ... until ... because ...`
- warning guardrails for expiring and unused intentional violations
- `axi observe` as the product-facing architecture attention surface
- opt-in public API surface warnings for broad exposed barrels
- opt-in coupling concentration warnings for high observed module fan-in or fan-out
- JSON output for CI and agents
- starter contract inference with `axi infer`

## Product Direction

Axiom should not start as a fully automatic architecture guardian. That would be too rigid and noisy.

Near-term product shape:

- architecture observability with enforceable contracts
- dependency direction tracking
- module boundary warnings
- semantic ownership mapping through `.axi`
- visible architecture drift
- intentional violations that stay conspicuous
- hard failures only for explicit, high-confidence contracts

Product boundary:

```text
Observe first, negotiate accepted tradeoffs, enforce only high-confidence intent.
```

Long-term thesis:

AI coding agents can modify many files quickly, so architecture decay accelerates. Axiom gives humans and agents a shared, machine-checkable contract for architecture intent and an observability surface for system evolution.

## Core Risk

The hardest problem is not scanning code. The hardest problem is representing architecture intent.

If representation is poor, the tool becomes:

- too rigid
- too noisy
- full of false positives
- expensive to maintain
- easy for teams to disable

The product must balance constraint and flexibility.

## Known Limitations

Axiom v0 does not fully observe:

- runtime-only dependency paths
- string-based dependency injection
- plugin registries
- generated imports
- reflection-like patterns
- `eval`
- non-TypeScript/JavaScript code
- semantic coupling hidden behind broad public APIs

Axiom can catch direct hidden-path re-exports, but it cannot prove symbol-level API health.

## Competitive Context

Relevant comparison set:

- ESLint architecture rules
- Dependency Cruiser
- Nx module boundaries
- ArchUnit
- Bazel query
- CodeQL
- custom CI scripts

Axiom must not be perceived as "Dependency Cruiser with new syntax." Its differentiation should be:

- architecture intent as first-class contract
- declared graph vs observed graph
- visible accepted debt
- warning-to-error adoption path
- agent-readable diagnostics
- future architecture drift scoring

## Adoption Hypotheses

Likely first users:

- AI coding tool builders
- teams using AI agents in monorepos
- startup CTOs worried about fast architecture drift
- maintainers of complex frontend/backend apps
- enterprise architecture teams experimenting with AI code generation

Likely objections:

- "This is just linting."
- "Manual `.axi` files will rot."
- "Static imports miss too much."
- "CI scan time will hurt."
- "AI agents will game the rules."
- "Architecture cannot be reduced to import graphs."

## Product Questions For Simulation

Ask the simulated society to forecast:

1. Who understands Axiom fastest, and why?
2. Who dismisses Axiom, and what phrase triggers the dismissal?
3. Which positioning works better: architecture observability layer, architecture compiler, AI codebase guardrail, or CI architecture validator?
4. Does intentional violation visibility increase adoption, or does it look like bureaucracy?
5. Is `axi infer` enough to reduce `.axi` authoring cost?
6. What is the first killer workflow?
7. What is the strongest criticism from senior engineers?
8. What should be built next to avoid becoming a noisy linter?
9. What should not be built yet?
10. What README/GitHub page changes would increase trust in the first 30 seconds?

## Desired Output

The forecast should produce:

- predicted user segments
- adoption drivers
- adoption blockers
- likely misunderstandings
- messaging changes
- feature priority changes
- evidence users would demand
- concrete roadmap recommendations
- kill criteria for weak product directions
