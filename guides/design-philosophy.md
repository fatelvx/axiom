# Design Philosophy

Axiom exists because architecture can decay faster than humans can keep the whole system in their heads.

AI did not create this problem. It accelerated it. Humans also make locally reasonable code changes that slowly turn clear boundaries into accidental coupling. The difference in AI-era codebases is speed: an agent can touch enough files in one session that architectural drift becomes a daily event instead of a quarterly surprise.

The guiding sentence is:

```text
Code can be locally correct while globally collapsing.
```

## Product Shape

Axiom is an architecture observability layer with explicit contracts.

It is not trying to be:

- a complete architecture oracle
- a semantic code understanding engine
- a prompt wrapper
- a replacement for ESLint, Dependency Cruiser, Nx, CodeQL, tests, or review
- a tool that fails CI for every suspicious shape

It is trying to make declared architecture intent, observed source imports, visible debt, advisory drift, and high-confidence contract breaks share one reviewable workflow.

The practical loop is:

```text
.axi contract -> declared graph
source imports -> observed graph
Axiom compares both -> hard violations, visible debt, warnings, and drift
```

## Observe First

Axiom should make drift visible before it tries to stop every drift.

Hard gates are valuable only when the rule is explicit, machine-checkable, and low-noise. Otherwise the tool becomes a noisy linter that teams learn to ignore or disable.

The product boundary is:

```text
Observe first, negotiate accepted tradeoffs, enforce only high-confidence intent.
```

This is why `axi observe` exists beside `axi check`.

- `axi check` is the gate for explicit contract violations.
- `axi observe` is the attention surface for hard violations, visible debt, advisory signals, and optional drift.
- `axi graph` is the inspection view for declared and observed structure.
- `axi infer` lowers adoption cost by reflecting the current graph, but it does not decide the desired architecture.

## Explicit Intent, Not Inferred Truth

`.axi` is declared intent. It is not omniscient truth about a repository.

`axi infer` can generate a useful starter contract, but the generated shape is only a mirror of today's source graph. A human still needs to decide which edges are intended, which are legacy, which should become visible accepted debt, and which should become hard violations.

This distinction matters because a large project can have hundreds of modules. If `.axi` becomes a second noisy codebase to maintain, it loses. Contracts should start small, cover high-value boundaries first, and grow only when the signal stays useful.

## Visible Debt

Intentional violations are useful only when they stay conspicuous.

Axiom avoids hidden allowlists as a product principle. Accepted debt should be:

- declared in `.axi`
- tied to a violation code and target module
- time-bounded with an expiration date
- explained with a reason
- visible in human, JSON, graph, observe, and Markdown output

This lets humans and agents communicate with the architecture contract. A violation can be blocked, accepted temporarily, or reviewed as advisory pressure, but it should not disappear into a private ignore file.

Axiom should not automatically turn first-run failures into accepted debt. A blanket "adopt everything" command would reduce onboarding friction, but it would also normalize unreviewed architecture debt and weaken the trust model. If Axiom ever adds a stronger adoption helper, it should preserve the same rule: accepted debt must be conspicuous, reviewed, time-bounded, and explained.

## Warning Signals

Advisory signals are not proof that code is wrong.

They are early surfaces for architecture pressure:

- `broad_public_surface`: an exposed file uses `export *` or `export * as`.
- `public_entrypoint_coupling`: an exposed entry point reaches many same-module internal files.
- `deep_internal_import`: a module bypasses another module's likely `index.*` entry point.
- `coupling_concentration`: a module has high observed fan-in or fan-out.
- `unresolved_import`: Axiom can see a static internal-looking import but cannot resolve it into the observed graph.
- `dynamic_dependency_expression`: Axiom can see a non-literal `import()` / `require()` or Python `importlib.import_module()` / `__import__()` expression but cannot turn it into an observed graph edge.
- `large_module_file`: a source file is large enough that responsibilities may be concentrated inside one file, outside the import graph.

These signals belong in review, PR comments, dashboards, and future agent repair loops. They should not become default CI failures unless a team deliberately converts a repeated pattern into an explicit contract.

## Known Limits

Axiom should be honest about what v0 does not prove.

It does not fully observe:

- string-based dependency injection
- runtime plugin registries
- generated import paths
- non-literal dynamic imports and runtime Python import expressions
- `eval`
- framework conventions that do not appear as static source imports

It also does not prove full symbol-level API health. A public `index.ts` can make consumers look compliant while becoming an accidental facade. Axiom can catch direct hidden re-exports, local import-then-export leaks, broad barrels, entrypoint coupling, and deep internal imports, but it still cannot prove that every exported symbol is a good public API.

A quiet import graph also does not prove that responsibilities inside a file are healthy. Large-file warnings exist to keep that caveat visible in few-file repositories, but they are review prompts, not a complexity score or a refactor command.

The right response is not to overclaim. The right response is to surface reliable proxy signals, document the remaining gap, and collect real-project evidence before adding more rules.

## Research Discipline

Synthetic forecasts, backtests, and real-project smokes are risk maps, not action scripts.

Use them to find pressure points:

- Will developers read this as another linter?
- Will CI owners trust the scan cost?
- Will static-analysis blind spots undermine confidence?
- Will `.axi` maintenance become more expensive than the drift it prevents?
- Will agents optimize for passing rules while preserving bad coupling?

Do not blindly implement every simulated recommendation. Before changing the product, ask:

1. Is this a reliable machine-checkable fact, or only an advisory signal?
2. Will surfacing it help real adopters act sooner?
3. Does it preserve the core difference: explicit intent, visible accepted debt, and high-confidence gates?

Keep the public README and user guides product-facing. They should summarize stable lessons and practical workflows, not read like a model-to-maintainer report from a specific experiment run. Run logs, raw critiques, and simulation details belong under `experiments/` with clear caveats.

## What To Protect

Protect these invariants:

- The validator remains the trusted sensor and brake.
- Observability stays separate from hard enforcement.
- `.axi` stays small, line-oriented, and reviewable.
- Accepted debt stays visible and time-bounded.
- Advisory signals stay opt-in until real evidence proves their signal-to-noise ratio.
- Public claims stay narrower than the implementation.

The long-term ambition can be a repository cognition layer. The near-term discipline is simpler: preserve coherent evolution by making architecture drift visible, reviewable, and enforceable only where the contract is clear.
