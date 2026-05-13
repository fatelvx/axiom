# Zustand And Hono Diff Smokes

Generated: 2026-05-13

This run extended the real-project smoke set with two safe clone-only checks:

- `pmndrs/zustand` from `v5.0.1` to `v5.0.13`
- `honojs/hono` from `v4.8.4` to `v4.9.12`

Safety rule: these runs used shallow Git clones and Axiom static scanning only. They did not run target repository package installs, `npx`, builds, tests, lifecycle scripts, submodules, or GitHub Actions.

## Results

| Project | Scope | Baseline -> Current | Modules | Observed imports | Drift | Warnings |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| zustand | whole repo | `v5.0.1` -> `v5.0.13` | 5 -> 5 | 36 -> 40 | 0 new, 0 removed | 0 |
| hono | whole repo | `v4.8.4` -> `v4.9.12` | 6 -> 6 | 85 -> 77 | 0 new, 2 removed | 38 |
| hono | `src/**` only | `v4.8.4` -> `v4.9.12` | 3 -> 3 | 14 -> 14 | 0 new, 0 removed | 6 |

## Signal

Zustand is useful as a low-noise control. Axiom saw more import sites in the newer tag, but no new or removed module edges and no advisory warnings. That is the behavior we want from an observability tool: quiet when the inferred architecture shape stays stable.

Hono whole-repo scanning produced two removed observed edges in test/config areas:

- `RuntimeTests -> Vitest`
- `Vitest2 -> Vitest`

It also produced 38 advisory warnings, mostly from runtime tests and benchmarks importing Hono source internals or generated/dist paths. This is not a verdict against Hono; it shows that whole-repo scans can reveal how tests, benchmarks, and runtime harnesses intentionally reach into source internals.

The Hono `src/**` scoped run separated production-source architecture from test/benchmark architecture. It showed no version-to-version module-edge drift and six stable `deep_internal_import` warnings from `src/preset/quick.ts` and `src/preset/tiny.ts` into the collapsed source core cycle.

## Product Learnings

- Scope control matters. A pilot should be able to compare whole-repo, production-source, test, and benchmark views without rewriting the target repository.
- Quiet output is evidence too. Zustand's zero-drift result helps validate that Axiom does not need to invent findings.
- Deep internal import warnings are useful, but role context matters. Runtime tests and benchmarks often intentionally import internal source paths.
- Large mixed source cycles need readable names. The Hono `src/**` run exposed a fallback name like `CycleGroupAdapterAnd8More`; this was tightened to `MixedCycle` so reports remain readable.

## Artifacts

- [zustand diff smoke](zustand-diff-smoke-2026-05-13.md)
- [hono whole-repo diff smoke](hono-diff-smoke-2026-05-13.md)
- [hono source-scoped diff smoke](hono-src-diff-smoke-2026-05-13.md)
