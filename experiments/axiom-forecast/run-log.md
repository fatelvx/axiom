# Axiom Forecast Run Log

## 2026-05-11

### Repo Sync

Pushed current Axiom `master` to GitHub before preparing the forecast seed.

```text
origin https://github.com/fatelvx/axiom.git
commit ae71046 Mark attention graph JSON filter
```

Reason:

The forecast should see the current public product surface, including:

- pnpm workspace package export resolution
- `hidden_reexport`
- `axi graph --attention`
- graph JSON `filters.attention`
- visible intentional violations

### MiroFish Readiness Check

MiroFish repo cloned read-only to a temporary workspace:

```text
<local-temp>/axiom-mirofish-1778473109
```

Observed requirements:

- Node 18+
- Python 3.11 or 3.12
- uv
- `LLM_API_KEY`
- `LLM_BASE_URL`
- `LLM_MODEL_NAME`
- `ZEP_API_KEY`

The `.env.example` requires both an LLM key and Zep Cloud key. A full MiroFish simulation run is blocked unless those credentials are available locally.

Local readiness result:

```text
node: v24.14.1
npm: 11.11.0
python: 3.14.3
uv: initially missing; installed uv 0.11.13
python 3.12: installed cpython-3.12.13 through uv
LLM_API_KEY: missing
LLM_BASE_URL: missing
LLM_MODEL_NAME: missing
ZEP_API_KEY: missing
repo .env: created as a local template with blank secrets
```

This means the forecast package and local runtime bootstrap are ready, but the MiroFish runtime cannot execute the full simulation until credentials are entered.

Local credential entry point:

```powershell
powershell -ExecutionPolicy Bypass -File experiments\axiom-forecast\tools\write-mirofish-env.ps1
```

The helper writes secrets to the local MiroFish `.env` file only. Do not paste keys into chat or commit `.env`.

### Process Decision

Use both:

- current implemented Axiom snapshot
- complete product direction and known pressure-test questions

Do not use only a version number. Do not use only a vision statement.

Rationale:

MiroFish should simulate reception to a real current product plus its declared trajectory. This gives better signal about adoption, misunderstanding, and roadmap risk.

### Current Status

Forecast package prepared:

- `seed.md`
- `protocol.md`
- `mirofish-prompt.md`
- `tools/write-mirofish-env.ps1`
- `results/dry-run-forecast.md`

Full MiroFish execution status:

```text
blocked pending LLM_API_KEY, LLM_BASE_URL, LLM_MODEL_NAME, and ZEP_API_KEY
```
