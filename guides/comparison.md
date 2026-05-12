# Comparison And Boundaries

Axiom should be judged against existing architecture tools, not sheltered from them.

The short version: Axiom is not trying to be a better ESLint, a replacement for Dependency Cruiser, or a semantic code oracle. Its first useful category is architecture observability with explicit contracts:

```text
declared architecture intent + observed source graph -> violations, visible debt, warnings, and drift
```

Use Axiom when the important question is not only "is this import syntactically allowed?" but "does this change preserve the architecture intent the team agreed to, and is any temporary exception visible enough to review?"

## What Axiom Adds

Axiom's product bet is that AI-era repositories need a small layer that keeps architecture intent close to code and readable by humans, CI, dashboards, and agents.

It adds:

- `.axi` as declared intent, not inferred truth.
- A declared graph compared with the observed import graph.
- Hard failures for explicit, high-confidence rules such as forbidden dependencies, layer breaches, hidden imports, and unexposed imports.
- `axi observe` for architecture attention without turning every signal into a gate.
- Time-bounded intentional violations that stay visible as accepted debt.
- Advisory warnings for known pressure points such as broad public barrels, unresolved internal-looking imports, deep internal imports, and coupling concentration.
- Baseline drift output that shows how observed module edges changed since a saved graph.
- Markdown and JSON outputs designed for PR review, CI annotations, dashboards, and future agent repair loops.

The key difference is not a stronger import parser. The key difference is the workflow around declared intent, accepted tradeoffs, drift, and agent-readable review context.

If you are building that workflow into CI annotations, PR comments, dashboards, or agent integrations, start with [Pilot Workflow](pilot-workflow.md), [GitHub Actions And PR Summaries](github-actions.md), and [JSON Consumers](json-consumers.md). The integration should use `axi check --json` for hard gates and `axi observe` or `axi graph` output for review context.

## Tool Boundary Matrix

| Tool family | Best at | Axiom should not pretend to replace | Where Axiom can complement |
| --- | --- | --- | --- |
| ESLint and import rules | Local style, syntax, import hygiene, common code-quality rules | ESLint's ecosystem, editor integration, autofixes, and language-specific rule depth | Add repo-level architecture intent, visible accepted debt, baseline drift, and `axi observe` review summaries |
| Dependency Cruiser | Rich dependency graph rules for JavaScript/TypeScript projects | Mature dependency graph analysis, rule presets, and graph exploration | Make architecture intent explicit in `.axi`, connect violations with intentional debt and drift, and provide a contract shape agents can negotiate with |
| Nx boundaries | Workspace/project graph boundaries, tags, affected builds, monorepo workflows | Nx's build graph, task orchestration, caching, and workspace-native constraints | Add package or module contracts for repos that are not all-in on Nx, plus visible exceptions and advisory architecture pressure signals |
| CodeQL | Security and correctness queries over code semantics | Vulnerability detection, dataflow analysis, and deep semantic query capability | Keep architecture intent separate from security analysis; use Axiom for declared boundaries and CodeQL for semantic security/correctness checks |
| Code-health audits | Large files, broad fan-out, scattered conventions, maintenance hot spots | Repository-specific quality heuristics and broad maintainability dashboards | Turn suspected pressure into declared boundaries, then show exact observed edges, file locations, visible debt, and drift |
| Custom scripts | Highly tailored one-off repository policy | Maximum flexibility for project-specific checks | Replace ad hoc policy text with a small contract language, stable diagnostics, and review output that multiple consumers can share |

## Axiom Versus Dependency Cruiser

The most important objection is fair: many teams already have dependency graph tools.

Axiom should not claim that its scanner is categorically better than Dependency Cruiser. Instead, the distinction should be tested around product workflow:

- Does the architecture intent live in a compact contract that humans and agents can read?
- Can temporary violations be accepted without disappearing into a hidden allowlist?
- Can PRs show hard violations, visible debt, advisory warnings, and drift in one review artifact?
- Can a future repair agent understand whether it should fix code, ask to update `.axi`, or leave accepted debt alone until its deadline?
- Can teams start with `axi infer` and then tighten only the boundaries that matter?

If a project only needs import graph rules and already has a comfortable Dependency Cruiser setup, Axiom may not be necessary. If the pain is architecture drift, accepted tradeoffs, AI-generated boundary breaches, and reviewable evolution over time, Axiom has a different job.

## Where Existing Tools Are Better Today

Axiom v0 is intentionally narrow. Existing tools are stronger in several areas:

- ESLint is better for editor-time feedback, style, syntax, and broad rule ecosystems.
- Dependency Cruiser is more mature for dependency graph exploration and JavaScript dependency policies.
- Nx is better when the repository already depends on Nx project graph, affected builds, caching, and tags.
- CodeQL is much stronger for security, dataflow, and semantic correctness queries.
- Custom scripts can encode project-specific runtime conventions faster than Axiom can generalize them.

Axiom should integrate with these tools, not compete with all of them at once.

## Known Axiom Weak Spots

Axiom should stay honest about these limits:

- It does not fully implement TypeScript or Node module resolution.
- It does not observe non-literal runtime wiring such as string-based dependency injection, plugin registries, generated imports, or `eval`.
- It cannot prove symbol-level API health. A broad `index.ts`, facade, or wrapper can still hide unhealthy coupling even though Axiom catches direct and local import-then-export leaks from hidden paths.
- It has only early synthetic performance smoke evidence, not broad production monorepo proof.
- `.axi` authoring still costs attention. `axi infer` lowers the starting cost but does not decide architecture for the team.
- Advisory signals such as coupling concentration can be useful pressure maps, but they are not proof that a module is badly designed.

These are not footnotes. They are product boundaries. Axiom earns trust by showing what it can observe, naming what it cannot observe, and keeping hard gates limited to explicit contract facts.

## Evidence To Collect In Pilots

The comparison should move from positioning to evidence. Useful pilot measurements include:

- `axi check` duration in local development and CI.
- Source files, imports scanned, and observed module edges.
- Number of hard violations with a clear repair path.
- Number of intentional violations, their age, and whether any are expired or unused.
- Number of advisory warnings reviewed versus ignored.
- Whether `axi infer` produced a draft that reduced first-contract writing time.
- Whether `axi observe --markdown` made PR review clearer or noisier.
- Whether baseline drift caught surprising architecture changes in agent-generated edits.
- Whether JSON or Markdown output produced useful CI annotations, dashboards, or agent repair-loop context.
- False-positive rate for hard violations and advisory warnings separately.

Hard violations should be held to a higher bar than warnings. A noisy warning can be tuned or left opt-in. A noisy hard gate teaches teams and agents to work around the tool.

## Recommended Stack

For a TypeScript monorepo, a conservative stack might look like:

```text
TypeScript      -> type correctness
ESLint          -> code hygiene and editor-time feedback
tests           -> behavior
CodeQL          -> security and semantic query coverage
Nx/Turbo/etc.   -> workspace builds and affected tasks
Axiom           -> declared architecture intent, visible debt, advisory drift
```

The important separation is:

- Use `axi check` when the contract is explicit enough to fail CI.
- Use `axi observe` when the signal is useful architecture attention but not a blocker.
- Use other tools for problems Axiom does not model.

## Decision Rule

Choose Axiom when your team needs one or more of these:

- Architecture intent that lives beside code and can be reviewed.
- A declared graph compared with actual imports.
- Time-bounded accepted debt instead of hidden allowlists.
- PR or agent review summaries that separate hard violations from advisory drift.
- A path from observation to enforcement without pretending the tool is omniscient.

Do not choose Axiom as a replacement for type checking, linting, testing, security analysis, or all-purpose static analysis.

The product promise is narrower and stronger:

> Code can be locally correct while globally collapsing. Axiom makes that system drift visible, and enforces only the parts of architecture intent that are explicit enough to trust.
