# MiroFish Markdown Review Backtest

Date: 2026-05-12

Product snapshot:

```text
https://github.com/fatelvx/axiom
working tree after implementing graph/observe --markdown
```

## What Changed Before This Backtest

This backtest was run after a real implementation change.

Implemented change:

- Added `axi observe --markdown`.
- Added `axi graph --markdown`.
- Markdown output reuses the same validator and graph result as human and JSON output.
- Markdown output separates hard violations, visible intentional debt, advisory warnings, and advisory baseline drift.
- `axi check` remains the CI gate.
- `axi observe` and `axi graph` remain review/inspection commands and exit successfully even when hard violations are present.

Product boundary:

```text
Markdown is a PR / agent review artifact, not a new validation path.
```

## Method

Ran a small targeted backtest through the local MiroFish runtime configuration:

```text
runner=direct MiroFish LLMClient
model configuration=unchanged from the previous DeepSeek Pro local run
full OASIS simulation=not run
```

The prompt included the actual Markdown output sample from:

```bash
node dist/cli.js observe --root fixtures/basic-ts-invalid --baseline fixtures/baseline-drift/basic-valid.graph.json --markdown
```

Local raw artifacts:

```text
axiom_forecast_outputs_markdown/markdown_review_backtest.md
axiom_forecast_outputs_markdown/markdown_review_backtest_corrected.md
```

## Main Result

The backtest produced a useful failure mode more than a clean recommendation.

Even after the prompt explicitly said baseline drift is advisory and Markdown is presentation output, the model repeatedly pulled the feature back toward hard enforcement:

```text
Drift should stay advisory by default, but teams can enable --fail-on-drift.
```

It also hallucinated features that Axiom does not have and should not need right now:

```text
.axiignore
axi suppress
exit code 2 for drift advisory
```

Interpretation:

- The Markdown review surface is directionally useful because it makes PR / agent communication concrete.
- The biggest risk is semantic slippage: reviewers and agents may still read any structured architecture report as a CI gate unless the artifact itself keeps saying otherwise.
- This supports the current product discipline: do not add `--fail-on-drift` yet, and do not invent a second escape-hatch system.

## Actionable Interpretation

Absorb the problem, not the model's proposed answer.

Do:

- Keep Markdown as presentation output over the existing graph result.
- Make the Markdown artifact itself say that `axi check` is the gate.
- Keep hard violations, visible intentional debt, warnings, and drift in separate sections.
- Keep drift labeled as advisory in both prose and machine-readable output.

Do not:

- Add `--fail-on-drift` yet.
- Add `.axiignore`, `axi suppress`, or another hidden allowlist path.
- Add Mermaid graph output before the review summary proves useful.
- Let the PR-summary workflow imply that every drift signal must block a merge.

## Follow-Up Taken

The follow-up repair was intentionally small:

- Markdown review notes now include: `This is review output; use axi check when you want a CI gate.`
- CLI help for `--markdown` now says it is presentation output and points users back to `axi check` for gating.

This directly addresses the misunderstanding surfaced by the backtest without changing validation semantics.

## Caveat

This was a targeted synthetic backtest, not real user research. It is most valuable as a pressure map: the same model repeatedly misunderstood advisory drift even under constraints, so the public artifact must defend that boundary in its own wording.
