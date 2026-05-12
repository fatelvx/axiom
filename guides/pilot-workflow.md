# Pilot Workflow

Axiom is most useful in a pilot when it starts as architecture observability, not as a new CI gate.

The goal is to answer a sharper question than ordinary code-health audits can answer:

```text
Which intended boundaries are drifting, and where is the observed code graph crossing them?
```

Code-health audits are still useful. They can point at large files, high fan-out, scattered storage keys, or other pressure points. Axiom complements that by turning an intended boundary into a contract and showing the exact imports, files, lines, warnings, and accepted debt around that boundary.

## 1. Start Outside The Target Repo

When a living project is not ready to adopt Axiom formally, keep the first contract outside the repo:

```bash
axi infer --root ../target-app --group-depth 2 > contracts/target-app.inferred.axi
```

Review the inferred draft. Do not treat it as architecture truth. It mirrors today's graph, including messy cycles, and the generated output labels itself as a current-graph snapshot rather than recommended architecture.

Useful inference signals:

- Collapsed cycle groups show modules that are not cleanly separated yet.
- Collapsed cycle comments include the source groups and observed internal edges that made inference merge them.
- Broad groups show where the first contract may need better names.
- Existing observed edges show what the current system already depends on.

## 2. Draft A Small Advisory Contract

Create a smaller reviewed contract beside the target repo:

```text
contracts/target-app.axi
```

Start with only one or two high-value boundaries. For example:

```axi
module UI
path "src/components/**"
path "src/hooks/**"
depends on Services

module Services
path "src/services/**"
exposes "src/services/index.ts"
```

The paths still point into `--root`; the contract file can live anywhere.

## 3. Observe Before Gating

Run the first scans as review output:

```bash
axi observe --root ../target-app --spec contracts/target-app.axi --markdown \
  --warn-unowned \
  --warn-unresolved-imports \
  --warn-coupling-concentration \
  --warn-deep-internal-imports
```

Read the result in layers:

- Hard violations: contract facts that are already explicit.
- Visible intentional debt: accepted violations with expiration dates and reasons.
- Advisory warnings: useful pressure signals that should not block adoption yet.
- Observed dependency counts: whether the contract is seeing enough of the codebase to be meaningful.

If a strict contract produces many violations on day one, that is not failure. It means the project is not ready to gate that boundary yet. Keep using `axi observe`, tighten the public surface gradually, and promote only low-noise facts into `axi check`.

## 4. Separate Health Audits From Boundary Drift

A pilot should keep these outputs separate:

| Signal | Typical source | What it tells you |
| --- | --- | --- |
| Large files, broad fan-out, scattered keys | Code-health audit | Where code may be hard to maintain |
| Cycle groups from `axi infer` | Axiom inference | Which folders are already tangled |
| Deep internal imports | `axi observe --warn-deep-internal-imports` | Which modules bypass likely public entry points |
| Broad public barrels or facade entry points | Advanced `axi observe --warn-public-api-surface` probe | Where a declared public entry point may be growing facade pressure |
| New observed edges | `axi observe --baseline` | Which architecture relationships changed |
| Visual dependency graph | `axi graph --mermaid` | How module dependencies look at a glance |
| Hard violations | `axi check` | Which explicit contract facts were broken |

This distinction matters. Axiom should not become a generic "bad code" dashboard. Its stronger job is declared intent versus observed graph.

When the discussion needs a picture instead of a text list, render the observed module graph:

```bash
axi graph --root ../target-app --spec contracts/target-app.axi --mermaid
axi observe --root ../target-app --spec contracts/target-app.axi --mermaid
```

The Mermaid output is a review artifact. It does not change what `axi check` enforces.

## 5. Add Baseline Drift

Once the external contract is useful, save an unfiltered graph:

```bash
axi graph --root ../target-app --spec contracts/target-app.axi --json > axiom-baseline.json
```

Then compare later edits:

```bash
axi observe --root ../target-app --spec contracts/target-app.axi \
  --baseline axiom-baseline.json --markdown
```

This shows new and removed observed module edges. It is advisory review context, not a gate.

## 6. Use Public-Surface Probes Carefully

Use `--warn-public-api-surface` only when the pilot question is specifically about declared public entry points:

```bash
axi observe --root ../target-app --spec contracts/target-app.axi --markdown \
  --warn-public-api-surface
```

This is an advanced calibration lens, not a default first scan. It requires active `exposes` rules and reports visible facade pressure: broad barrels or exposed entry points that reach many same-module internal files. A high count is not an architecture verdict. Some entry points, such as locale or icon aggregators, are intentionally broad. Treat the warning as a question for review: refactor, document, or accept that the public surface is intentionally wide.

## 7. Let Agents Use The Report

For AI-assisted repositories, give the agent the same contract and review output a human would use:

```bash
axi observe --root ../target-app --spec contracts/target-app.axi --markdown
```

The useful agent instruction is not "make Axiom pass at all costs." It is:

```text
Use hard violations as required fixes.
Treat visible debt as existing accepted tradeoff.
Treat advisory warnings as review prompts.
If the code intentionally changes architecture, explain whether the contract should change.
```

That keeps the agent from hiding bad architecture behind compliant folders or broad barrels.

## 8. Promote Slowly

Move from external pilot to in-repo adoption when these are true:

- The scan is fast enough for local or PR use.
- The contract covers a boundary the team actually cares about.
- Hard violations are low-noise and clearly repairable.
- Advisory warnings are useful enough to discuss without blocking merges.
- The team understands that `axi observe` is review context and `axi check` is the gate.
- Temporary exceptions are expressed as visible intentional violations, not hidden allowlists.

Only then move the reviewed contract into the target repo and add CI.

## Minimal Pilot Commands

```bash
axi infer --root ../target-app --group-depth 2 > contracts/target-app.inferred.axi
axi graph --root ../target-app --spec contracts/target-app.axi --mermaid
axi observe --root ../target-app --spec contracts/target-app.axi --markdown --warn-deep-internal-imports
axi check --root ../target-app --spec contracts/target-app.axi
```

Use `axi check` only when the contract is explicit enough to fail confidently.
