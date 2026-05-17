# MiroFish Targeted Backtest: MCP Import-Kind Conformance

Date: 2026-05-17

Method: compact direct MiroFish-style LLMClient-compatible forecast using the local configured model endpoint. This is synthetic forecast pressure, not real user research or demand proof.

Seed summary:

- Axiom now exposes observed `import.kind` evidence in canonical JSON payloads.
- Literal dynamic imports remain observed graph edges with `import.kind: dynamic_import`.
- Non-literal dynamic import and require expressions remain opt-in `dynamic_dependency_expression` advisory warnings.
- This patch adds MCP conformance coverage across `axiom_check`, `axiom_graph`, and `axiom_observe` so agents consume import-kind evidence without treating it as a rule.
- Public MCP conformance docs now say `import.kind` is descriptive evidence, not policy intent, new contract syntax, runtime proof, or rewrite permission.
- Verification passed: `npm run mcp:conformance:smoke`, `npm test`, `npm run axiom:self`, `npm run axiom:self:artifact`, and `npm run spec-first:smoke`.

## Forecast Result

Verdict: `KEEP`.

Confidence: high.

Why:

- The patch closes the consumer-side risk that agents see dynamic import syntax but misclassify it as either a warning-only blind spot or a new contract rule.
- It improves MCP trust without changing `.axi` grammar, hard-gate behavior, resolver semantics, or accepted-debt semantics.
- It directly supports the dynamic-before-Python roadmap because the shared evidence model now distinguishes observed import syntax before adding another language scanner.

Risks:

- The remaining risk is semantic overreach: agents or users may still treat `import.kind` as normative architecture intent if docs or summaries become loose later.
- Downstream consumers that assumed warnings were the only dynamic-import evidence may need to read observed dependencies instead, but this is aligned with the canonical JSON model.

Recommendation:

Keep the patch. No additional blocking patch is required before the next dynamic polish pass, as long as future docs continue to call `import.kind` descriptive observed evidence rather than contract language.

## Adopted Interpretation

Treat this as the consumer-side closure for the import-kind evidence patch. Keep the change if the final local test and self-guard results stay green. The next roadmap step can move into one more small dynamic-evidence polish pass or directly into Python scanner planning, but only if `import.kind` remains descriptive evidence rather than contract language.
