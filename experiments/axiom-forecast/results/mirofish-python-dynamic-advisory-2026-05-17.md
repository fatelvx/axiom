# MiroFish Targeted Backtest: Python Dynamic Advisory Evidence

Date: 2026-05-17

Method: compact direct MiroFish-style forecast using the local configured model endpoint. This is synthetic forecast pressure, not real user research or demand proof.

Seed summary:

- Python scanner v0 is static-only, repo-local, and already has a spec-first pilot proving ordinary `.axi` hard-gate value.
- Proposed patch: add Python graph-completeness evidence without runtime resolution.
- Literal `importlib.import_module("...")` and `__import__("...")` calls may become observed `dynamic_import` edges when the literal resolves inside the repo.
- Non-literal `importlib.import_module(expr)` and `__import__(expr)` calls become opt-in `dynamic_dependency_expression` warnings.
- Bare unresolved Python imports should stay conservative: no third-party noise, no runtime `sys.path`, no virtualenv/site-packages.

## Forecast Result

Verdict: KEEP
Confidence: 0.85

Main value:

The patch makes static graph incompleteness visible without overpromising runtime import recovery. It improves trust by showing what the Python graph can see and what it cannot see.

Risks:

- False-positive noise from benign dynamic expressions.
- Users may misread advisory warnings as hard failures.
- Bare unresolved Python heuristics can misfire in hybrid repos.

Required guardrails:

- Keep the warnings opt-in.
- Do not create observed edges for non-literal calls.
- Do not add `.axi` syntax, gates, dependency installs, target execution, virtualenv/site-packages inspection, framework plugin loaders, or runtime `sys.path` modelling.
- Include bare unresolved Python imports only under a conservative internal-root prefix heuristic; defer broader bare-import warnings if noisy.

## Adopted Interpretation

Implement literal Python dynamic import calls as observed syntax evidence and non-literal calls as graph-completeness warnings. Keep unresolved bare Python import warnings limited to configured-root prefixes and relative imports.
