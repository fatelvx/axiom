# 10-Minute Pilot Card

Use this card when you want to try Axiom on a real project without committing a contract to that repository yet.

The goal is not to pass or fail the project. The goal is to answer:

```text
What does the current dependency shape look like, and which boundaries deserve review?
```

## Three Commands

From a separate workspace folder:

```bash
mkdir -p contracts
axi infer --root ../target-app \
  --include "src/**" \
  --exclude "src/**/*.test.ts,src/**/*.test.tsx,src/**/*.spec.ts,src/**/*.spec.tsx,src/**/__tests__/**" \
  --group-depth 2 > contracts/target-app.inferred.axi
```

Then read the current architecture attention surface:

```bash
axi observe --root ../target-app \
  --spec contracts/target-app.inferred.axi \
  --markdown \
  --warn-coupling-concentration \
  --warn-deep-internal-imports
```

Then render the graph:

```bash
axi graph --root ../target-app \
  --spec contracts/target-app.inferred.axi \
  --mermaid \
  --warn-coupling-concentration \
  --warn-deep-internal-imports
```

The inferred contract mirrors the current graph. It is not maintainer-declared architecture. Before using it as intent, rename modules, inspect inferred dependency evidence comments, and delete or split anything that does not match how the project should evolve.

Before reading individual `depends on` edges, read the first comments in the generated draft. `axi infer` prints a snapshot notice, an authoring checklist, and suggested next commands at the top of the file because that draft is evidence for review, not a contract to commit unchanged.

If inference collapses a cycle, keep that section with the pilot notes. Once the groups are merged into one starter module, graph and diff output will not show the internal edges anymore; the cycle path samples and cycle-breaking candidates are the review evidence.

When comparing Markdown and Mermaid output, use the same `--warn-*` flags. Warning counts only include checks enabled for that command, so a plain graph command can honestly show `warnings=0` while an observe command with warning flags reports advisory pressure.

On Windows PowerShell, `>` may save redirected JSON or Markdown as UTF-16LE. Axiom reads PowerShell-created `.axi` specs and graph baselines, but UTF-8 is easier to share with other tools:

```powershell
axi graph --root ../target-app --spec contracts/target-app.inferred.axi --json |
  Out-File -Encoding utf8 axiom-baseline.json
```

## Look At These First

1. Hard signals: any `violations`, visible intentional debt, warnings, or drift.
2. Graph center: which module has the highest observed import pressure.
3. Shape fit: whether the central modules and deep imports match the architecture the maintainer expected.

If the graph is quiet, still ask whether the center and scope are right before saving a baseline.

## Do Not Panic When

- `axi infer` collapses a large cycle. It is showing that the current source graph is tangled, not saying the code is broken.
- The first inferred module names are awkward. Rename them into the team's vocabulary before treating the contract as intent.
- Advisory warnings appear. They are review prompts and do not fail `axi observe`.
- Focused output says it is showing `0` dependency edges while warnings are present. That means the attention view did not need to show any dependency edge; the full observed graph count still tells you how much import graph was scanned.
- The graph center is a shared module. Shared modules can be healthy when they have a clear public surface.
- `no_spec_files` appears. That means Axiom needs a contract path or `--spec`; it is not a codebase judgment.

## Fix Or Review When

- A hard violation breaks a contract that the team actually believes.
- A module with an `index.*` entry point has many cross-module deep imports into non-entry files.
- A deep-import warning says the entry point is ambiguous or has no same-source-group entry point. That often means the inferred module is too broad, especially around collapsed cycles.
- A public entry point starts exporting unrelated internals just to make callers look compliant.
- A module becomes the graph center but the team expected it to be a leaf or adapter.
- Visible accepted debt is close to expiration, unused, or no longer has a convincing reason.

## Save A Baseline When The Shape Is Useful

Once the contract scope is worth tracking:

```bash
axi graph --root ../target-app --spec contracts/target-app.inferred.axi --json > axiom-baseline.json
axi diff axiom-baseline.json --root ../target-app --spec contracts/target-app.inferred.axi --markdown
```

Use the baseline to review architecture drift over time. Keep it advisory until the team has a small, explicit contract that is safe to gate.

## Agent Instruction

When handing Axiom output to an AI coding agent, use wording like this:

```text
Use hard Axiom violations as required fixes.
Treat visible debt as an accepted tradeoff with a deadline.
Treat advisory warnings as review prompts.
Do not move code only to make the directory look compliant.
If the architecture intentionally changed, explain whether the .axi contract or graph baseline should be updated.
```

This keeps the agent in conversation with the architecture contract instead of optimizing only for a passing command.
