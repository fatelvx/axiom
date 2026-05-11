# MiroFish Coupling Warning Backtest

Date: 2026-05-11

Product snapshot:

```text
https://github.com/fatelvx/axiom
commit c9f3460 Add coupling concentration warnings
```

## What Changed Before This Backtest

This backtest was run after a real implementation change.

Implemented change:

- Added `--warn-coupling-concentration`.
- Added `warnCouplingConcentration` project config.
- Added `coupling_concentration` as an opt-in advisory warning.
- The first detector warns when observed module fan-in is at least 4 distinct modules or observed fan-out is at least 4 distinct modules.
- The warning does not fail `axi check`.

Product boundary:

```text
This is a pressure signal, not a bad-architecture verdict.
```

## Method

Used the existing local MiroFish forecast graph and ReportAgent rather than rerunning ontology generation.

Local MiroFish context:

```text
graph_id=mirofish_2a0d62ee48ed43be
simulation_id=sim_0744c54e88e4
model configuration=unchanged from the previous DeepSeek Pro local run
```

The prompt asked for a targeted risk-map review of the new coupling concentration warning, with one requested small follow-up fix and explicit "do not change" guidance.

## Main Result

The backtest did not reject coupling concentration as a signal, but it warned that the implementation could be attacked as arbitrary or noisy if the CLI does not explain why the warning fired.

Strongest risk:

- A simple numeric fan-in/fan-out threshold can look like another noisy linter.
- Skeptical engineers may ask why `4` is meaningful.
- DevOps/CI owners may fear warning pile-up.
- The warning does not solve `symbol-level API health`; it only exposes one graph pressure pattern.

## Actionable Interpretation

Absorb the problem, not the whole answer.

Do:

- Keep the signal opt-in.
- Make the warning explain itself in `axi observe` and focused graph output.
- Show the observed trigger, threshold, and involved modules so the warning is reviewable.

Do not:

- Turn coupling concentration into a hard gate.
- Claim it proves semantic architecture health.
- Jump straight to broad symbol-level analysis.
- Tune the threshold aggressively before testing it on more realistic projects.

## Follow-Up Taken

The next repair was intentionally small:

- Human focused graph / observe warning output now includes `observed` context when a warning has it.
- Coupling concentration warnings now show the fan-in/fan-out threshold.
- Coupling concentration warnings now show the involved fan-in and fan-out module names when available.

This directly addresses the backtest's "arbitrary threshold / noisy linter" risk without changing validation semantics.

## Caveat

This was a targeted synthetic backtest using an existing MiroFish forecast graph. It is a risk map, not real user research or market proof.
