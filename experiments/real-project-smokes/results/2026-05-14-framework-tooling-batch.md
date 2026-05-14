# Framework And Tooling Calibration Batch, 2026-05-14

This batch expands the calibration portfolio across framework, tooling, and small package shapes using the repeatable diff smoke harness.

Safety posture for all completed runs:

- Clone-only source scans.
- No target repository installs.
- No target package-manager scripts, builds, tests, GitHub Actions, submodules, or `npx`.
- Local Axiom build only.

## Results

| Run | Shape | Scope | Drift | Warnings | Inference evidence | Classification |
| --- | --- | --- | ---: | ---: | --- | --- |
| [Express lib](express-lib-diff-smoke-2026-05-14.md) | CJS Node web framework package | `lib/**` | +0 / -0 | 1 deep internal import | 11 files, 86 imports, 1 large-file pressure note | quiet-control / advisory-signal-calibration |
| [Fastify lib](fastify-lib-diff-smoke-2026-05-14.md) | Node web framework runtime package | `lib/**` | +0 / -0 | 0 | 28 files, 101 imports, 2 large-file pressure notes | quiet-control / advisory-signal-calibration |
| [ESLint lib](eslint-lib-diff-smoke-2026-05-14.md) | large JavaScript tooling package | `lib/**` | +0 / -0 | 16 | 392 files, 819 imports, 1 collapsed cycle, 8 large-file pressure notes | advisory-signal-calibration |
| [SvelteKit source](sveltekit-src-diff-smoke-2026-05-14.md) | framework package source inside a larger repo | `packages/kit/src/**` excluding tests/specs | +0 / -0 | 0 | 193 files, 540 imports, 4 large-file pressure notes | quiet-control / scan-scope |
| [UUID source](uuid-src-diff-smoke-2026-05-14.md) | small TypeScript package with mixed package export surface | `src/**` excluding source-tree tests | +0 / -0 | 0 | 27 files, 61 imports | quiet-control / scan-scope |

## Calibration Classification

- Repo shape: Framework, tooling, and small package source batch.
- Safety posture: Clone-only source scans; no target installs or target scripts.
- Scope question: Can the evidence artifact loop stay useful across CJS framework code, Node framework runtime code, large tooling libraries, framework package source, and a small mixed package surface?
- Axiom command surface: `axi infer --json` + `axi graph --json` + `axi diff` + `axi observe --baseline`.
- Main signal: The batch produced three quiet controls, one low-noise CJS framework advisory, and one larger tooling pressure case without requiring validator behavior changes.
- Gap class: quiet-control / advisory-signal-calibration / scan-scope.
- Decision: Do not change validator or resolver behavior from this batch. Keep advisory warnings opt-in and continue portfolio expansion.
- Code changed: No validator behavior changed; only calibration artifacts and documentation should change.
- Follow-up: Retry a package-manager workspace such as npm CLI with a short work directory or long-path-safe setup, then add app-repo and generated-code-heavy coverage.

## Notes

The initial SvelteKit and UUID attempts showed source-tree tests can live under ordinary source folders without `.test.*` naming. The final committed runs excluded those folders explicitly. This reinforces that scan scope is part of the pilot question, not a reason to add broad default ignores.

An npm CLI workspace attempt did not reach Axiom because Windows checkout failed on a very deep fixture path before source scanning began. Treat that as a local harness/environment lesson, not a target-repository architecture signal.
