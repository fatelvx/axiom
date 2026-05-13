# ofetch, ky, and Preact Signals Diff Smokes

Generated: 2026-05-13

This batch tested the repeatable `axi diff` smoke harness on small TypeScript libraries and a multi-package source tree. The goal was calibration: see when Axiom stays quiet, and see whether baseline drift plus advisory warnings can surface a concrete architecture relationship change without becoming a project verdict.

Safety posture:

- Clone source only with shallow `git clone`.
- Do not run target `npm install`, lifecycle scripts, builds, tests, `npx`, submodules, or GitHub Actions.
- Avoid namespaces currently named in public supply-chain incident reporting.
- Treat every result as scoped architecture calibration, not package safety endorsement.

## Runs

| Project | Refs | Scope | Inference | Modules | Observed imports | Drift | Warnings |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: |
| ofetch | `v1.4.0 -> v1.5.1` | `src/**` | folder, depth 2 | 1 -> 1 | 0 -> 0 | 0 | 0 |
| ky | `v1.14.0 -> v1.14.3` | `source/**` | folder, depth 2 | 1 -> 1 | 0 -> 0 | 0 | 0 |
| Preact Signals | `@preact/signals@2.7.0 -> @preact/signals@2.9.0` | `packages/*/src/**` | workspace | 8 -> 8 | 12 -> 17 | 1 new edge | 1 |

## Signals

The ofetch and ky runs are useful quiet controls. In source-scoped form, both libraries inferred to one module and produced no observed module edges or advisory warnings. Axiom did not invent architecture findings where the source shape was flat.

The Preact Signals run produced one concrete drift signal:

```text
Signals -> SignalsDebug
via packages/preact/src/internal.ts:3 importing ../../debug/src/devtools
```

Because the baseline contract was inferred from `@preact/signals@2.7.0`, the current `@preact/signals@2.9.0` source shows this as a new baseline-spec mismatch / undeclared edge. The same import is also surfaced as `deep_internal_import` because it reaches into another package's source path instead of a likely public entry point.

This is not a claim that the Preact Signals change is wrong. It shows that Axiom can make a new package-level source relationship visible and point to the exact import site that created it.

## Product Notes

- `--group-depth` support was added to the diff smoke harness after flat source libraries collapsed into one module. This makes small-library calibration more honest: the harness can now ask for finer source grouping when a repository has enough folder structure.
- Quiet controls should remain part of the evidence set. They help prove Axiom can stay silent when a project does not expose useful module boundaries under the chosen scope.
- Multi-package repositories remain better targets for validating baseline drift, external specs, and public-entry bypass warnings.

Raw artifacts:

- [ofetch source-scoped diff smoke](ofetch-src-diff-smoke-2026-05-13.md)
- [ky source-scoped diff smoke](ky-src-diff-smoke-2026-05-13.md)
- [Preact Signals source-scoped diff smoke](preact-signals-src-diff-smoke-2026-05-13.md)
