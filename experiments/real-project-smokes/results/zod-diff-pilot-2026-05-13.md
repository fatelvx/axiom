# zod `axi diff` Baseline Pilot

Date: 2026-05-13

This run tested whether `axi diff` can turn a real repository's version-to-version architecture change into a short review artifact.

It also tested the Windows first-value path:

```powershell
axi infer --root <repo> --group-by workspace > draft.axi
axi graph --root <repo> --spec draft.axi --json > axiom-baseline.json
axi diff axiom-baseline.json --root <newer-repo> --spec draft.axi
```

## Repository

- Repository: `https://github.com/colinhacks/zod.git`
- Baseline ref: `v4.0.1` (`b259211`)
- Current ref: `v4.4.3` (`1fb56a5`)

Both refs were cloned into a temporary local pilot directory. No dependencies were installed.

## Method

1. Generated a workspace-grouped starter contract from `v4.0.1`.
2. Saved that contract with normal PowerShell redirection.
3. Generated a graph baseline for `v4.0.1` using the same contract.
4. Saved that graph baseline with normal PowerShell redirection.
5. Ran `axi diff` and `axi observe --baseline --markdown` against `v4.4.3` using the `v4.0.1` contract as the external `--spec`.

Warning flags:

```text
--warn-coupling-concentration
--warn-deep-internal-imports
--warn-unresolved-imports
```

## Initial Failure

The first attempt produced parse errors instead of architecture signal:

```text
modules: 0
observed dependencies: 0
violations: 87
```

Cause:

- `axi infer > draft.axi` on Windows PowerShell can write UTF-16LE text.
- The `.axi` spec loader only read UTF-8.
- This made a generated starter contract unusable as an external `--spec` even though PowerShell displayed the file normally.

This is a real adoption-friction bug because the public onboarding path encourages redirecting `axi infer` output into a draft contract.

## Fix Applied

Axiom now uses an encoding-aware text loader for both:

- graph baseline JSON used by `--baseline`
- `.axi` spec files used by discovery or explicit `--spec`

Supported text encodings:

- UTF-8
- UTF-8 with BOM
- UTF-16LE with BOM
- likely UTF-16LE without BOM

Regression coverage was added for both UTF-16LE graph baselines and UTF-16LE external `.axi` contracts.

## Rerun Result

After the fix, the same PowerShell-created draft contract and graph baseline worked.

`axi diff` summary:

```text
modules: 15
declared dependencies: 6
observed dependencies: 54
violations: 0
warnings: 2
drift: 0 new observed edges, 1 removed observed edge
```

Drift:

```text
removed observed edge:
  ZodVitest -> Vitest
    previously via packages/zod/vitest.config.ts:2 "../../vitest.root.mjs"
```

`axi observe --baseline --markdown` also preserved the advisory signals:

```text
coupling_concentration:
  Zod has concentrated fan-in from 5 modules.
  Fan-in modules: Benchmarks, Play, Resolution, Scripts, Treeshaking

deep_internal_import:
  scripts/check-versions.ts:4
  Scripts -> Zod via ../packages/zod/src/v4/core/versions.js
```

## Product Read

Positive:

- `axi diff` gave a compact version-to-version architecture drift artifact.
- The output stayed advisory and did not behave like a gate.
- `axi observe --baseline --markdown` gave the richer review surface when warnings matter.
- The Windows PowerShell path now works for both generated `.axi` drafts and graph baselines.

Limitations:

- This uses the `v4.0.1` inferred contract as a baseline snapshot, not maintainer-declared intent.
- A removed edge is not automatically good or bad; it is a reviewable architecture change.
- New files outside the baseline contract can still be unowned unless the pilot uses `--warn-unowned` or refreshes the contract intentionally.
- The deep internal import remains advisory because the repo may intentionally use that script-level path.

Conclusion:

The `axi diff` pilot is useful, but the stronger lesson is workflow robustness. Axiom's first-value path depends on boring generated-file round-tripping being reliable on Windows, because many early users will discover the tool from PowerShell.
