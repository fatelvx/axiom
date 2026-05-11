# Axiom Forecast Run Log

## 2026-05-11

### Repo Sync

Pushed current Axiom `master` to GitHub before preparing the forecast seed.

```text
origin https://github.com/fatelvx/axiom.git
commit 5211298 Add MiroFish credential entry helper
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
credentials entered; live compact run completed with partial OASIS limitations
```

### Live MiroFish Run

Credentials were entered locally by the user. The `.env` was not committed.

Model/service configuration:

```text
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL_NAME=deepseek-v4-pro
Zep Cloud=used with a local-only key
optional boost model=not used
```

The first large ontology attempt failed because DeepSeek Pro returned empty final `content` after spending the response budget on reasoning. A local temp-clone-only patch retried empty length-limited responses with a larger token budget, then the run was retried with compact forecast inputs.

Successful compact artifacts:

```text
project_id=proj_fa05f3b31ca1
graph_id=mirofish_2a0d62ee48ed43be
simulation_id=sim_0744c54e88e4
report_id=report_66544626df45
graph_chunks=22
graph_nodes=127
graph_edges=199
profiles=10
initial_reddit_posts=7
```

Limitations:

- The Reddit-only OASIS run generated initial posts, but `run-status` stayed at round `0`.
- The runner was stopped to avoid an indefinite background process.
- Report generation completed, but section 1 was empty because the report agent later attempted interview-tool calls against the stopped simulation environment.
- MiroFish/Zep search exposed a `query cannot be longer than 400 characters` limit; the report agent fell back to local graph search.

Primary live-run result:

The forecast reinforced the current product pivot. Axiom should avoid firewall overclaiming, keep hard gates for high-confidence contract intent, and make static-analysis limitations, intentional violations, scan performance, and contract-maintenance cost highly visible.

The sharpest new phrase from the live report is:

```text
symbol-level API health
```

This names the "compliant but bad" problem: Axiom can detect direct hidden re-exports, but it still cannot prove that broad public API surfaces, barrels, shared types, enums, utilities, or exported facades are semantically healthy.

Detailed result:

```text
experiments/axiom-forecast/results/mirofish-live-run-2026-05-11.md
```

### Observe Backtest After Product Change

Before rerunning MiroFish, Axiom was actually changed and pushed:

```text
commit ba24b7d Add architecture observe surface
```

Implemented product change:

- Added `axi observe`.
- Reframed public docs and banner around architecture observability with enforceable contracts.
- Updated the MiroFish forecast seed and prompt to include `axi observe`, visible debt, drift observability, and the "observe first, negotiate accepted tradeoffs, enforce high-confidence intent" boundary.

Full ontology rerun attempt:

```text
project_id=proj_00cf8a0752a5
input_text_length=8605
result=timed out after 180 seconds while backend log stayed at "调用 LLM 生成本体定义..."
```

Fallback:

Used the existing MiroFish forecast graph and ReportAgent to run a targeted backtest with the updated product details.

Primary result:

- `axi observe` is directionally correct as the product-facing attention surface.
- It lowers immediate enforcement resistance, but does not by itself overcome the "Dependency Cruiser with nicer framing" objection.
- `symbol-level API health` remains the major credibility gap.
- Under validator-first and low-noise constraints, the best next proxy signal is module fan-in/fan-out concentration warning, followed by new observed edge since baseline.

Detailed result:

```text
experiments/axiom-forecast/results/mirofish-observe-backtest-2026-05-11.md
```
