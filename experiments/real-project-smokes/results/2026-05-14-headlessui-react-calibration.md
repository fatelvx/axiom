# Headless UI React Calibration

Date: 2026-05-14

Repository: `https://github.com/tailwindlabs/headlessui.git`

Refs: `@headlessui/react@v2.2.8` -> `@headlessui/react@v2.2.9`

This run calibrates Axiom on a UI component library package with component modules, hooks, internal helpers, state machines, utilities, and a package-level public entry point.

It is not a verdict about Headless UI's architecture or maintainer intent. The runs were source-scoped probes used to test Axiom's artifact loop and advisory signal shape.

## Safety Posture

- Clone-only shallow Git checkouts.
- No target repository installs.
- No target package-manager lifecycle scripts.
- No target builds, tests, `npx`, submodules, or GitHub Actions.
- Axiom used its existing local dependency tree and built CLI.

## Source Scope

The source-scoped diff smoke used:

```text
include: packages/@headlessui-react/src/**
exclude: packages/@headlessui-react/src/**/*.test.ts
exclude: packages/@headlessui-react/src/**/*.test.tsx
exclude: packages/@headlessui-react/src/**/*.spec.ts
exclude: packages/@headlessui-react/src/**/*.spec.tsx
exclude: packages/@headlessui-react/src/test-utils/**
```

Inference used `--group-by folder --group-depth 4` so root-relative grouping could reach `packages/@headlessui-react/src/<group>`.

## Diff Smoke Result

The repeatable diff smoke produced a quiet post-collapse graph:

| Ref | Commit | Modules | Observed imports | Baseline-spec violations | Warnings |
| --- | --- | ---: | ---: | ---: | ---: |
| `@headlessui/react@v2.2.8` | `8759a5c` | 1 | 0 | 0 | 0 |
| `@headlessui/react@v2.2.9` | `589ea90` | 1 | 0 | 0 | 0 |

Drift:

- 0 new observed module edges.
- 0 removed observed module edges.

This output is technically correct but not the full story. `axi infer` saw 160 source files and 791 imports, then collapsed 6 candidate source groups into one cycle:

- `PackagesHeadlessuiReactSrc`
- `PackagesHeadlessuiReactSrcComponents`
- `PackagesHeadlessuiReactSrcHooks`
- `PackagesHeadlessuiReactSrcInternal`
- `PackagesHeadlessuiReactSrcMachines`
- `PackagesHeadlessuiReactSrcUtils`

Once the starter contract collapses those groups into `PackagesCycle`, later graph and diff output has no internal module edges to compare. That is adoption-safe, because the inferred contract will not fail immediately, but it means the artifact loop should preserve inference review evidence when collapsed cycles appear.

Top cycle-breaking candidates from inference:

| Candidate edge | Import sites | Example evidence |
| --- | ---: | --- |
| `Components -> Hooks` | 194 | `components/button/button.tsx:6` imports `../../hooks/use-active-press` |
| `Components -> Utils` | 98 | `components/button/button.tsx:10` imports `../../utils/render` |
| `Components -> Internal` | 54 | `components/button/button.tsx:8` imports `../../internal/disabled` |
| `Components -> SrcRoot` | 34 | `components/combobox/combobox.tsx:62` imports `../../react-glue` |
| `Hooks -> Utils` | 28 | `hooks/document-overflow/handle-ios-locking.ts:1` imports `../../utils/disposables` |

Large-file pressure notes from inference:

| File | Lines | Function-like nodes |
| --- | ---: | ---: |
| `packages/@headlessui-react/src/components/combobox/combobox.tsx` | 1683 | 88 |
| `packages/@headlessui-react/src/components/popover/popover.tsx` | 1123 | 57 |
| `packages/@headlessui-react/src/components/listbox/listbox.tsx` | 1097 | 54 |
| `packages/@headlessui-react/src/components/menu/menu.tsx` | 922 | 51 |

## Public Surface Probe

Public API warnings require active `exposes` rules, so the inferred contract correctly stayed quiet. A separate external probe contract declared only the React package source and its package entry point:

```axi
module HeadlessReactSrc
path "packages/@headlessui-react/src/**"
exposes "packages/@headlessui-react/src/index.ts"
```

Against `@headlessui/react@v2.2.9`, this produced 22 advisory warnings:

- `broad_public_surface`: 21 warnings from `packages/@headlessui-react/src/index.ts`.
- `public_entrypoint_coupling`: 1 warning; the public entry point reaches 25 internal files.

This is the expected product shape. Axiom does not infer public API intent on the user's behalf, but once a user or probe contract declares an entry point, it can show broad barrel and facade pressure without making it a hard gate.

## Calibration Classification

- Repo shape: UI component library package inside a monorepo, with components, hooks, internal helpers, machines, utilities, and a root public facade.
- Safety posture: clone-only, no target installs, no target scripts, no submodules.
- Scope question: can the Evidence Artifact Loop make a component-library source graph and public entry point reviewable?
- Axiom command surface: `axi infer --group-by folder --group-depth 4`, `axi graph --json`, `axi diff`, `axi observe --baseline`, `--include`, `--exclude`, `--warn-public-api-surface`.
- Main signal: the post-collapse diff graph is quiet, but inference shows a real 6-group cycle with concrete cycle-breaking candidates; the public-surface probe shows a 21-line barrel facade and one 25-target public entry point.
- Gap class: `advisory-signal-calibration` plus artifact completeness guidance for collapsed-cycle inference evidence.
- Decision: do not change validator behavior from this run. Update adoption guidance so inferred collapsed-cycle evidence is preserved alongside the graph baseline, and keep public API warnings opt-in through explicit `exposes` or probe contracts.
- Code changed: no validator code.
- Follow-up: consider adding infer summary fields to future diff-smoke reports so a collapsed starter contract does not look like a truly empty architecture graph.

## Linked Artifacts

- Machine summary: `headlessui-react-src-depth4-diff-smoke-2026-05-14.json`
- Human summary: `headlessui-react-src-depth4-diff-smoke-2026-05-14.md`
- Mermaid graph: `headlessui-react-src-depth4-diff-smoke-2026-05-14.mmd`
