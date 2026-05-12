# MiroFish Targeted Backtest: Intentional Debt Ledger

Date: 2026-05-12

Snapshot:

```text
commit afea23f Expose intentional debt ledger
```

## Product Change Under Test

Axiom graph / observe output now exposes accepted intentional violations through a top-level `intentionalDebt` ledger in `axiom.graph.v9`.

This fixes an important visibility gap:

- accepted dependency-edge debt was already shown on observed graph edges
- accepted non-edge surface debt, such as `hidden_reexport`, could previously appear only as `intentional violations: 1` in the summary
- `axi observe`, graph JSON, and Markdown review output now show the concrete file, rule, contract, expiration, reason, and fix for that debt

## Method

This was a targeted MiroFish-style backtest using the local MiroFish backend `LLMClient` with the existing local model configuration. It did not run a full OASIS simulation.

The prompt simulated six stakeholder roles:

- senior staff engineer at a large TypeScript monorepo
- DevOps / CI owner
- AI coding agent framework maintainer
- open-source maintainer skeptical of noisy linters
- researcher studying AI-generated code quality
- startup CTO adopting AI agents aggressively

The goal was to pressure-test whether the ledger makes intentional violations valuable and conspicuous, without turning Axiom into an architecture oracle or noisy linter.

## Useful Forecast Signal

The first targeted response accepted the direction, especially for teams that need a green build while keeping acknowledged debt visible.

Most useful concerns:

1. **Rubber-stamp risk:** if teams can add accepted debt too easily, the ledger can degrade into a ceremony instead of reviewable architecture debt.
2. **Schema churn risk:** large monorepos will care that graph JSON moved from `axiom.graph.v8` to `axiom.graph.v9`; downstream consumers need a stable migration story.
3. **Agent auto-accept pressure:** AI-agent framework maintainers may ask for bulk acceptance or generated acceptance patches, which could recreate hidden suppressions if rushed.
4. **Noise proof gap:** skeptical maintainers will still ask whether the ledger reduces false-positive pain or just adds bureaucracy.
5. **Research value:** the ledger may become useful data for studying intentional vs accidental architecture drift, but only if accepted debt is not gamed.

The strongest product read:

```text
The ledger is directionally correct, but its trust depends on expiry, auditability, and refusing hidden auto-accept workflows.
```

## Failed Follow-Up Signal

A second tightening prompt asked the model to avoid overclaiming and to respect Axiom's real limits. The response hallucinated nonexistent facts:

- fake forecast accuracy metrics
- fake auto-accepted debt entries
- a nonexistent semantic oracle
- a nonexistent migration tool
- expired debt behaving as advisory, even though expired intentional violations already fail `axi check`

This failure is itself useful. It shows that agent-facing review artifacts must defend the product boundary explicitly.

## Follow-Up Taken

After the backtest, Markdown review notes were updated to state:

- Axiom does not auto-accept debt.
- Accepted debt must be declared in `.axi` with an expiration date and reason.
- Expired or invalid intentional violations are hard contract failures in `axi check`.

## Next Risk Map

The next useful small step is not agent auto-accept or broader enforcement.

The likely next smallest repair is a public graph JSON compatibility / versioning note, because the ledger changed `axiom.graph.v9` and downstream PR-comment or agent consumers need to know how additive graph schema changes should be handled.
