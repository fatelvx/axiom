# MiroFish Targeted Backtest: Module Require Dynamic Evidence

Date: 2026-05-17

Method: compact direct MiroFish-style LLMClient-compatible forecast using the local configured model endpoint. This is synthetic forecast pressure, not real user research or demand proof. The endpoint returned normal final content, but the retained artifact normalizes encoding-sensitive punctuation to ASCII.

Seed summary:

- Axiom already exposes observed `import.kind` evidence and keeps literal dynamic imports as observed edges.
- This patch adds `module.require("...")` as CommonJS observed dependency evidence using the existing `require` import kind.
- Non-literal `module.require(expr)` flows through the existing opt-in `dynamic_dependency_expression` warning path.
- No `.axi` grammar, hard-gate, accepted-debt, MCP, or baseline semantics changed.
- Verification passed: targeted scanner/check tests, `npm test`, `npm run axiom:self`, `npm run axiom:self:artifact`, `npm run spec-first:smoke`, and `npm run mcp:conformance:smoke`.

## Forecast Result

Verdict: `KEEP`.

Confidence: high.

Why:

- The patch is narrow: it adds one literal-recognition path for `module.require("./target")` and reuses the existing `dynamic_dependency_expression` warning for non-literals.
- It adds no new syntax, schema, gates, baselines, or warning families.
- The local smoke and self-guard checks passed.

Risks:

- No new risk beyond the existing literal-analysis surface for `require()` / `import()`.
- Broader dynamic-require handling would be a different feature and should not be pulled into this pass.

Recommendation:

Ship as-is. Explicitly freeze further dynamic-require expansion, including partial evaluation, aliasing, and inter-procedural reasoning, until after Python scanner planning.

## Adopted Interpretation

Keep the patch as the last small TS/JS dynamic edge-case polish before Python planning. Do not expand this pass to `require.resolve`, created require functions, bundler magic comments, or dataflow-based dependency recovery without separate calibration evidence.
