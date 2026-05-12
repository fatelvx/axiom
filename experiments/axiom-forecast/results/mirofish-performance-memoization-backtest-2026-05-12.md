# MiroFish Performance Memoization Backtest

Date: 2026-05-12

Product snapshot:

```text
https://github.com/fatelvx/axiom
commit 108aed9 Memoize ownership lookups
```

## What Changed Before This Backtest

This backtest was run after a real implementation change.

Implemented change:

- Added ownership lookup memoization inside the validator ownership index.
- Recorded synthetic performance smoke evidence.
- Reduced the local 10k-file synthetic `axi check` duration from 78.7s to 10.0s in the same smoke harness.
- Kept the public caveat that synthetic smoke evidence is not proof of broad production monorepo readiness.

## Method

Ran a small targeted backtest through the local MiroFish runtime configuration:

```text
runner=direct MiroFish LLMClient
model configuration=unchanged from the previous DeepSeek Pro local run
full OASIS simulation=not run
```

The prompt asked five stakeholder lenses to pressure-test the product after the performance fix: senior monorepo platform engineer, AI coding tool builder, skeptical static-analysis researcher, early adopter tech lead, and open-source maintainer evaluating CI friction.

Local raw artifacts:

```text
axiom_forecast_outputs_performance/performance_memoization_backtest.md
axiom_forecast_outputs_performance/performance_memoization_backtest.json
```

## Main Result

The backtest accepted the performance fix as a material adoption-risk reduction. The simulated response treated the 10k-file result as moving Axiom from "likely CI blocker" toward "trialable in a PR workflow."

The pressure did not disappear. It shifted:

- Static-analysis blind spots became the highest-signal objection.
- `.axi` contract maintenance cost stayed important.
- Advisory warnings can still be misread as urgent failures.
- `symbol-level API health` remains a named credibility gap.

The most actionable signal was not to add a hidden allowlist or a broad semantic engine. The useful problem was narrower: when Axiom can see a static internal-looking import but cannot resolve it, the observed graph may be incomplete and users should be able to surface that gap explicitly.

## Follow-Up Taken

The follow-up repair was intentionally small:

- Added opt-in `--warn-unresolved-imports`.
- Added config `warnUnresolvedImports`.
- The warning only applies to owned files with static relative imports or package `#imports` that Axiom can see but cannot resolve.
- The warning is advisory and does not fail `axi check` by itself.
- The diagnostic includes the import site and specifier so it remains actionable instead of becoming vague blind-spot noise.

This absorbs the backtest's "static blind spot visibility" problem without copying its proposed TOML-style `[unobservable-imports]` syntax, adding hidden escape hatches, or pretending Axiom can observe non-literal runtime dependency injection.

## Caveat

This was a targeted synthetic backtest, not real user research. It is useful as a pressure map for the next adoption blocker after performance, not as market proof.
