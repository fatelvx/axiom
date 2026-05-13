# Axiom Diff Target Pilot - 2026-05-13

Status: passed after one adoption-friction fix.

## Goal

Validate the first-value workflow introduced by `axi diff`:

```text
axi graph --json > axiom-baseline.json
make or review a change
axi diff axiom-baseline.json
```

The pilot checks whether a developer can see architecture drift before deciding whether to write stricter `.axi` rules or promote anything into `axi check`.

## Setup

- Copied `fixtures/basic-ts-valid` into a temporary pilot directory.
- Saved a graph baseline with normal PowerShell redirection:

```powershell
node dist\cli.js graph --root <temp-pilot> --json > <temp-pilot>\axiom-baseline.json
```

- Added one new cross-module import so `Physics` imports `Rendering`.

## Initial Failure

The first `axi diff` run failed before showing drift:

```text
Unexpected token from UTF-16LE baseline bytes while parsing JSON as UTF-8.
```

Cause:

- Windows PowerShell redirection can save JSON as UTF-16LE.
- The baseline loader was reading graph baselines as UTF-8 only.

This is a real adoption-friction issue because the documented baseline workflow uses shell redirection.

## Fix

`axi diff`, `axi observe --baseline`, and `axi graph --baseline` now read graph baseline files through an encoding-aware JSON loader that supports:

- UTF-8
- UTF-8 with BOM
- UTF-16LE with BOM
- likely UTF-16LE without BOM

A regression test now writes a UTF-16LE baseline and verifies `axi diff` still works.

## Rerun Result

After the fix, the same PowerShell-created baseline produced the intended drift signal:

```text
Axiom diff.
review mode: baseline drift (advisory, exits 0)
drift: 1 new observed edge, 0 removed observed edges

architecture drift (advisory):
  new observed edges:
    Physics -> Rendering [undeclared_dependency]
      via src/physics/math.ts:5 "../rendering/draw"
      undeclared_dependency: Physics imports Rendering, but Rendering is not declared in depends.
      fix: Add 'depends Rendering' under module Physics, or remove the import.
```

Markdown and Mermaid output also rendered the same drift-only review:

```text
Status: drift detected
Review mode: baseline drift (advisory)
```

```text
Diff view: 1 new, 0 removed observed module edge
Only baseline drift edges are shown; unchanged edges are omitted
```

## Interpretation

The `axi diff` first-value loop is directionally good:

- It shows the exact new module edge.
- It keeps the signal advisory instead of acting like a gate.
- It points back to `axi check` when enforcement is desired.
- It can be used before teams have a mature strict contract.

The pilot also showed that boring workflow details matter. If baseline files cannot be round-tripped through the user's shell, the architecture-observability story fails before the product can show value.

## Follow-Up

- Keep `axi diff` in the first pilot path.
- Keep Windows shell behavior covered by tests.
- Consider a future `axi baseline` helper only if repeated pilots show redirection itself remains confusing.
