# npm-cli-workspaces Diff Architecture Smoke

Generated (UTC): 2026-05-18T16:17:39.386Z
Repository: https://github.com/npm/cli.git
Baseline: v11.14.0 (409a717)
Current: v11.14.1 (0fc09e8)
Source scope: include lib/**, workspaces/*/lib/**; exclude test/**, **/test/**, **/*.test.js, **/*.spec.js, docs/**, tap-snapshots/**, **/tap-snapshots/**, node_modules/**, **/node_modules/**
Inference: group-by workspace

This is a smoke test, not a verdict. The baseline contract is inferred from the baseline ref and reused as an external `--spec` against the current ref.
Baseline-spec violations are mismatches against that inferred baseline contract, not judgments about the target repository.

## Summary

| Ref | Commit | Package | Modules | Observed imports | Baseline-spec violations | Warnings |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| v11.14.0 | 409a717 | 11.14.0 | 13 | 48 | 0 | 2 |
| v11.14.1 | 0fc09e8 | 11.14.1 | 13 | 48 | 0 | 2 |

## Calibration Classification

- Repo shape: npm workspaces package-manager monorepo with root CLI source and workspace package lib folders
- Safety posture: Clone-only source scan; no target installs, package-manager scripts, target tests, target builds, submodules, or npx were run.
- Scope question: Can a package-json workspace inferred baseline make patch-version source drift reviewable without target installs?
- Axiom command surface: axi infer --json + axi graph --json + axi diff + axi observe --baseline
- Main signal: Workspace inference handled the root CLI lib plus 12 workspace package lib folders across a patch range with 0 observed edge drift; only Arborist fan-in and Lib fan-out remained as coupling advisories.
- Gap class: quiet-control / advisory-signal-calibration
- Decision: Record as the first non-pnpm workspace calibration; do not change resolver, scanner, or dynamic behavior from this quiet patch-range result.
- Code changed: No Axiom code changed; this is a no-install calibration run.
- Follow-up: If npm/cli is scanned again on Windows, use a short workdir because checked-in fixture paths can exceed default path limits; compare a larger minor range only if portfolio coverage needs a noisier npm-workspaces case.

## Baseline Inference

- Source files: 205
- Imports scanned: 943
- Candidate modules: 13
- Emitted modules: 13
- Inferred observed dependencies: 16
- Collapsed cycles: 0
- Architecture pressure notes: 7

### Inference Review Story
- Summary: Starter contract inferred 13 modules and 16 observed module edges from 205 source files.
- Setup: Scanned 205 source files and 943 imports; 13 candidate groups became 13 starter modules. This is a current-graph snapshot, not declared architecture intent yet.
- `Large-file pressure in inferred scope` (warning): 7 large source files may hide responsibilities that folder and import inference cannot split. Inspect these files before judging the starter module map as complete.
  - files: `workspaces/config/lib/definitions/definitions.js`, `workspaces/arborist/lib/arborist/reify.js`, `workspaces/arborist/lib/node.js`, `workspaces/arborist/lib/arborist/build-ideal-tree.js`, `workspaces/arborist/lib/shrinkwrap.js`, `workspaces/config/lib/index.js`, `workspaces/arborist/lib/query-selector-all.js`
- `Review inferred dependencies` (info): 16 observed module edges became `depends on` lines with sample import evidence. Confirm each edge is intended before using this draft as a gate.
  - modules: `Arborist`, `Config`, `Lib`, `Libnpmaccess`, `Libnpmdiff`, `Libnpmexec`, `Libnpmfund`, `Libnpmorg`, `Libnpmpack`, `Libnpmpublish`, `Libnpmsearch`, `Libnpmteam`, `Libnpmversion`
- Next step: Inspect large-file pressure notes, adjust module boundaries if needed, then run `axi observe --root . --spec <draft.axi> --markdown`.
- Caveat: Inference reads static imports and folder/package shape. It can lower authoring cost, but humans still decide module names, visibility, layers, accepted debt, and which edges are real architecture intent.

### Intra-File Pressure Notes
- `workspaces/config/lib/definitions/definitions.js`: 2518 lines, 62 function-like nodes, 7 imports
- `workspaces/arborist/lib/arborist/reify.js`: 1772 lines, 107 function-like nodes, 28 imports
- `workspaces/arborist/lib/node.js`: 1632 lines, 83 function-like nodes, 20 imports
- `workspaces/arborist/lib/arborist/build-ideal-tree.js`: 1589 lines, 61 function-like nodes, 27 imports
- `workspaces/arborist/lib/shrinkwrap.js`: 1183 lines, 47 function-like nodes, 15 imports
- `workspaces/config/lib/index.js`: 1035 lines, 79 function-like nodes, 16 imports
- `workspaces/arborist/lib/query-selector-all.js`: 959 lines, 98 function-like nodes, 9 imports

## Drift

- New observed edges: 0
- Removed observed edges: 0

### New Observed Edges
- None

### Removed Observed Edges
- None

## Advisory Signals

- Warning counts: coupling_concentration: 2
- `coupling_concentration` at `no location`: Arborist has concentrated fan-in from 5 modules. Observed: Arborist fan-in from 5 modules. Incoming: Lib, Libnpmdiff, Libnpmexec, Libnpmfund, Libnpmpack.
- `coupling_concentration` at `no location`: Lib has concentrated fan-out to 12 modules. Observed: Lib fan-out to 12 modules.

## Timings

- Clone baseline: 247629.3ms
- Clone current: 66465.5ms
- Infer baseline contract: 2117.1ms
- Baseline graph: 7286.1ms
- Diff JSON: 39559.4ms
- Observe Markdown: 18583.1ms

## Caveats

- The inferred baseline contract mirrors the baseline ref's current graph; it is not maintainer-declared architecture intent.
- New or removed edges are advisory drift signals, not automatic good/bad judgments.
- Warning counts are advisory pressure signals and do not fail CI by themselves.
- Use this harness to calibrate Axiom behavior before turning any signal into a hard gate.
