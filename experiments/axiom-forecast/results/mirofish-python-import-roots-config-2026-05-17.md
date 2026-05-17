# MiroFish Targeted Backtest: Python Import Roots Config

Date: 2026-05-17

Method: compact direct MiroFish-style LLMClient-compatible forecast using the local configured model endpoint. This is synthetic forecast pressure, not real user research or demand proof. The endpoint returned normal final content; the text below is sanitized for encoding.

Seed summary:

- Python scanner v0 is static-only, repo-local, and already verified.
- Default Python resolution checks root, `src`, and immediate `src/*` source roots with nearest-root priority and unique-only sibling fallback.
- A private Python smoke showed source-root order matters for projects that import helpers from folders such as `src/common`, `src/market`, and `src/ui`.
- Proposed patch: add optional `pythonImportRoots` to `axiom.config.json` as an ordered list of repo-relative Python static import roots.
- When omitted, defaults stay unchanged. When non-empty, configured roots replace the defaults so ambiguity can be resolved explicitly.
- No CLI flag, `.axi` grammar, gate semantics, MCP semantics, baseline schema, virtualenv/site-packages inspection, runtime `sys.path`, `importlib`, or dynamic Python recovery.

## Forecast Result

Verdict: KEEP
Confidence: 0.92

Main value:

The patch makes Python static resolution more trustworthy by replacing a hidden source-root heuristic with explicit project configuration when needed. This helps prevent silent incorrect linking in projects with duplicate helper-module names.

Risks:

- Small config parsing surface: invalid arrays, duplicates, outside-root paths, and empty arrays need predictable behavior.
- Minor documentation overhead.
- A CLI flag would add noise and is not needed yet.

Required cuts:

- Do not add a CLI flag.
- Do not use this as a path toward runtime Python resolution.

## Adopted Interpretation

Implement `pythonImportRoots` as a strict validated config array. Preserve existing defaults when omitted, use configured roots in declaration order when present, keep resolution repo-local, and add tests for explicit ambiguity override.
