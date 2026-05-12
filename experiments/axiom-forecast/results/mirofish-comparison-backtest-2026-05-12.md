# MiroFish-Style Comparison Backtest

Date: 2026-05-12

Status: targeted synthetic backtest, not real user research.

## Input

This backtest evaluated the current working snapshot after adding:

- `guides/comparison.md`
- README links to the comparison guide
- getting-started and adoption guide links to the comparison guide
- package metadata aligned around architecture observability plus enforceable contracts

Backtest question:

> Does the new Comparison And Boundaries guide reduce the likely stakeholder objection "Axiom is just Dependency Cruiser / ESLint with a new syntax" without weakening the product into vague observability marketing?

The prompt provided the new comparison guide and README excerpt to the local MiroFish `LLMClient` using the same configured model path as prior targeted backtests.

## Runtime Note

The first two prompts produced useful direction but truncated mid-answer. The final prompt used a strict five-bullet format to capture only the decision signal.

This mirrors prior DeepSeek-wrapper behavior during compact backtests and should not be treated as product evidence.

## Final Synthetic Output

```text
- 適合需明確架構意圖、追蹤漂移、管理負債的團隊，非取代現有工具。
- 非語法檢查器，補強架構可觀測性、可審查負債與違規能見度。
- 若已有成熟依賴圖工具且無架構漂移痛點，Axiom不一定必要。
- 宣稱更強掃描器恐失焦，應強調合約與債務可見性差異。
- 提供更多CI儀表板整合範例，加速AI代理人修復迴路落地。
```

## Interpretation

The comparison guide appears to reduce the "just Dependency Cruiser / ESLint" objection by refusing to claim scanner superiority and by making the product difference workflow-based: declared intent, visible accepted debt, drift review, and agent-readable architecture context.

The remaining risk is evidence. Skeptical users may accept the distinction conceptually, then still ask for concrete CI annotations, dashboard examples, and agent repair-loop artifacts before they believe the workflow difference matters in practice.

## Product Response

Do not change the validator semantics from this forecast alone.

Useful next steps:

- Keep the comparison guide as a public boundary document.
- Link the guide to JSON consumer guidance so integrations have a concrete next step.
- Add future CI annotation, dashboard, or agent repair-loop examples only after they can use the existing JSON/Markdown outputs without blurring advisory signals into hard gates.
