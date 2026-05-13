# ofetch and Preact Signals Pilot Rerun

Generated: 2026-05-13

This rerun checked the post-`3cdf4ce` graph-reading and deep-import confidence changes against small public repositories. It used clone-only source scans: no target package install, no lifecycle scripts, no builds, no tests, no `npx`, and no GitHub Actions.

## Runs

| Project | Scope | Inference | Modules | Observed dependencies | Warnings | Notes |
| --- | --- | --- | ---: | ---: | ---: | --- |
| ofetch | `src/**` | folder | 1 | 0 | 0 | Quiet control; Axiom stayed silent. |
| Preact Signals | `packages/**` excluding tests/build output | workspace | 11 | 23 | 2 | One package cycle, one core fan-in warning, one debug deep import. |

## Signals

ofetch remains a useful quiet control. Under the chosen source scope it is a flat TypeScript library, so Axiom inferred one module and reported no drift pressure.

Preact Signals produced a small but useful architecture signal:

```text
collapsed cycle: SignalsDebugCycle
includes: Signals, SignalsDebug
cycle path sample: Signals -> SignalsDebug -> Signals
```

The same run reported:

- `SignalsCore` as a fan-in hub from five modules.
- One `deep_internal_import` from React runtime into debug source:
  `packages/react/runtime/src/index.ts:21` imports `../../../debug/src/devtools`.

This is not a judgment that the project is wrong. It shows that Axiom can surface a package-level source relationship and keep the evidence tied to exact files.

## Product Notes

- The rerun exposed a naming polish issue: `Signals` plus `SignalsDebug` previously became `SignalsSignalsDebug`. Collapsed-cycle naming now removes duplicated shared prefixes and emits `SignalsDebugCycle`.
- `deep_internal_import` details now keep same-source-group entrypoint advice separate from other module entrypoints so agents do not rewrite imports toward an unrelated public boundary.
- The safe pilot posture should remain the default for public repo calibration while supply-chain risk is high: clone source only and run local Axiom analysis.
