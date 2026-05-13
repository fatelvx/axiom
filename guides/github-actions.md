# GitHub Actions And PR Summaries

This guide shows the recommended split for GitHub Actions:

- `axi check --json` is the hard gate.
- GitHub annotations should come from hard `violations[]`.
- `axi observe --json` can feed a PR or job-summary review artifact through `architectureSummary`.
- `axi observe --markdown` remains useful when you want a full human-readable review body.
- `axi graph --mermaid` can be attached or pasted when a visual observed dependency graph helps review.
- Advisory warnings, visible debt, and drift should stay review context unless your team deliberately promotes a signal into policy.

That separation is the product point. Axiom can enforce explicit contracts without turning every observability signal into CI friction.

## Copyable Workflow

The example workflow lives at:

```text
examples/github-actions/axiom-pr-review.yml
```

If you copy it into another repository, copy the helpers too or adjust the `node examples/github-actions/*.mjs` paths.

It expects Axiom to be installed as a dev dependency:

```bash
npm install -D @fatelvx/axiom
```

Until the first public npm publish, use a local checkout or package installation strategy that fits your repository.

The workflow does three things:

1. Runs `axi check --root . --json` and keeps the exit code as the gate.
2. Converts hard violations into GitHub `error` annotations.
3. Runs `axi observe --root . --json` and appends its `architectureSummary` to the GitHub step summary so reviewers and agents can see visible debt, warnings, and drift separately from the gate.

From this repository, you can smoke-test the example integration locally:

```bash
npm run github-actions:smoke
```

The smoke test runs the real built CLI against `examples/basic-app`, verifies that hard violations become GitHub error annotations, verifies that a passing check becomes a notice, and verifies that `axi observe --json` plus `architectureSummary` produces PR review context without changing the gate.

## Annotation Helper

The optional helper lives at:

```text
examples/github-actions/annotate-check.mjs
```

It reads an `axiom.check.*` JSON file and emits GitHub Actions workflow commands for hard violations only.

Example:

```bash
set +e
npx axi check --root . --json > axiom-check.json
status=$?
node examples/github-actions/annotate-check.mjs axiom-check.json
exit "$status"
```

This keeps the gate source clear:

- The workflow fails only because `axi check` found hard violations.
- The helper annotates the PR but does not decide policy.
- Accepted debt and warnings stay out of GitHub `error` annotations unless they are also hard `violations[]`.

## PR Architecture Summary

Use `axi observe --json` when a CI job, dashboard, or agent should consume the structured `architectureSummary`:

```bash
npx axi observe --root . --json \
  --warn-unresolved-imports \
  --warn-coupling-concentration \
  --warn-deep-internal-imports > axiom-observe.json
node examples/github-actions/summarize-observe.mjs axiom-observe.json >> "$GITHUB_STEP_SUMMARY"
```

`axi observe` exits successfully by design. It is meant to show the architecture attention surface:

- hard violations
- visible intentional debt
- advisory warnings
- optional baseline drift

Use `axi check` when the job should fail.

Add `--warn-public-api-surface` only when the repository has active `exposes` rules and the team intentionally wants advanced public-entrypoint facade-pressure review. It is not part of the default PR summary because broad aggregators can be intentional and noisy for early pilots.

Use Markdown output when you want the full review body instead of the compact JSON-derived summary:

```bash
npx axi observe --root . --markdown \
  --warn-unresolved-imports \
  --warn-coupling-concentration \
  --warn-deep-internal-imports >> "$GITHUB_STEP_SUMMARY"
```

## Optional Baseline Drift

If your team keeps an unfiltered graph snapshot, use it as review context:

```bash
axi graph --root . --json > axiom-baseline.json
axi observe --root . --baseline axiom-baseline.json --markdown
```

In CI, the baseline should come from a known architecture snapshot, not from the current checkout right before the comparison. A current checkout baseline will usually compare the repository to itself and hide drift.

Baseline drift is advisory. It can show that a PR introduced or removed module edges, but it does not prove the change is bad.

## Optional Visual Graph

Mermaid output is useful when reviewers need to see the shape of module dependencies:

```bash
axi graph --root . --mermaid > axiom-graph.mmd
axi observe --root . --mermaid > axiom-attention.mmd
```

`axi graph --mermaid` shows the observed module graph with a built-in legend. `axi observe --mermaid` uses the same focused attention filter as observe, so it can show only edges under review and marks the diagram as filtered. Both are presentation outputs; keep `axi check` as the gate.

## Agent Repair Loop

A minimal agent loop should use the same split:

1. Run `axi check --json`.
2. Repair hard `violations[]`.
3. Use `axi observe --json` `architectureSummary` or `axi observe --markdown` as review context.
4. Propose `.axi` `accepts ... until ... because ...` only when temporary debt is genuinely intended and needs human review.

Axiom does not auto-accept debt. Expired or invalid intentional violations remain hard `axi check` failures.

## Common Mistakes

Avoid these patterns:

- Failing CI on every advisory warning by default.
- Treating baseline drift as a hard failure without a team policy.
- Parsing exact JSON key sets instead of checking `schemaVersion` and reading the fields your integration needs.
- Hiding accepted debt outside `.axi`.
- Letting an agent add `accepts` statements without review.

The safe default is:

```text
hard gate from axi check
review context from axi observe
policy changes through .axi review
```
