# Axiom Forecast Experiment

This folder packages Axiom's current product state for a MiroFish-style social reception forecast.

Goal:

Use a multi-agent social simulation to predict how real users may understand, adopt, criticize, misuse, or ignore Axiom before the project over-invests in the wrong product direction.

Current backtest focus:

- `axi observe` as a product-facing architecture attention command.
- Architecture observability with enforceable contracts.
- Baseline-aware observed edge drift for PR and agent review.
- Markdown review summaries for PR comments and agent repair loops.
- Performance memoization and static blind-spot visibility after the 10k synthetic smoke check improved.
- Whether "observe first, negotiate accepted tradeoffs, enforce only high-confidence intent" improves trust or sounds too abstract.

Files:

- `seed.md`: the product context to feed into MiroFish.
- `protocol.md`: simulation roles, questions, phases, and expected output.
- `run-log.md`: concrete run notes from this workspace.
- `results/dry-run-forecast.md`: a local dry-run forecast produced before a full MiroFish simulation is available.
- `results/mirofish-live-run-2026-05-11.md`: sanitized English summary of the live compact run.
- `results/mirofish-live-run-2026-05-11.zh.md`: Chinese process log and actual generated-output excerpts.
- `results/mirofish-observe-backtest-2026-05-11.md`: targeted backtest after adding `axi observe` and reframing the product around architecture observability.
- `results/mirofish-coupling-backtest-2026-05-11.md`: targeted backtest after adding opt-in coupling concentration warnings.
- `results/mirofish-baseline-drift-backtest-2026-05-11.md`: targeted backtest after adding baseline-aware observed edge drift.
- `results/mirofish-markdown-review-backtest-2026-05-12.md`: targeted backtest after adding Markdown PR / agent review summaries.
- `results/mirofish-performance-memoization-backtest-2026-05-12.md`: targeted backtest after reducing synthetic scan cost with ownership lookup memoization.
- `results/mirofish-intentional-debt-ledger-backtest-2026-05-12.md`: targeted backtest after adding the top-level `intentionalDebt` ledger for accepted non-edge surface debt.
- `tools/write-mirofish-env.ps1`: local helper for writing MiroFish credentials to `.env` without pasting secrets into chat.

Live run input snapshot:

```text
https://github.com/fatelvx/axiom
current master after the axi observe / observability positioning update
```

Latest targeted backtest snapshot:

```text
current working snapshot after ownership lookup memoization and unresolved import advisory warnings
```

Use this experiment as forecast input, not as a replacement for real users. A useful forecast should produce falsifiable adoption risks, concrete messaging changes, and roadmap tradeoffs.

Public sharing rule:

- Publish the sanitized summaries, not raw `.env`, local paths, or full runtime dumps.
- Label the result as a synthetic forecast, not real user research or demand proof.
- Keep the limitations attached: partial OASIS completion, one empty report section, and simulated profiles.

## Local Credential Entry

Do not paste API keys into chat. Use the local helper:

```powershell
powershell -ExecutionPolicy Bypass -File experiments\axiom-forecast\tools\write-mirofish-env.ps1
```

The script finds the latest `<temp>/axiom-mirofish-*` clone by default and writes MiroFish credentials to that clone's `.env`.
