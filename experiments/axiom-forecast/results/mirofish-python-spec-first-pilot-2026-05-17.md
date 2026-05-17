# MiroFish Targeted Backtest: Python Spec-First Pilot

Date: 2026-05-17

Method: compact direct MiroFish-style forecast using the local configured model endpoint. This is synthetic forecast pressure, not real user research or demand proof. The run used a sanitized summary of a private all-Python project shape and did not publish private project details.

Seed summary:

- Axiom remains validator-first: `.axi` spec + source scanner -> declared graph vs observed graph -> violations/evidence.
- Python scanner v0 is static-only and repo-local.
- `pythonImportRoots` now lets a project declare ordered repo-local static import roots.
- Proposed next action: run a read-only spec-first pilot on a private all-Python project using temporary external config/spec files only.
- No target writes, dependency installs, target scripts, saved `.axi`, baselines, accepted debt, or new enforcement semantics.

## Forecast Result

Verdict: KEEP
Confidence: 0.85

Main value:

The pilot de-risks Python investment by testing whether the minimal static import scanner can produce a useful contract/violation loop with zero target-repo side effects.

Risks:

- False confidence from an overly sparse or noisy graph.
- Scope creep from treating temporary evidence as accepted architecture debt.
- Overreacting to static blind spots by jumping too quickly into runtime instrumentation.

Required guardrails:

- Keep the pilot strictly read-only and temp-only.
- Report evidence as exploratory signal, not enforcement.
- Use the result only to decide the next implementation step.

## Adopted Interpretation

Proceed with the read-only private pilot before adding more Python features. A good result is one clear, non-trivial architectural constraint that Axiom can enforce as an ordinary `axi check` hard violation. If static imports are too sparse, the next step should improve scanner evidence rather than harden contracts.
