# zod Version Architecture Smoke

Generated (UTC): 2026-05-12T17:41:45.101Z
Repository: https://github.com/colinhacks/zod.git
Refs: v3.25.76, v4.0.1, v4.4.3

This is a smoke test, not a verdict. Each version gets its own inferred `.axi` contract, then Axiom compares observable pressure signals across versions.

## Summary

| Ref | Commit | Package | Source files | Imports | Unique edges | Warnings | Coupling | Deep imports | Infer ms | Check ms | Graph ms |
| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| v3.25.76 | 463f03e | n/a | 340 | 881 | 5 | 1 | 1 | 0 | 5490.4 | 3466.5 | 3407.9 |
| v4.0.1 | b259211 | n/a | 343 | 890 | 6 | 2 | 1 | 1 | 3429 | 6947.8 | 7910.8 |
| v4.4.3 | 1fb56a5 | n/a | 406 | 1103 | 7 | 2 | 1 | 1 | 10611.4 | 7326.7 | 8704.8 |

## Edge Drift

### v3.25.76 -> v4.0.1
- Source files: +3, imports: +9, unique edges: +1, warnings: +1
- New edges: Scripts->Zod
- Removed edges: none
- Warning deltas: coupling_concentration 0, deep_internal_import +1

### v4.0.1 -> v4.4.3
- Source files: +63, imports: +213, unique edges: +1, warnings: 0
- New edges: Integration->Zod
- Removed edges: none
- Warning deltas: coupling_concentration 0, deep_internal_import 0

## Warning Details

### v3.25.76
- `coupling_concentration`: Zod has concentrated fan-in from 4 modules. Incoming: Benchmarks, Play, Resolution, Treeshaking. Outgoing: none.

### v4.0.1
- `coupling_concentration`: Zod has concentrated fan-in from 5 modules. Incoming: Benchmarks, Play, Resolution, Scripts, Treeshaking. Outgoing: none.
- `deep_internal_import` at `scripts/check-versions.ts:4`: `Scripts -> Zod` via `../packages/zod/src/v4/core/versions.js` -> `packages/zod/src/v4/core/versions.ts`.

### v4.4.3
- `coupling_concentration`: Zod has concentrated fan-in from 6 modules. Incoming: Benchmarks, Integration, Play, Resolution, Scripts, Treeshaking. Outgoing: none.
- `deep_internal_import` at `scripts/check-versions.ts:4`: `Scripts -> Zod` via `../packages/zod/src/v4/core/versions.js` -> `packages/zod/src/v4/core/versions.ts`.

## Caveats

- Inferred contracts mirror each version's current graph; they do not prove the intended architecture.
- Warning counts are advisory pressure signals, not CI failures.
- Tag-to-tag comparisons can reflect repository reshaping, test/docs changes, or resolver coverage changes.
- Use this as a calibration loop before turning any signal into a hard gate.

