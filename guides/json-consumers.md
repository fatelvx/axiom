# JSON Consumers

Axiom JSON output is meant for CI annotations, PR comments, dashboards, and agent repair loops.

The project is still in public alpha, so JSON schemas can evolve before 1.0. Consumers should be strict about the signal they depend on and tolerant of fields they do not understand.

For a copyable GitHub Actions workflow that annotates hard violations and writes an architecture summary, see [GitHub Actions And PR Summaries](github-actions.md). For agent and MCP usage, read [Agent And MCP Integration](agent-loop.md) and [MCP Preview](mcp-preview.md). For the shared repository convention behind both surfaces, read [Evidence Artifact Loop](evidence-artifact.md).

MCP `structuredContent.summary` is a routing aid over the same JSON payload, not a separate schema or validation model. If an MCP result includes `summary.counts.setupIssues` and `summary.counts.hardViolations`, use those counts to decide whether a failed check is missing setup evidence or real architecture drift, then inspect `payload.violations[]` for the exact codes and locations.

## Command Families

Each JSON payload starts with a `schemaVersion`:

```text
axiom.check.v4
axiom.graph.v12
axiom.infer.v8
```

Treat the prefix as the command family:

- `axiom.check.*`: validation result. Use this for hard gates.
- `axiom.graph.*`: declared/observed graph and observability result. Use this for inspection, PR comments, drift review, and agent context.
- `axiom.infer.*`: generated starter contract draft. Use this for onboarding and contract authoring, not as a recommendation that the current graph is the desired architecture.

Do not parse one family as another. A graph result is not a check result, even when it contains violations.

## Compatibility Rules

Good consumers should:

- Check `schemaVersion` before reading command-specific fields.
- Ignore unknown top-level and nested fields.
- Prefer feature detection for optional fields such as `drift`.
- Treat arrays as appendable. New violation codes, warning codes, or details fields can appear over time.
- Read paths as project-root-relative unless the field is documented as `root`.
- Fail closed only when a required field for your workflow is missing or has the wrong type.

Avoid this:

```js
const expectedKeys = ["schemaVersion", "root", "summary", "observedDependencies"];
if (Object.keys(payload).join(",") !== expectedKeys.join(",")) {
  throw new Error("Unsupported Axiom output");
}
```

Use this shape instead:

```js
if (typeof payload.schemaVersion !== "string") {
  throw new Error("Missing Axiom schemaVersion");
}

if (!payload.schemaVersion.startsWith("axiom.graph.")) {
  throw new Error(`Expected graph output, got ${payload.schemaVersion}`);
}

const summary = payload.summary ?? {};
const hardViolations = Number(summary.violations ?? 0);
const intentionalDebt = Array.isArray(payload.intentionalDebt) ? payload.intentionalDebt : [];
const warnings = Array.isArray(payload.warnings) ? payload.warnings : [];
```

## Hard Gates

Use `axi check --json` when you want a hard validation gate.

```bash
axi check --root . --json
```

For `axiom.check.*`, the stable gate signal is:

- `ok: true` means no hard violations.
- `ok: false` means the contract failed.
- `violations[]` contains the hard failures.
- `intentionalViolations[]` contains accepted, non-failing contract debt.
- `warnings[]` contains advisory review signals. They are not a cleanup checklist, and consumers should not turn them into failures unless the team deliberately adds that policy.
- `observedDependencies[].import.kind`, when present, describes the source syntax Axiom observed. It is evidence, not contract intent.

Do not hard-gate on `axi graph`, `axi observe`, or Markdown output unless your own workflow intentionally adds a separate policy. Those commands are observability surfaces and exit successfully even when they show violations.

## Graph And Observe

`axi graph --json` and `axi observe --json` emit `axiom.graph.*`.

Important fields:

- `architectureSummary`: agent-friendly status, review mode, interpretation, review story, top signals, optional advisory signal coverage, and suggested next actions over the same graph result.
- `root`: checked project root. It is an absolute path by default; committed baselines created with `axi graph --json --portable` use `"."` and include `artifact.pathMode: "portable"`.
- `summary`: counts for modules, observed dependencies, violations, intentional violations, and warnings.
- `filters`: tells whether output is full graph, attention, or violations-only.
- `allObservedDependencies[]`: the full observed module graph.
- `shownObservedDependencies[]`: the observed edges shown by the current view.
- `observedDependencies[]`: compatibility alias for `shownObservedDependencies[]`. Edge entries include `violations[]` and `intentionalViolations[]`.
- `intentionalDebt[]`: top-level accepted-debt ledger.
- `warnings[]`: advisory signals with normalized details.
- `drift`: optional advisory baseline-drift result when `--baseline` is provided.

`summary.observedDependencies` is always the full observed edge count. `summary.shownObservedDependencies` is the count for the current view. In attention or violations-only output those counts can differ, and `observedDependencies[]` remains the shown-view compatibility array. Use `allObservedDependencies[]` when a machine consumer needs the complete graph.

Observed dependency import sites include an optional `import.kind` field. Current payloads set it to one of `import`, `export`, `dynamic_import`, `require`, or `import_type`. Treat it as descriptive evidence about how Axiom observed the edge, not as a contract rule or architecture intent. It is especially useful when separating literal dynamic imports, including Python `importlib.import_module("...")` / `__import__("...")` calls, from non-literal dynamic dependency warnings. Python imports inside clear `if TYPE_CHECKING:` / `if typing.TYPE_CHECKING:` blocks are marked as `import_type`; this is static type-only evidence, not proof that the edge is a runtime dependency. Older committed baselines may not have this field, so consumers should default missing `import.kind` to an unknown or ordinary static import presentation rather than rejecting the artifact.

Warning counts only include advisory checks enabled for that command or config. If a dashboard compares `observe`, `graph`, Markdown, and Mermaid output, run them with the same `--warn-*` flags or label the difference as warning-scope, not drift.

When one or more `--warn-*` families are enabled, `architectureSummary.advisorySignalCoverage` may list each enabled family with `status`, `findings`, and `warningCodes[]`. `checked_no_findings` means that this static scan did not report that advisory family. For `dynamicImports`, that includes non-literal TS/JS dynamic expressions and non-literal Python importlib-style expressions visible to the scanner. It is not a health score, runtime dependency proof, or reason to assume unchecked responsibilities are clean. Ownership-based families can be `not_evaluated_needs_contract` when no `.axi` or temporary inferred contract provides module ownership.

`deep_internal_import` warning details can include `entrypointConfidence`, `entrypointReason`, `deepImportGroup`, `sourceGroup`, `publicEntrypoints[]`, and `moduleEntrypoints[]`. `publicEntrypoints[]` is same-source-group advice. `moduleEntrypoints[]` lists other entry points in the broad module that were not used as direct advice. Agents should not rewrite imports to `moduleEntrypoints[]` when `entrypointConfidence` is `ambiguous_entrypoints`.

The top-level `intentionalDebt[]` ledger is the authoritative list for accepted debt review. Per-edge `intentionalViolations[]` entries are useful annotations, but some accepted debt is not a cross-module observed edge. For example, an accepted `hidden_reexport` from an exposed entry point can appear in `intentionalDebt[]` even when there is no `observedDependencies[]` edge to show. When the `.axi` entry uses `at "<path-or-glob>"`, JSON contract objects expose `pathScope` so agents can see that the debt was accepted only for that violation location.

`architectureSummary` is a convenience surface for agents and dashboards. It does not add validation semantics. Use it to decide what to show first, then read the underlying `violations[]`, `intentionalDebt[]`, `warnings[]`, `drift`, and observed dependency arrays for exact evidence.

`architectureSummary.interpretation` is the human-navigation layer for graph output. It includes:

- `headline`: one short reading of the current scan.
- `quickRead[]`: compact facts such as contract status, graph center, review pressure, and drift.
- `lookFirst[]`: a stable checklist for new users: hard signals, graph center, then shape fit against expected architecture.
- `centralModules[]`: the modules with the strongest observed import pressure in this scan, with fan-in/fan-out and import-site counts.
- `caveat`: a reminder that this is static import graph interpretation, not semantic architecture proof.

Consumers should treat the interpretation as a navigation aid, not a gate. For exact evidence, read the raw arrays that produced it.

`architectureSummary.reviewStory` is the short review companion for first-time users and agents. It includes:

- `summary`: a compact story of what the scan means.
- `setup`: scan size and the reminder that graph / observe output is advisory unless `axi check` is used as the gate.
- `pressures[]`: the top review pressures, such as hard failures, visible debt, warning roots, baseline drift, or a quiet graph center.
- `nextStep`: the first action a human or agent should take.
- `caveat`: a reminder that the story is static import-graph guidance, not semantic architecture proof.

Use `reviewStory` to decide what to show first in a PR comment, dashboard, or agent prompt. Use the raw arrays for exact evidence and line-level repairs.

## Baseline Drift

Baseline drift compares current observed module edges against an unfiltered portable `axi graph --json --portable` snapshot:

```bash
axi graph --root . --json --portable > axiom-baseline.json
axi observe --root . --baseline axiom-baseline.json --json
```

A baseline must come from unfiltered graph output. Do not use `--attention` or `--violations-only` to create a baseline.

Baseline drift is advisory. JSON marks it as:

```json
{
  "kind": "advisory_observed_edge_drift"
}
```

Treat `drift.newObservedEdges[]` and `drift.removedObservedEdges[]` as review context first, not as automatic failures.

## Inference Drafts

`axi infer --json` emits `axiom.infer.*` and includes:

- `starterContract.kind: "current_graph_snapshot"` to mark the output as a mirror of today's dependency graph.
- `starterContract.notice[]` with the same human-facing warning printed in `.axi` comments.
- `starterContract.reviewPass[]` with the keep / change / remove / observe loop that turns current-graph evidence into reviewed intent.
- `starterContract.authoringChecklist[]` and `starterContract.nextCommands[]` for tools that want to guide first-contract review.
- `reviewStory` with the inferred setup, top authoring pressures, next step, and caveat.
- `modules[].dependencyEvidence[]` with the target module, observed import-site count, and sample import sites for each inferred dependency.
- `observedDependencies[]` with counts and sample import sites behind inferred edges.
- `summary.observedModuleEdges` for the inferred module-edge count and `summary.observedImportSites` for the total import-site evidence behind those edges. `summary.observedDependencies` remains a compatibility alias for `observedModuleEdges`.
- `collapsedCycles[].cyclePathSamples[]` with a compact source-group path such as `Services -> Tools -> Services` explaining why inference merged a cycle.
- `collapsedCycles[].cycleBreakingCandidates[]` with evidence-backed edges to inspect first when deciding whether a collapsed cycle should stay merged or be split.
- `architecturePressureNotes[]` with advisory context such as large source files that may hide responsibilities outside the import graph.
- `axi` containing the generated starter contract text.

Do not treat inferred modules, collapsed cycles, or dependencies as maintainer intent until a human reviews and edits the contract. Show `starterContract.reviewPass[]` before saving or gating the draft so the first contract decision stays explicit.

`reviewStory` is a shortcut for presentation, not a substitute for evidence. It can tell an agent or UI to show collapsed cycles or large-file pressure first, but exact decisions should still read `collapsedCycles[]`, `architecturePressureNotes[]`, and `modules[].dependencyEvidence[]`.

## Agent Use

Agents should prefer this loop:

1. Run `axi check --json` after editing.
2. Repair hard `violations[]`.
3. If a temporary exception is genuinely intended, propose a `.axi` `accepts ... [at "path"] until ... because ...` change for human review.
4. Run `axi observe --json` or `axi observe --markdown` to summarize visible debt, warnings, and drift.

Axiom does not auto-accept debt. Accepted debt must be declared in `.axi` with an expiration date and reason. Expired or invalid intentional violations remain hard failures in `axi check`.
Agents should not refactor solely to reduce `summary.warnings`; they should name the architecture hypothesis first, then verify the change with tests, audits, or Axiom evidence.
