# eslint-lib Diff Architecture Smoke

Generated (UTC): 2026-05-14T08:00:25.049Z
Repository: https://github.com/eslint/eslint.git
Baseline: v9.39.3 (a7d5fe6)
Current: v9.39.4 (f5770b0)
Source scope: include lib/**; exclude tests/**, docs/**, tools/**, fixtures/**
Inference: group-by folder, group-depth 2

This is a smoke test, not a verdict. The baseline contract is inferred from the baseline ref and reused as an external `--spec` against the current ref.
Baseline-spec violations are mismatches against that inferred baseline contract, not judgments about the target repository.

## Summary

| Ref | Commit | Package | Modules | Observed imports | Baseline-spec violations | Warnings |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| v9.39.3 | a7d5fe6 | 9.39.3 | 5 | 66 | 0 | 16 |
| v9.39.4 | f5770b0 | 9.39.4 | 5 | 66 | 0 | 16 |

## Calibration Classification

- Repo shape: Large npm-style JavaScript tooling repository with rule, linter, config, and CLI library modules
- Safety posture: Clone-only source scan; no target installs, package-manager scripts, target tests, target builds, submodules, or npx were run.
- Scope question: Can an inferred lib-scope baseline make patch-version architecture drift reviewable in a large tooling package without target installs?
- Axiom command surface: axi infer --json + axi graph --json + axi diff + axi observe --baseline
- Main signal: This run calibrates large tooling-source drift, collapsed-cycle evidence, and advisory warning volume before any resolver changes.
- Gap class: advisory-signal-calibration
- Decision: Do not change validator behavior from this run alone; use it to compare large tooling pressure with quieter framework controls.
- Code changed: No Axiom code changed; this is a no-install calibration run.
- Follow-up: Check whether any warning pattern repeats across other large tooling or non-pnpm workspace smokes before changing defaults.

## Baseline Inference

- Source files: 392
- Imports scanned: 819
- Candidate modules: 10
- Emitted modules: 5
- Inferred observed dependencies: 9
- Collapsed cycles: 1
- Architecture pressure notes: 8

### Inference Review Story
- Summary: Starter contract inferred 5 modules and 9 observed module edges from 392 source files.
- Setup: Scanned 392 source files and 819 imports; 10 candidate groups became 5 starter modules. This is a current-graph snapshot, not declared architecture intent yet.
- `Collapsed cycle: LibCycle` (warning): 1 cycle was merged so the starter contract mirrors current code without immediately failing on declared dependency cycles. Review cycle-breaking candidates before treating the merged module as intended architecture.
  - modules: `LibCycle`
- `Large-file pressure in inferred scope` (warning): 8 large source files may hide responsibilities that folder and import inference cannot split. Inspect these files before judging the starter module map as complete.
  - files: `lib/rules/utils/ast-utils.js`, `lib/linter/linter.js`, `lib/linter/code-path-analysis/code-path-state.js`, `lib/rules/indent.js`, `lib/rules/no-unused-vars.js`, `lib/rules/no-extra-parens.js`, `lib/rule-tester/rule-tester.js`, `lib/eslint/eslint-helpers.js`
- `Review inferred dependencies` (info): 9 observed module edges became `depends on` lines with sample import evidence. Confirm each edge is intended before using this draft as a gate.
  - modules: `Lib`, `LibCycle`, `LibRuleTester`, `LibRules`, `LibShared`
- Next step: Review collapsed-cycle candidates and large-file pressure notes, then run `axi observe --root . --spec <draft.axi> --markdown` before saving a graph baseline.
- Caveat: Inference reads static imports and folder/package shape. It can lower authoring cost, but humans still decide module names, visibility, layers, accepted debt, and which edges are real architecture intent.

### Collapsed Cycles
- `LibCycle`: 6 source groups merged.
  - groups: `LibCliEngine`, `LibConfig`, `LibEslint`, `LibLanguages`, `LibLinter`, `LibServices`
  - candidate `LibEslint -> LibConfig`: 4 import sites; sample `lib/eslint/eslint-helpers.js:23` importing `../config/config-loader`
  - candidate `LibLinter -> LibConfig`: 4 import sites; sample `lib/linter/apply-disable-directives.js:22` importing `../config/config.js`
  - candidate `LibEslint -> LibCliEngine`: 3 import sites; sample `lib/eslint/eslint-helpers.js:17` importing `../cli-engine/hash`
  - candidate `LibEslint -> LibLinter`: 3 import sites; sample `lib/eslint/eslint-helpers.js:20` importing `../linter`
  - candidate `LibLinter -> LibServices`: 3 import sites; sample `lib/linter/linter.js:56` importing `../services/parser-service`

### Intra-File Pressure Notes
- `lib/rules/utils/ast-utils.js`: 2734 lines, 93 function-like nodes, 7 imports
- `lib/linter/linter.js`: 2677 lines, 90 function-like nodes, 33 imports
- `lib/linter/code-path-analysis/code-path-state.js`: 2371 lines, 63 function-like nodes, 2 imports
- `lib/rules/indent.js`: 2335 lines, 91 function-like nodes, 1 imports
- `lib/rules/no-unused-vars.js`: 1740 lines, 53 function-like nodes, 1 imports
- `lib/rules/no-extra-parens.js`: 1670 lines, 85 function-like nodes, 2 imports
- `lib/rule-tester/rule-tester.js`: 1580 lines, 69 function-like nodes, 16 imports
- `lib/eslint/eslint-helpers.js`: 1466 lines, 59 function-like nodes, 14 imports

## Drift

- New observed edges: 0
- Removed observed edges: 0

### New Observed Edges
- None

### Removed Observed Edges
- None

## Advisory Warnings

- Warning counts: coupling_concentration: 2, deep_internal_import: 14
- `coupling_concentration` at `no location`: Lib has concentrated fan-out to 4 modules. Observed: Lib fan-out to 4 modules.
- `coupling_concentration` at `no location`: LibShared has concentrated fan-in from 4 modules. Observed: LibShared fan-in from 4 modules. Incoming: Lib, LibCycle, LibRuleTester, LibRules.
- `deep_internal_import` at `lib/api.js:12`: Lib imports LibCycle through a deep relative path instead of a likely source-group entry point. Observed: Lib -> LibCycle deep internal import. Edge: Lib -> LibCycle.
- `deep_internal_import` at `lib/api.js:13`: Lib imports LibCycle through a deep relative path instead of a likely source-group entry point. Observed: Lib -> LibCycle deep internal import. Edge: Lib -> LibCycle.
- `deep_internal_import` at `lib/cli.js:27`: Lib imports LibCycle through a deep relative path instead of a likely source-group entry point. Observed: Lib -> LibCycle deep internal import. Edge: Lib -> LibCycle.
- `deep_internal_import` at `lib/cli.js:32`: Lib imports LibCycle through a deep relative path instead of a likely source-group entry point. Observed: Lib -> LibCycle deep internal import. Edge: Lib -> LibCycle.
- `deep_internal_import` at `lib/cli.js:33`: Lib imports LibCycle through a deep relative path with no clear source-group entry point. Observed: Lib -> LibCycle deep internal import. Edge: Lib -> LibCycle.
- `deep_internal_import` at `lib/cli.js:223`: Lib imports LibCycle through a deep relative path with no clear source-group entry point. Observed: Lib -> LibCycle deep internal import. Edge: Lib -> LibCycle.
- `deep_internal_import` at `lib/rule-tester/rule-tester.js:18`: LibRuleTester imports LibCycle through a deep relative path with no clear source-group entry point. Observed: LibRuleTester -> LibCycle deep internal import. Edge: LibRuleTester -> LibCycle.
- `deep_internal_import` at `lib/rule-tester/rule-tester.js:20`: LibRuleTester imports LibCycle through a deep relative path instead of a likely source-group entry point. Observed: LibRuleTester -> LibCycle deep internal import. Edge: LibRuleTester -> LibCycle.
- `deep_internal_import` at `lib/rule-tester/rule-tester.js:23`: LibRuleTester imports LibCycle through a deep relative path with no clear source-group entry point. Observed: LibRuleTester -> LibCycle deep internal import. Edge: LibRuleTester -> LibCycle.
- `deep_internal_import` at `lib/rule-tester/rule-tester.js:27`: LibRuleTester imports LibCycle through a deep relative path with no clear source-group entry point. Observed: LibRuleTester -> LibCycle deep internal import. Edge: LibRuleTester -> LibCycle.
- `deep_internal_import` at `lib/universal.js:8`: Lib imports LibCycle through a deep relative path instead of a likely source-group entry point. Observed: Lib -> LibCycle deep internal import. Edge: Lib -> LibCycle.
- `deep_internal_import` at `lib/unsupported-api.js:14`: Lib imports LibCycle through a deep relative path instead of a likely source-group entry point. Observed: Lib -> LibCycle deep internal import. Edge: Lib -> LibCycle.
- `deep_internal_import` at `lib/unsupported-api.js:15`: Lib imports LibCycle through a deep relative path instead of a likely source-group entry point. Observed: Lib -> LibCycle deep internal import. Edge: Lib -> LibCycle.
- `deep_internal_import` at `lib/unsupported-api.js:16`: Lib imports LibCycle through a deep relative path instead of a likely source-group entry point. Observed: Lib -> LibCycle deep internal import. Edge: Lib -> LibCycle.

## Timings

- Clone baseline: 28478.4ms
- Clone current: 23822.5ms
- Infer baseline contract: 2053.8ms
- Baseline graph: 1934.2ms
- Diff JSON: 1890.7ms
- Observe Markdown: 2060.6ms

## Caveats

- The inferred baseline contract mirrors the baseline ref's current graph; it is not maintainer-declared architecture intent.
- New or removed edges are advisory drift signals, not automatic good/bad judgments.
- Warning counts are advisory pressure signals and do not fail CI by themselves.
- Use this harness to calibrate Axiom behavior before turning any signal into a hard gate.
