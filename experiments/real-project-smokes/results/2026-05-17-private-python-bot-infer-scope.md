# Private Python Bot Infer-Scope Calibration, 2026-05-17

This run used a private Python bot-style project as a read-only calibration target.

The target repository is not named here, and no private source, local paths, data files, `.env` contents, or target artifacts are published. Axiom wrote only temporary config/spec/report files outside the target repository.

## Safety Posture

- Read-only source scan of a private local repository.
- No target repository writes.
- No `.axi` saved into the target repository.
- No baseline saved into the target repository.
- No accepted debt added.
- No dependency installs.
- No target scripts, tests, bot startup, virtualenv inspection, or Python execution.
- Axiom used its existing local build and dependency tree.

## Scope

Temporary config used the intended source scope:

```json
{
  "include": ["main.py", "cogs/**/*.py", "src/**/*.py"],
  "exclude": [".venv/**", "tests/**", "tools/**", "**/__pycache__/**"],
  "pythonImportRoots": ["src/common", "src/ui", "src/market", "src/gacha", "."]
}
```

This shape matters because many Python apps keep runtime entry code and command/cog modules outside `src`, while helper/domain modules live under `src/*` import roots.

## Initial Finding

Before the fix, `axi infer` accepted the explicit include config but still applied its automatic `src/**` preference because the project had a `src` tree.

That caused an evidence mismatch:

| Surface | Source files | Imports | Modules | Observed dependencies |
| --- | ---: | ---: | ---: | ---: |
| `axi infer --json` | 27 | 169 | 4 | 4 |
| `axi check --spec <inferred.axi> --json` | 38 | 313 | 4 | 33 |

The inferred draft omitted the top-level app entry and cog/command modules even though the user had explicitly scoped them into the run. The later check/observe scan still saw those files as source and surfaced their advisory pressure, which made the inferred contract less trustworthy as authoring evidence.

## Fix

`axi infer` now uses its automatic `src/**` preference only when no explicit source `include` scope exists.

If config or CLI include patterns are present, inference honors the discovered source set after normal include/exclude filtering. Root entry files such as `main.py` can also receive the existing `AppEntry` authoring label.

## After Fix

The same read-only calibration then produced:

| Surface | Source files | Imports | Modules | Observed dependencies | Hard violations | Warnings |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `axi infer --json` | 38 | 313 | 6 | 9 | n/a | 4 pressure notes |
| `axi check --spec <inferred.axi> --json` | 38 | 313 | 6 | 93 | 0 | 6 |

Inferred modules:

- `AppEntry`
- `Cogs`
- `Common`
- `Gacha`
- `Market`
- `Ui`

Advisory warnings after the fix:

- `large_module_file`: 4
- `coupling_concentration`: 2
- `dynamic_dependency_expression`: 0
- `unresolved_import`: 0

Main review story:

- no hard gate failures;
- the first review pressure is intra-file responsibility pressure in large command/cog files;
- graph centers are `Common`, `Cogs`, and `Market`;
- advisory pressure remains review context, not a cleanup checklist.

## Calibration Classification

- Repo shape: private Python bot-style app with root entry code, command/cog modules, and multiple `src/*` import roots.
- Safety posture: read-only local source scan; no target writes, installs, scripts, virtualenv inspection, or Python execution.
- Scope question: does `axi infer` preserve a user-declared source scope when a Python app has both top-level runtime/cog code and `src/**` helper roots?
- Axiom command surface: `axi infer --json`, `axi check --spec <temp.axi> --json`, `axi observe --spec <temp.axi> --markdown`, `axi graph --json --portable`.
- Main signal: explicit include scope was being silently narrowed by inference; after the fix, infer and check agree on the scanned source shape.
- Gap class: `general-resolver-scanner` / `scan-scope`.
- Decision: change infer source selection so explicit includes override the automatic `src/**` preference. Do not add runtime Python import modelling, virtualenv/site-packages inspection, framework plugin discovery, or broader bare-import warnings.
- Code changed: yes, in `axi infer` source-scope selection and inferred entry naming.
- Follow-up: continue Python calibration with repo-local spec-first and source-scope evidence before considering any runtime/environment modelling.
