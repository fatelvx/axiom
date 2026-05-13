# JSON Consumers

Axiom JSON output is meant for CI annotations, PR comments, dashboards, and agent repair loops.

The project is still in public alpha, so JSON schemas can evolve before 1.0. Consumers should be strict about the signal they depend on and tolerant of fields they do not understand.

For a copyable GitHub Actions workflow that annotates hard violations and writes an architecture summary, see [GitHub Actions And PR Summaries](github-actions.md).

## Command Families

Each JSON payload starts with a `schemaVersion`:

```text
axiom.check.v4
axiom.graph.v9
axiom.infer.v4
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
- `warnings[]` contains advisory or cleanup signals.

Do not hard-gate on `axi graph`, `axi observe`, or Markdown output unless your own workflow intentionally adds a separate policy. Those commands are observability surfaces and exit successfully even when they show violations.

## Graph And Observe

`axi graph --json` and `axi observe --json` emit `axiom.graph.*`.

Important fields:

- `summary`: counts for modules, observed dependencies, violations, intentional violations, and warnings.
- `filters`: tells whether output is full graph, attention, or violations-only.
- `allObservedDependencies[]`: the full observed module graph.
- `shownObservedDependencies[]`: the observed edges shown by the current view.
- `observedDependencies[]`: compatibility alias for `shownObservedDependencies[]`. Edge entries include `violations[]` and `intentionalViolations[]`.
- `intentionalDebt[]`: top-level accepted-debt ledger.
- `warnings[]`: advisory warnings with normalized details.
- `drift`: optional advisory baseline-drift result when `--baseline` is provided.

The top-level `intentionalDebt[]` ledger is the authoritative list for accepted debt review. Per-edge `intentionalViolations[]` entries are useful annotations, but some accepted debt is not a cross-module observed edge. For example, an accepted `hidden_reexport` from an exposed entry point can appear in `intentionalDebt[]` even when there is no `observedDependencies[]` edge to show.

## Baseline Drift

Baseline drift compares current observed module edges against an unfiltered `axi graph --json` snapshot:

```bash
axi graph --root . --json > axiom-baseline.json
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
- `starterContract.authoringChecklist[]` and `starterContract.nextCommands[]` for tools that want to guide first-contract review.
- `modules[].dependencyEvidence[]` with the target module, observed import-site count, and sample import sites for each inferred dependency.
- `observedDependencies[]` with counts and sample import sites behind inferred edges.
- `axi` containing the generated starter contract text.

Do not treat inferred modules, collapsed cycles, or dependencies as maintainer intent until a human reviews and edits the contract. They are onboarding material for authoring a real `.axi` contract.

## Agent Use

Agents should prefer this loop:

1. Run `axi check --json` after editing.
2. Repair hard `violations[]`.
3. If a temporary exception is genuinely intended, propose a `.axi` `accepts ... until ... because ...` change for human review.
4. Run `axi observe --json` or `axi observe --markdown` to summarize visible debt, warnings, and drift.

Axiom does not auto-accept debt. Accepted debt must be declared in `.axi` with an expiration date and reason. Expired or invalid intentional violations remain hard failures in `axi check`.
