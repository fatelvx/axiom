# Read The Graph

Axiom graphs are meant to lower the cost of architecture review. They do not prove that a codebase is healthy, and they are not a replacement for maintainers knowing their system.

Use the graph as a map of declared intent versus observed imports:

```text
.axi contract -> declared graph
source imports -> observed graph
differences -> violations, visible debt, warnings, and drift
```

## The First Three Questions

Start every graph review with these questions, in this order:

1. Are there hard violations, visible accepted debt, advisory signals, or baseline drift?
2. Which module is the graph center by observed import pressure?
3. Does that shape match the architecture you expected for this repository?

Do not start by asking whether the graph is pretty. A clean-looking diagram can still hide a bad public facade, and a dense graph can be acceptable for a small intentionally integrated package.

## Command Set

For an existing contract:

```bash
axi observe --root . --warn-coupling-concentration --warn-deep-internal-imports
axi observe --root . --warn-large-files
axi graph --root . --mermaid
axi graph --root . --json --portable > axiom-baseline.json
axi diff axiom-baseline.json --root .
```

For an external pilot contract:

```bash
axi observe --root ../target-app --spec contracts/target-app.axi --markdown \
  --warn-coupling-concentration \
  --warn-deep-internal-imports

axi graph --root ../target-app --spec contracts/target-app.axi --mermaid
```

Use `axi check` only when the contract is explicit enough to act as a gate.

## Scenario 1: Failing Contract

Run the intentionally failing example:

```bash
node dist/cli.js observe --root examples/basic-app
```

You should see hard contract signals such as:

```text
unexposed_import
hidden_import
```

Read those before reading the diagram. The graph can show that `UI` imports `Services`, but the diagnostic explains the exact problem: UI is bypassing the declared Services public surface or importing hidden internals.

How to respond:

- If the contract is correct, fix the import site.
- If the import is intentionally allowed, change the contract so the public boundary is honest.
- If the project needs a temporary exception, use a visible `accepts ... until ... because ...` rule with an expiration date and reason.
- If many violations appear on day one, stay in `axi observe` mode instead of turning it into a CI gate.

## Scenario 2: Quiet Graph

A quiet graph means the current scan did not report hard violations, visible debt, advisory signals, or baseline drift under the current scope.

That is useful, but it is not the same as "the architecture is healthy."

Look for:

- Whether the central module is the module you expected to carry the most coupling.
- Whether the scan scope covers the code you meant to review.
- Whether the contract is too broad, for example one giant module that hides every edge.
- Whether important runtime wiring is outside static imports.
- Whether responsibilities are hidden inside a few huge files; use `--warn-large-files` when a project has very few files or a suspiciously quiet import graph.

If the shape matches the intended architecture, save an unfiltered portable baseline:

```bash
axi graph --root . --json --portable > axiom-baseline.json
```

Then compare later changes:

```bash
axi diff axiom-baseline.json --root .
```

## Scenario 3: Advisory Pressure

Advisory signals are review prompts, not proof of bad architecture.

`coupling_concentration` means a module has high observed fan-in or fan-out. That module may be a stable public boundary, or it may be becoming a coordination hub.

`composition_root_pressure` is the entry-point version of that warning in review output. It usually means a likely app entry file such as `src/main.ts`, `src/index.ts`, `App.tsx`, or `bootstrap.ts` imports several modules. That can be normal composition-root wiring. Review whether the entry file is only assembling modules, or whether product logic is accumulating there.

`deep_internal_import` means one module imported another module through a relative non-entry file while the target module appears to have an `index.*` entry point. That may be a public-entry bypass, or it may mean the contract needs a more precise public surface.

`large_module_file` means a source file crossed the current large-file threshold. It does not mean the file is wrong. It means import graph analysis may be missing architecture pressure because too many responsibilities live inside one file.

If Axiom says the entry point is ambiguous, do not blindly rewrite imports to the first `index.ts` it found. Broad inferred modules and collapsed cycles often contain several plausible source groups. Axiom only treats an `index.*` file as likely advice when it is in the same source group as the deep import; an entry point in `services/sandbox` should not be used as advice for a `store` import. Treat ambiguity as a contract-authoring signal: split the module, declare `exposes` / `hides`, or ask the maintainer which entry point is real.

Focused graph views can also say they are showing few or zero dependency edges while warnings are present. That is not a contradiction. The focused view hides clean edges, while warnings can still point at files, public surfaces, unresolved imports, or graph pressure. Use the `full observed dependencies` count to see how much graph data was scanned.

The warning roots near the top of Markdown and human output are deliberately coarse. They are meant to turn a warning flood into review themes such as state/store leakage, tool boundary pressure, ambiguous public boundaries, or coupling hubs before you inspect individual files.

How to respond:

- Inspect the import sites listed in the warning.
- Ask whether the target module has a real public entry point.
- If the deep path is intended public API, declare it with `exposes`.
- If the deep path is private, repair callers to use the entry point.
- If the module is intentionally a hub, document that intent with `purpose` and keep the warning advisory until the boundary is stable.
- If a large-file warning appears, inspect the file's internal responsibilities before splitting it; a large cohesive table or generated adapter may be acceptable, while a mixed engine/controller/store file is a refactor candidate.

## React And Pixi Game Clients

For a React plus Pixi project, the first graph review is usually about whether game runtime code and UI code are drifting together.

Common intended shapes include:

```text
React screens/hooks -> game adapter -> game runtime/core
React screens/hooks -> app services/store
game runtime/core -> shared math/assets/config
```

Common review questions:

- Does game runtime code import React components or hooks?
- Do React components bypass a public game adapter and import deep runtime files?
- Is `utils`, `store`, or `services` becoming the graph center for unrelated reasons?
- Are Pixi-specific details isolated from general game rules?

These are not built-in framework rules. They are examples of intent you can express with modules, `depends on`, `exposes`, and `hides` once the team agrees they matter.

## What Not To Infer

Avoid these readings:

- "No warnings" does not mean "healthy architecture."
- "Quiet graph" does not mean "small responsibilities inside files."
- "High fan-in" does not always mean "bad module."
- "A cycle collapsed by `axi infer`" does not mean "delete the cycle immediately." It means the current source graph cannot be cleanly layered without review.
- "A Mermaid graph exists" does not mean the project has adopted Axiom. Adoption starts when a reviewed contract represents intended architecture.
- "A warning exists" does not mean CI should fail.

Axiom's value is that architecture drift becomes visible early enough to discuss. The graph is the start of the review, not the end of it.
