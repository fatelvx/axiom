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

### Coupling Warning Backtest

Before this small backtest, Axiom was actually changed and pushed:

```text
commit c9f3460 Add coupling concentration warnings
```

Implemented product change:

- Added opt-in `--warn-coupling-concentration` and `warnCouplingConcentration`.
- Added `coupling_concentration` as an advisory warning when a module has high observed fan-in or fan-out.
- Kept the warning non-failing because it is an architecture pressure signal, not a proof of bad architecture.

Method:

Used the existing MiroFish forecast graph and ReportAgent with the same local model configuration. The prompt asked for a targeted risk-map review of the new coupling warning rather than a full ontology/simulation rerun.

Primary result:

- The warning is directionally aligned with the previous backtest.
- The biggest risk is not the idea itself, but explainability: skeptics may call a numeric fan-in/fan-out threshold arbitrary or noisy.
- The next smallest repair should improve CLI output so advisory warnings show the observed trigger, threshold, and involved modules.

Detailed result:

```text
experiments/axiom-forecast/results/mirofish-coupling-backtest-2026-05-11.md
```

### Baseline Drift Backtest

Before this small backtest, Axiom was actually changed locally:

```text
working tree after baseline-aware observed edge drift implementation
```

Implemented product change:

- Added `--baseline <graph-json>` to `axi graph` and `axi observe`.
- Compared unique observed module edges against an unfiltered graph JSON baseline.
- Reported new observed edges and removed observed edges.
- Rejected filtered baselines from `--attention` or `--violations-only`.
- Kept drift as advisory PR / agent review context, not a hard check failure.

Method:

Tried the existing MiroFish forecast graph and ReportAgent with the same local model configuration. The ReportAgent call wrote output but exceeded the shell timeout and produced partially mojibake text due to local prompt/runtime encoding fragility.

Then ran a smaller direct `LLMClient` targeted backtest using the same local MiroFish `.env` and model configuration to get readable output.

Primary result:

- Baseline drift is directionally closer to architecture observability than another threshold warning.
- The biggest immediate risk is product interpretation: even the backtest briefly described drift as a CI check failure despite the prompt saying it is advisory.
- The next smallest repair is to make advisory status visible in both human and JSON output.

Follow-up taken:

- Human output now says `architecture drift (advisory)`.
- Graph JSON drift now includes `kind: "advisory_observed_edge_drift"`.

Detailed result:

```text
experiments/axiom-forecast/results/mirofish-baseline-drift-backtest-2026-05-11.md
```

## 2026-05-12

### Markdown Review Backtest

Before this small backtest, Axiom was actually changed locally:

```text
working tree after graph/observe --markdown implementation
```

Implemented product change:

- Added `--markdown` to `axi graph` and `axi observe`.
- Kept Markdown as presentation output over the existing validator and graph result.
- Separated hard violations, visible intentional debt, advisory warnings, and advisory baseline drift.
- Kept `axi check` as the CI gate.

Method:

Used the same local MiroFish `.env` and model configuration through direct `LLMClient` targeted backtests. This was not a full OASIS rerun.

Primary result:

- The Markdown review surface is useful as a PR / agent communication artifact.
- The backtest repeatedly tried to turn advisory drift into optional hard enforcement anyway, including suggestions such as `--fail-on-drift` and a separate drift exit code.
- It also hallucinated hidden escape hatches such as `.axiignore` and `axi suppress`, even though Axiom already uses visible `.axi` `accepts ... until ... because ...` intentional violations.
- The useful lesson is that the artifact itself must protect the product boundary: Markdown is review output, not a gate.

Follow-up taken:

- Markdown review notes now say: `This is review output; use axi check when you want a CI gate.`
- CLI help now labels `--markdown` as presentation output and points users to `axi check` for gating.

Detailed result:

```text
experiments/axiom-forecast/results/mirofish-markdown-review-backtest-2026-05-12.md
```

### Intentional Debt Ledger Backtest

Before this small backtest, Axiom was changed and pushed:

```text
commit afea23f Expose intentional debt ledger
```

Implemented product change:

- Added top-level graph JSON `intentionalDebt` in `axiom.graph.v9`.
- Updated human graph / observe output with a dedicated `visible intentional debt` section.
- Updated Markdown review output so accepted non-edge surface debt such as `hidden_reexport` remains visible.

Method:

Used the same local MiroFish `.env` and model configuration through direct `LLMClient` targeted backtests. This was not a full OASIS rerun.

Primary result:

- The ledger direction was accepted as a real improvement for the visible escape-hatch thesis.
- The main risks shifted to rubber-stamp debt, graph schema churn, and pressure to add agent auto-accept flows.
- A follow-up tightening prompt hallucinated nonexistent semantic-oracle and telemetry details, which reinforced the need for review artifacts to defend Axiom's limits explicitly.

Follow-up taken:

- Markdown review notes now state that Axiom does not auto-accept debt.
- Markdown review notes now state that accepted debt must be declared in `.axi` with an expiration date and reason.
- Markdown review notes now state that expired or invalid intentional violations remain hard failures in `axi check`.

Detailed result:

```text
experiments/axiom-forecast/results/mirofish-intentional-debt-ledger-backtest-2026-05-12.md
```
