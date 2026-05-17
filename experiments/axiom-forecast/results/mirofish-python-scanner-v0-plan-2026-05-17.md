# MiroFish Targeted Backtest: Python Scanner v0 Plan

Date: 2026-05-17

Method: compact direct MiroFish-style LLMClient-compatible forecast using the local configured model endpoint. This is synthetic forecast pressure, not real user research or demand proof. The endpoint returned normal final content.

Seed summary:

- Axiom keeps the validator-first static artifact loop.
- TS/JS/Vue dynamic evidence has reached the intended pre-Python baseline.
- Proposed Python v0 adds only `.py` discovery, conservative static import extraction, and repository-local Python module/package resolution.
- It avoids Python execution, dependency installs, runtime importlib recovery, sys.path/site-packages, framework conventions, new `.axi` syntax, new gate semantics, MCP changes, and baseline schema changes.
- The first real calibration target is a read-only source-only scan of `C:/Users/.../Desktop/dcbot`.

## Forecast Result

Verdict: KEEP
Confidence: High
Why: The scope is tightly constrained to only observable static imports and local resolution, no new dependencies, no .axi changes, no dynamic warnings. It minimises risk while giving useful Python evidence for Axiom's declared-vs-observed workflow.
Risks:
- Repository-local resolver may mis-map relative imports if package boundaries are misjudged (e.g., missing __init__.py conventions).
- Silent absence of third-party/site-packages imports could produce incomplete graphs for projects with dependencies, but that is accepted debt per design.
- Scanner dispatch must remain purely additive to avoid regressions in existing TS/JS/Vue.
Recommendation: Proceed as is. Add a small battery of synthetic fixtures plus read-only dcbot smoke to verify import resolution accuracy before merging. No cuts needed; the plan is already minimal.

## Adopted Interpretation

Proceed only if implementation stays inside the narrow static Python import graph scope. The first pass should prove source discovery, import extraction, repository-local resolution, and existing graph evidence integration before any Python dynamic/runtime semantics are considered.
