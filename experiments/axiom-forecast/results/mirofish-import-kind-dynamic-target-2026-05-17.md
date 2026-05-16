# MiroFish Targeted Backtest: Import-Kind Evidence Before Python

Date: 2026-05-17

Method: compact direct MiroFish-style LLMClient-compatible forecast using the local configured model endpoint. This is synthetic forecast pressure, not real user research or demand proof.

Seed summary:

- Axiom adds observed `import.kind` evidence to check and graph JSON import sites.
- Human, Markdown, and drift output now render non-static kinds such as literal dynamic imports and `require`.
- Literal dynamic imports remain observed graph edges; non-literal `import()` / `require()` expressions remain opt-in `dynamic_dependency_expression` advisory warnings.
- No `.axi` grammar, hard gate, resolver, or accepted-debt semantics change.
- JSON remains the canonical machine/agent evidence surface; `.axi` remains the human-authored contract surface; Markdown remains the PR/human review surface. YAML is considered a future human-readable export candidate, not current scope.
- Verification passed: `npm test`, `npm run axiom:self`, `npm run axiom:self:artifact`, `npm run spec-first:smoke`, and `npm run mcp:conformance:smoke`.

## Forecast Result

Verdict: `KEEP`, high confidence.

Import-kind evidence materially improves the dynamic-before-Python path because it makes dynamic/static syntax visible in the canonical evidence model before adding another language scanner.

Main misread risk: agents or users could treat `import.kind` as a contract rule instead of observed syntax evidence.

Recommended patch before Python: add explicit wording that import kinds are descriptive observed evidence, not normative architecture intent.

YAML recommendation: do not add YAML now. Revisit after Python or after a concrete human-export workflow proves JSON plus Markdown is not enough.

## Adopted Interpretation

Keep the change and the roadmap discipline. This patch strengthens the shared evidence model without adding enforcement semantics. Python should still wait until at least one more dynamic-evidence polish pass or pilot confirms that agents do not confuse observed syntax labels with `.axi` rules.
