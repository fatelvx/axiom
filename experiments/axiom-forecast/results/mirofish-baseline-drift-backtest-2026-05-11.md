# MiroFish Baseline Drift Backtest

Date: 2026-05-11

Product snapshot:

```text
https://github.com/fatelvx/axiom
working tree after baseline-aware observed edge drift implementation
```

## What Changed Before This Backtest

This backtest was run after a real implementation change.

Implemented change:

- Added `--baseline <graph-json>` to `axi graph` and `axi observe`.
- Baselines must be unfiltered `axi graph --json` output.
- The first drift detector compares unique observed module edges.
- Human and JSON output report new observed edges and removed observed edges.
- New observed edges include current import sites and current violations.
- The drift output does not fail `axi check`.

Product boundary:

```text
Baseline drift is PR / agent review context, not an enforcement verdict.
```

## Method

Tried a targeted MiroFish `ReportAgent.chat` run using the existing local forecast graph:

```text
graph_id=mirofish_2a0d62ee48ed43be
simulation_id=sim_0744c54e88e4
model configuration=unchanged from the previous DeepSeek Pro local run
```

The ReportAgent call wrote output files but exceeded the shell timeout and produced partially mojibake text because the local MiroFish prompt/runtime encoding is still fragile. That output was treated as an unreliable artifact, not as product evidence.

Then ran a smaller direct `LLMClient` targeted backtest using the same local MiroFish `.env` and model configuration so the result was readable.

Local raw artifacts:

```text
axiom_forecast_outputs_baseline/01_baseline_drift_backtest_chat.md
axiom_forecast_outputs_baseline/02_baseline_drift_direct_backtest.md
```

## Main Result

The readable backtest generally treated baseline drift as aligned with architecture observability, but it exposed one important product risk:

- Even when the prompt said drift is not a hard gate, the response briefly framed baseline drift as a CI check failure.
- This suggests real users or tool builders may also confuse drift visibility with enforcement unless the output labels are explicit.
- The strongest differentiation defense is not "we can diff dependencies." It is "Axiom diff is tied to declared intent, accepted debt, advisory warnings, and current violations."

Useful excerpt:

```text
從「規則被動偵測」轉為「意圖主動對齊」。它不只說「你超過了 n 層依賴」，而是說「你偏離了設計圖，且這些邊是新的」。
```

Risk excerpt:

```text
baseline‑drift check 以 advisory 模式存在（不擋 PR），待團隊信任後再升級為 blocking。
```

Interpretation: the backtest kept pulling the feature toward CI blocking. That is useful pressure, but not the current product move.

## Actionable Interpretation

Absorb the problem, not the whole answer.

Do:

- Keep baseline drift advisory.
- Make the advisory status machine-readable, not only prose in docs.
- Make human output say drift is advisory.
- Explain that baselines must be unfiltered graph snapshots.

Do not:

- Add a hard `--fail-on-drift` gate yet.
- Compare import-site churn before the module-edge signal is validated.
- Invent baseline storage, merge, or branch policy before real projects reveal the workflow.
- Claim this replaces Dependency Cruiser or git diff; position it as intent-aware drift review.

## Follow-Up Taken

The follow-up repair was intentionally small:

- Human output now labels the section as `architecture drift (advisory)`.
- Graph JSON drift output now includes `kind: "advisory_observed_edge_drift"`.
- Public docs now call out that JSON marks baseline drift as advisory.

This addresses the "drift may be mistaken for enforcement" risk without changing validation semantics.

## Caveat

This was a targeted synthetic backtest, not real user research. The direct backtest is useful as a pressure map, while the mojibake ReportAgent result mainly revealed a MiroFish runtime/encoding limitation.
