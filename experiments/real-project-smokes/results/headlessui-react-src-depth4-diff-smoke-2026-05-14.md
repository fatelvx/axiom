# headlessui-react-src-depth4 Diff Architecture Smoke

Generated (UTC): 2026-05-13T20:34:30.553Z
Repository: https://github.com/tailwindlabs/headlessui.git
Baseline: @headlessui/react@v2.2.8 (8759a5c)
Current: @headlessui/react@v2.2.9 (589ea90)
Source scope: include packages/@headlessui-react/src/**; exclude packages/@headlessui-react/src/**/*.test.ts, packages/@headlessui-react/src/**/*.test.tsx, packages/@headlessui-react/src/**/*.spec.ts, packages/@headlessui-react/src/**/*.spec.tsx, packages/@headlessui-react/src/test-utils/**
Inference: group-by folder, group-depth 4

This is a smoke test, not a verdict. The baseline contract is inferred from the baseline ref and reused as an external `--spec` against the current ref.
Baseline-spec violations are mismatches against that inferred baseline contract, not judgments about the target repository.

## Summary

| Ref | Commit | Package | Modules | Observed imports | Baseline-spec violations | Warnings |
| --- | --- | --- | ---: | ---: | ---: | ---: |
| @headlessui/react@v2.2.8 | 8759a5c | 0.0.0 | 1 | 0 | 0 | 0 |
| @headlessui/react@v2.2.9 | 589ea90 | 0.0.0 | 1 | 0 | 0 | 0 |

## Baseline Inference

- Source files: 160
- Imports scanned: 791
- Candidate modules: 6
- Emitted modules: 1
- Inferred observed dependencies: 0
- Collapsed cycles: 1
- Architecture pressure notes: 4

### Collapsed Cycles
- `PackagesCycle`: 6 source groups merged.
  - groups: `PackagesHeadlessuiReactSrc`, `PackagesHeadlessuiReactSrcComponents`, `PackagesHeadlessuiReactSrcHooks`, `PackagesHeadlessuiReactSrcInternal`, `PackagesHeadlessuiReactSrcMachines`, `PackagesHeadlessuiReactSrcUtils`
  - candidate `PackagesHeadlessuiReactSrcComponents -> PackagesHeadlessuiReactSrcHooks`: 194 import sites; sample `packages/@headlessui-react/src/components/button/button.tsx:6` importing `../../hooks/use-active-press`
  - candidate `PackagesHeadlessuiReactSrcComponents -> PackagesHeadlessuiReactSrcUtils`: 98 import sites; sample `packages/@headlessui-react/src/components/button/button.tsx:10` importing `../../utils/render`
  - candidate `PackagesHeadlessuiReactSrcComponents -> PackagesHeadlessuiReactSrcInternal`: 54 import sites; sample `packages/@headlessui-react/src/components/button/button.tsx:8` importing `../../internal/disabled`
  - candidate `PackagesHeadlessuiReactSrcComponents -> PackagesHeadlessuiReactSrc`: 34 import sites; sample `packages/@headlessui-react/src/components/button/button.tsx:9` importing `../../types`
  - candidate `PackagesHeadlessuiReactSrcHooks -> PackagesHeadlessuiReactSrcUtils`: 28 import sites; sample `packages/@headlessui-react/src/hooks/document-overflow/handle-ios-locking.ts:1` importing `../../utils/disposables`

### Intra-File Pressure Notes
- `packages/@headlessui-react/src/components/combobox/combobox.tsx`: 1683 lines, 88 function-like nodes, 53 imports
- `packages/@headlessui-react/src/components/popover/popover.tsx`: 1123 lines, 57 function-like nodes, 37 imports
- `packages/@headlessui-react/src/components/listbox/listbox.tsx`: 1097 lines, 54 function-like nodes, 51 imports
- `packages/@headlessui-react/src/components/menu/menu.tsx`: 922 lines, 51 function-like nodes, 42 imports

## Drift

- New observed edges: 0
- Removed observed edges: 0

### New Observed Edges
- None

### Removed Observed Edges
- None

## Advisory Warnings

- Warning counts: none

## Timings

- Clone baseline: 2134.1ms
- Clone current: 1960.4ms
- Infer baseline contract: 1344.4ms
- Baseline graph: 1203.9ms
- Diff JSON: 1175.8ms
- Observe Markdown: 1345.6ms

## Caveats

- The inferred baseline contract mirrors the baseline ref's current graph; it is not maintainer-declared architecture intent.
- New or removed edges are advisory drift signals, not automatic good/bad judgments.
- Warning counts are advisory pressure signals and do not fail CI by themselves.
- Use this harness to calibrate Axiom behavior before turning any signal into a hard gate.
