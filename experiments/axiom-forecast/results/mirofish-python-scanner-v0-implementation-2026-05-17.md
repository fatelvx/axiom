# MiroFish Targeted Backtest: Python Scanner v0 Implementation

Date: 2026-05-17

Method: compact direct MiroFish-style LLMClient-compatible forecast using the local configured model endpoint. This is synthetic forecast pressure, not real user research or demand proof. The endpoint returned normal final content; the text below is sanitized for encoding and project privacy.

Seed summary:

- Axiom remains validator-first: `.axi` contract + source scanner -> declared graph vs observed graph -> hard violations, visible intentional debt, advisory evidence.
- The implementation adds `.py` source discovery and a conservative static Python scanner for `import ...`, `from ... import ...`, aliases, multiline from-imports, explicit relative imports, and basic function/class metrics.
- Python resolution is repo-local only: root, `src`, immediate `src/*`, `.py` modules, and package `__init__.py`. Nearest source root wins; sibling-root fallback must be unique; ambiguous sibling matches remain unresolved.
- Python cache/venv folders and `.pyi` type stubs are skipped.
- Python imports participate in the same observed graph and can trigger existing `.axi` violations when both files are owned.
- No Python execution, dependency installs, virtualenv/site-packages inspection, runtime `sys.path` modelling, `importlib` recovery, framework/plugin heuristics, new `.axi` syntax, new gate semantics, MCP changes, or baseline schema changes.
- A read-only smoke on a private all-Python project saw 27 source files, 169 imports, 4 inferred modules, and 4 observed module edges without target-repo writes.
- Verification passed with `npm test`, `npm run axiom:self`, `npm run axiom:self:artifact`, `npm run spec-first:smoke`, and `npm run mcp:conformance:smoke`.

## Forecast Result

Verdict: KEEP
Confidence: High

Main adoption value:

The change expands Axiom's static architecture observability to Python while preserving the same validator model. The conservative no-runtime scope lowers risk and demonstrates that the scanner model can extend to a second language without changing contracts, gates, MCP, or evidence schemas.

Main risks:

- False negatives remain for third-party dependencies, virtual environments, runtime `sys.path`, `importlib`, and framework/plugin loading.
- Source-root collisions can leave imports unresolved; this is intentional, but users may need clearer configuration later.
- Resolver maintainability should be watched as language support grows. The Python resolver extraction reduces this immediate pressure.

Required patch before commit:

None. The forecast accepted the current implementation after the full verification pass.

## Adopted Interpretation

Keep the patch. Do not adopt the forecast's aggressive next-step suggestion to inspect virtual environments or site-packages yet; that would cross Axiom's current no-execution, no-install, repo-local scanner boundary. The safer next Python steps are source-root configuration, Python unresolved/dynamic advisory evidence, or a small Python spec-first pilot if real-project evidence asks for it.
