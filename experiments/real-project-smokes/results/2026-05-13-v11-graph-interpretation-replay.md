# v11 Graph Interpretation Replay

Generated: 2026-05-13

This replay reran two clone-only real-project diff smokes after `architectureSummary.interpretation` moved to graph JSON schema `axiom.graph.v11`.

The goal was narrow: verify that the new interpretation layer helps both quiet scans and signal-bearing scans explain what to inspect next. This is not a benchmark, package safety endorsement, or maintainer-intent claim.

Safety posture:

- Clone source only with shallow `git clone`.
- Do not run target package installs, lifecycle scripts, builds, tests, `npx`, submodules, or GitHub Actions.
- Treat inferred contracts as current-graph snapshots, not recommended architecture.

## Runs

| Project | Refs | Scope | Inference | Modules | Observed imports | Drift | Warnings |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| ofetch | `v1.4.0 -> v1.5.1` | `src/**` | folder, depth 2 | 1 -> 1 | 0 -> 0 | 0 | 0 |
| Preact Signals | `@preact/signals@2.7.0 -> @preact/signals@2.9.0` | `packages/*/src/**` | workspace | 8 -> 8 | 12 -> 17 | 1 new edge | 1 |

## Interpretation Check

The ofetch replay is the quiet-control case. The v11 observe summary did not stop at a vague "no findings" message. It told the reviewer that the scan did not observe cross-module imports, asked them to confirm the scope covers the architecture they care about, and suggested saving a baseline only if that shape is intended.

The Preact Signals replay is the signal-bearing case. The v11 observe summary called out the failing contract, named `Signals` as the graph center, and kept the exact evidence attached:

```text
Signals -> SignalsDebug
packages/preact/src/internal.ts:3 importing ../../debug/src/devtools
```

The same edge appeared as baseline drift and as a `deep_internal_import` advisory warning. That is the desired layered reading: hard baseline-spec mismatch, advisory public-entry bypass pressure, exact import site, and a conservative interpretation paragraph.

## Product Learning

- Quiet output needs a next review step. The current v11 wording is better because it asks users to check scope and expected shape before saving a baseline.
- Graph interpretation is useful as translation, not judgment. It should keep pointing at exact evidence instead of becoming a health score.
- The read-the-graph guide and pilot card should send first-time users through the same path: hard signals, graph center, shape fit.

Raw artifacts:

- [ofetch v11 interpretation replay](ofetch-src-v11-interpretation-2026-05-13.md)
- [Preact Signals v11 interpretation replay](preact-signals-src-v11-interpretation-2026-05-13.md)
