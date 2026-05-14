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

## 2026-05-13

### Big Backtest V1

Before this backtest, Axiom had already shipped several adoption and pilot improvements:

- `--spec <path>` external contract support.
- Pilot workflow guidance for scanning a repository without committing `.axi` into it.
- Real-project smoke notes from nanoid, zod, zod tag-to-tag version smoke, and Lumina-style external scan feedback.
- Observe-first public positioning, visible debt, Markdown review output, baseline drift, and warning surfaces.

Method:

Used the same local MiroFish `.env` and model configuration through direct `LLMClient`. This was a larger multi-stakeholder prompt, not a full OASIS social simulation rerun.

Primary result:

- Axiom is credible as an architecture observability layer only if it stays honest about limits.
- `--spec` external contracts are a strong pilot wedge.
- The strongest remaining technical objection is "compliant shape, hidden coupling": a public entry point can make imports look compliant while the entry point itself becomes a large accidental facade.
- The strongest product/onboarding objection remains `.axi` authoring and maintenance cost.
- The forecast recommended more small pilots before a wider public push.

Follow-up taken:

- Added `public_entrypoint_coupling` as an opt-in advisory warning under `--warn-public-api-surface`.
- This warning reports exposed entry points that reach at least four same-module internal files, including named re-export facades, without failing `axi check`.

Detailed result:

```text
experiments/axiom-forecast/results/mirofish-big-backtest-v1-2026-05-13.md
```

### Public API Surface Target Backtest

Before this target backtest, Axiom had run a small public API surface pilot:

- nanoid at `964d1e0`
- zod `v4.4.3` with both inferred and purpose-built public-surface probe contracts
- zod version smoke rerun with `public-api` warnings enabled

Primary pilot facts:

- `public_entrypoint_coupling` stayed quiet under inferred contracts because `axi infer` does not activate `exposes` intent on the user's behalf.
- The zod public-surface probe reported 21 public API warnings: 19 `broad_public_surface` and 2 `public_entrypoint_coupling`.
- The two entrypoint-coupling warnings were `packages/zod/src/v4/core/index.ts` reaching 15 same-module internal files and `packages/zod/src/v4/locales/index.ts` reaching 52.

Method:

Used the same local MiroFish `.env` and model configuration through direct `LLMClient`. This was a targeted risk-map prompt, not a full OASIS social simulation rerun.

Primary result:

- The probe is high-signal but easy to misunderstand as architecture judgment.
- Public-surface probes should stay as advanced calibration only, not part of the default first pilot workflow.
- Broad aggregators such as locales can be intentional, so the docs should frame the signal as visible facade pressure rather than bad API design.
- The forecast suggested an ignore mechanism, but Axiom should not adopt hidden inline ignores. Any future acknowledgement path must preserve visible-debt discipline.

Follow-up taken:

- Removed `--warn-public-api-surface` from the default pilot workflow command and default GitHub PR-summary example.
- Clarified README, getting-started, and adoption docs that public-surface warnings are advanced, advisory, and not an API-quality verdict.

Detailed result:

```text
experiments/axiom-forecast/results/mirofish-public-api-surface-target-2026-05-13.md
```

### Inference Onboarding Target Backtest

Before this target backtest, Axiom had shipped the Lumina-feedback refinement:

- `no_spec_files` now tells users to run `axi infer` or use an external `--spec` pilot contract.
- `axi infer` now gives long collapsed cycle groups a readable name such as `ServicesCycle`.
- Collapsed cycle output now includes source groups, observed internal edges, a reason, and a review note.
- Collapsed cycle JSON now includes `internalDependencies` for tool and agent consumers.

Method:

Used the same local MiroFish `.env` and model configuration through direct `LLMClient`. This was a targeted risk-map prompt, not a full OASIS social simulation rerun.

Primary result:

- The `no_spec_files` fix is the strongest adoption improvement because it turns a dead-end first run into a concrete next action.
- Readable collapsed cycles are a clear improvement, but the output can still feel like dependency-analyzer commentary rather than architectural guidance.
- The remaining risk is that users may commit the inferred starter contract as if it were recommended architecture instead of a mirror of the current graph.
- The recommended next step is one small refinement before a larger backtest: add a starter-contract notice to `axi infer` text and JSON output saying inference mirrors current dependencies and must be reviewed before enforcement.

Detailed result:

```text
experiments/axiom-forecast/results/mirofish-inference-onboarding-target-2026-05-13.md
```

### Mermaid Graph Target Backtest

Before this target backtest, Axiom had shipped visual graph output:

- `axi graph --mermaid`
- `axi observe --mermaid`
- layer-grouped module nodes
- aggregated observed import edge counts
- drift/debt codes on observed edges

Method:

Used the same local MiroFish `.env` and model configuration through direct `LLMClient`. This was a targeted risk-map prompt, not a full OASIS social simulation rerun.

Primary result:

- Mermaid output is useful because it turns long edge lists into a fast architecture review artifact.
- The main risk is misclassification: skeptical developers may see a Mermaid dependency graph and assume Axiom is just a prettier `madge` or Dependency Cruiser output.
- The reason this risk was real is that Mermaid comments are hidden in rendered diagrams, so observed-only and filtered-view boundaries were not visible in the artifact itself.

Follow-up taken:

- Added an in-diagram `Axiom graph legend` to every Mermaid output.
- The legend states that nodes are declared `.axi` modules and edges are observed imports.
- Filtered Mermaid views now visibly say they are filtered and that clean observed dependencies are omitted.

Detailed result:

```text
experiments/axiom-forecast/results/mirofish-mermaid-graph-target-2026-05-13.md
```

### Big Backtest V2 After Mermaid Legend Repair

Before this larger backtest, Axiom had shipped and pushed:

- Mermaid graph output.
- An in-diagram Mermaid legend.
- A filtered-view marker for `axi observe --mermaid`, `axi graph --attention --mermaid`, and `axi graph --violations-only --mermaid`.
- The previous full alpha self-guard check.

Method:

Used the same local MiroFish `.env` and model configuration through direct `LLMClient`. This was a larger multi-stakeholder synthetic reception prompt, not a full OASIS social simulation rerun.

Primary result:

- Axiom is directionally credible, but broader pilot outreach still depends on low-noise onboarding, real performance evidence, and a stronger drift-over-time demonstration.
- The forecast again exposed the "just another linter" risk: without time-series proof and real repo evidence, architecture observability can read like terminology over a point-in-time dependency checker.
- It recommended an `axi adopt` command that automatically wraps first-run problems as accepted intentional debt.

Follow-up decision:

- Do not implement blanket auto-accepted debt as recommended.
- The useful problem is adoption friction; the proposed mechanism conflicts with Axiom's visible-debt trust model.
- Public adoption and philosophy docs now state that Axiom does not auto-turn first-run failures into accepted debt in v0. Existing projects should use `axi infer` as evidence, external `--spec` contracts for pilots, manual reviewed `accepts ... until ... because ...`, and graph baselines for drift-over-time review.

Detailed result:

```text
experiments/axiom-forecast/results/mirofish-big-backtest-v2-2026-05-13.md
```

### Contract Recipes Target Backtest

Before this target backtest, Axiom had shipped and pushed:

- `guides/contract-recipes.md`
- links from README, Getting Started, Adoption, and Pilot Workflow
- starter contract shapes for React/Vite apps, React plus Pixi game clients, TypeScript libraries, monorepos, and external pilot contracts

Method:

Used the same local MiroFish `.env` and model configuration through direct `LLMClient`. This was a targeted risk-map prompt, not a full OASIS social simulation rerun.

Primary result:

- Recipes reduce the empty-page problem enough to make first pilots more likely.
- The React plus Pixi recipe is a real adoption wedge for AI-assisted game projects because that audience has architecture pressure but little existing architecture-governance tooling.
- Recipes do not fully answer the skeptical "why another config file" objection by themselves.
- The highest-value follow-up is to prevent misuse: users should not copy a recipe straight into a CI gate, auto-accept first-run debt, or let `.axi` become stale.
- The model suggested a runtime warning involving nonexistent `enforce` sections. That exact suggestion was rejected because it does not match Axiom's grammar or product model. The useful underlying issue was folded into docs as gate-readiness and contract-maintenance guidance.

Follow-up taken:

- Added a gate-readiness checklist to Contract Recipes.
- Added a lightweight contract-maintenance rhythm to Adoption.
- Added contract ownership to the Pilot Workflow promotion checklist.

Detailed result:

```text
experiments/axiom-forecast/results/mirofish-contract-recipes-target-2026-05-13.md
```

### Big Backtest V3 After Contract Recipes

Before this larger backtest, Axiom had shipped and pushed:

- `axi infer` starter notices, authoring checklist, next commands, and readable collapsed cycles
- external `--spec` pilot contracts
- `axi observe`, Markdown review summaries, and Mermaid graph output
- baseline-aware observed edge drift through `axi observe --baseline` and `axi graph --baseline`
- contract recipes plus gate-readiness and maintenance-rhythm guidance
- real-project smoke reports for nanoid and zod

Method:

Used the same local MiroFish `.env` and model configuration through direct `LLMClient`. This was a larger synthetic reception prompt, not a full OASIS social simulation rerun.

Primary result:

- Axiom is close, and "architecture observability layer" is credible, but the first-value moment is still too indirect.
- The strongest remaining rejection pattern is: "I have to write or review a contract before I see any value."
- The backtest recommended a first-class baseline drift command so users can save a graph baseline, make or review a change, and immediately see new/removed observed module edges.
- This recommendation fits the current graph model and visible-debt discipline because it does not add enforcement semantics, hidden ignores, or auto-accepted debt.

Follow-up taken:

- Added `axi diff` as an advisory baseline-drift command over the existing graph result.
- `axi diff` supports human, JSON, Markdown, and Mermaid output.
- Public docs and `axi infer` next-command hints now include `axi diff` as the short first-value drift view.

Detailed result:

```text
experiments/axiom-forecast/results/mirofish-big-backtest-v3-2026-05-13.md
```

### `axi diff` Target Pilot

After adding `axi diff`, a focused local pilot tested the first-value workflow:

```text
axi graph --json > axiom-baseline.json
make or review a change
axi diff axiom-baseline.json
```

Method:

- Copied `fixtures/basic-ts-valid` into a temporary pilot directory.
- Saved the baseline through normal PowerShell redirection.
- Added one new cross-module import so `Physics` imports `Rendering`.
- Ran `axi diff` in human, Markdown, Mermaid, and JSON modes.

Primary result:

- The first run failed because the PowerShell-created baseline was UTF-16LE and the baseline loader read UTF-8 only.
- This is a real first-value adoption bug, because Windows users can naturally create baselines with `>`.
- After adding encoding-aware baseline loading, the same pilot reported one new advisory edge: `Physics -> Rendering`.
- Markdown and Mermaid preserved the drift-only review model.

Follow-up taken:

- Added UTF-8 / UTF-8 BOM / UTF-16LE baseline JSON decoding.
- Added a regression test for PowerShell UTF-16LE redirected graph baselines.

Detailed result:

```text
experiments/axiom-forecast/results/axi-diff-target-pilot-2026-05-13.md
```

### Graph Interpretation / MCP Target Backtest

Before this target backtest, Axiom had shipped and pushed:

- `architectureSummary.interpretation` in graph / observe / diff JSON
- human, Markdown, and GitHub Actions summary output for headline, look-first checklist, and central modules
- a README "How To Read A Graph" section
- a refreshed README banner around declared intent, observed imports, visible drift, and reading the graph

Method:

Used the same local MiroFish `.env` and model configuration through direct `LLMClient`. This was a targeted risk-map prompt, not a full OASIS social simulation rerun.

Primary result:

- The interpretation layer meaningfully reduces the "did I use this correctly?" confusion for small AI-assisted projects.
- The "look first" checklist is the strongest improvement because it gives users a repeatable inspection routine.
- `centralModules` must remain a coupling navigation aid, not a health score.
- The strongest remaining hole is the quiet / passing scan moment: once violations are gone, users still need a next step rather than a bland green state.
- MCP is promising for AI-agent adoption, but the backtest recommends delaying a public MCP surface until JSON/CLI surfaces are stable through more feedback.

Follow-up taken:

- Updated quiet graph interpretation so passing scans say to compare the graph center with intended architecture before saving a baseline.
- Kept MCP as a later read-only adapter direction, not the next implementation step.

Detailed result:

```text
experiments/axiom-forecast/results/mirofish-graph-interpretation-mcp-target-2026-05-13.md
```

### Read-The-Graph / Pilot Card Target Backtest

Before this target backtest, Axiom added:

- `guides/read-the-graph.md`
- `guides/pilot-card.md`
- README / Getting Started / Pilot Workflow links for those guides
- v11 interpretation replay smokes for ofetch and Preact Signals

Method:

Used the same local MiroFish `.env` and model configuration through direct `LLMClient`. This was a targeted risk-map prompt, not a full OASIS social simulation rerun.

Primary result:

- The read-the-graph guide and pilot card reduce first-user confusion by giving a concrete review ritual and a 10-minute external pilot path.
- The three-question flow, hard signals -> graph center -> expected shape, is the strongest improvement.
- Axiom can still look like a dependency visualizer if users only see command names and never open the guides.
- React plus Pixi guidance is useful as example review prompts, but must not become hidden framework policy.
- The replay evidence was accepted as credible and non-overclaiming: ofetch stayed quiet, while Preact Signals produced a concrete `Signals -> SignalsDebug` drift / warning signal.
- MCP should still hold; the next step should be a small friendly external pilot using the guides, not a broad MCP or public-reception backtest.

Follow-up taken:

- Confirmed `axi infer` already prints a current-graph snapshot notice and authoring checklist.
- Updated the pilot card to explicitly tell users to read those first generated comments before treating inferred edges as intent.

Detailed result:

```text
experiments/axiom-forecast/results/mirofish-read-the-graph-pilot-card-target-2026-05-13.md
```

### Pilot Confidence / MCP Timing Target Backtest

Before this target backtest, Axiom had shipped and pushed:

- source-group-aware deep-internal-import entrypoint advice
- shown dependency edge counts separate from full observed dependencies
- warning-scope notes for advisory checks
- warning clustering for advisory-heavy output
- readable collapsed-cycle names such as `SignalsDebugCycle`
- clone-only, no-install safe pilots for ofetch and Preact Signals

Method:

Used the same local MiroFish `.env` and model configuration through direct `LLMClient`. This was a targeted risk-map prompt, not a full OASIS social simulation rerun.

Primary result:

- The Lumina entrypoint-confidence repair reduces trust risk because Axiom no longer suggests unrelated public entrypoints inside broad collapsed modules.
- The ofetch quiet control and Preact Signals workspace signal strengthen differentiation from a noisy linter or generic dependency visualizer.
- The remaining rejection pattern is first-time interpretation: "117 warnings and a dependency graph" can still feel like lint flood unless Axiom tells a short review story.
- MCP remains promising, but premature until the CLI / JSON report surface can expose that review story in a stable, agent-friendly structure.

Follow-up decision:

- Do one more target refinement before a larger public-reception / MCP backtest.
- The refinement should add a compact review-story layer and more root-cause-oriented warning interpretation without adding new enforcement semantics.

Detailed result:

```text
experiments/axiom-forecast/results/mirofish-pilot-confidence-mcp-target-2026-05-13.md
```

### Review Story Target Backtest

Before this target backtest, Axiom had implemented:

- `architectureSummary.reviewStory` in graph / observe / diff JSON
- graph JSON schema `axiom.graph.v12`
- human and Markdown review story output
- top review pressures for hard violations, visible debt, warning roots, baseline drift, and quiet graph centers
- documentation for JSON consumers explaining how to use `reviewStory` without treating it as a gate

Verification before the backtest:

- `npm run alpha:check` passed.
- The self-contract check passed.
- GitHub Actions smoke passed.
- npm pack dry-run passed.

Method:

Used the same local MiroFish `.env` and model configuration through direct `LLMClient`. This was a targeted risk-map prompt, not a full OASIS social simulation rerun.

Primary result:

- `reviewStory` directly addresses the "117 warnings and a graph" rejection pattern by prioritizing the first architecture pressure before raw diagnostics.
- The output now differentiates Axiom more clearly from lint and dependency visualization because it gives a post-scan narrative over declared intent, observed imports, visible debt, warnings, and drift.
- `axiom.graph.v12` is considered stable enough for a thin read-only MCP wrapper, as long as MCP treats the story as guidance and keeps `axi check` as the hard gate.
- The highest remaining risk is overinterpretation of quiet stories as proof of healthy architecture.

Follow-up decision:

- Run a larger public-reception / MCP backtest next.
- Keep the review-story caveat visible and do not claim semantic architecture health.

Detailed result:

```text
experiments/axiom-forecast/results/mirofish-review-story-target-2026-05-13.md
```

### Big Backtest V4 After Review Story

Before this larger backtest, Axiom had shipped and pushed:

- graph JSON schema `axiom.graph.v12`
- `architectureSummary.reviewStory`
- human and Markdown review story output
- target backtest evidence that `reviewStory` addresses the "117 warnings and a graph" rejection pattern
- safe pilots on Lumina, ofetch, and Preact Signals

Method:

Used the same local MiroFish `.env` and model configuration through direct `LLMClient`. This was a larger synthetic reception prompt, not a full OASIS social simulation rerun.

Primary result:

- A limited read-only MCP preview is now reasonable for senior engineers and agent-loop builders, but broad launch language is still premature.
- `reviewStory` reduces the "just a linter / dependency graph" perception by giving a stable narrative entrypoint.
- MCP should stay a thin wrapper over CLI / JSON, with no write tools, no auto-accepted debt, and no automatic gates from advisory review story output.
- The two small guardrails to ship before preview are baseline lifecycle guidance and an agent-loop integration recipe.
- The main remaining misunderstanding is that users or agents may treat a quiet story as proof of semantic architecture health.

Follow-up taken:

- Added `guides/agent-loop.md`.
- Linked it from README, JSON Consumers, and GitHub Actions.
- Documented the `.axi/baselines/current.graph.json` pilot convention, safe agent loop, `reviewStory` consumption, and read-only MCP v0 guardrails.

Detailed result:

```text
experiments/axiom-forecast/results/mirofish-big-backtest-v4-2026-05-13.md
```

## 2026-05-14

### Tiered Evidence / Validator Landing Target Backtest

Before this target backtest, Axiom had shipped and pushed:

- pnpm workspace source-mirror resolution for package `exports` / `main` targets under `lib` or `dist`
- Vite-style type-only declaration resolution for `.d.ts`, `.d.mts`, and `.d.cts` imports
- the long-term contract-network thesis
- the calibration-portfolio decision to classify real-project smoke gaps before implementation

Method:

Used the same local MiroFish `.env` and model configuration through direct `LLMClient`. This was a targeted risk-map prompt, not a full OASIS social simulation rerun. No target repository installs, `npx`, dependency refreshes, or target scripts were run.

Primary result:

- The validator-first direction remains credible, but first-version trust depends on keeping hard validation facts separate from heuristics and advisory output.
- Tiered evidence confidence is useful as an internal taxonomy, but should not be shipped yet as public `confidence` fields, evidence scores, or a dashboard.
- The pnpm and Vite fixes are positive because they generalized beyond the target repositories, but two infrastructure repos are not enough calibration coverage.
- The next validator work should expand a diverse calibration portfolio and classify every new gap before code changes.
- GitHub Actions, VS Code, and MCP should remain thin future surfaces over the same evidence; broad expansion should wait until the hard-gate path is more widely trusted.

Follow-up decision:

- Adopt tiered evidence as an internal design discipline.
- Keep `axi check` as the only hard gate.
- Keep baseline drift advisory through `axi diff` and `axi observe --baseline`; do not add a hard `axi check --baseline` drift gate now.
- Reject premature public confidence scoring and semantic health language.

Detailed result:

```text
experiments/axiom-forecast/results/mirofish-tiered-evidence-validator-target-2026-05-14.md
```

### Evidence Artifact Loop Target Backtest

Before this target backtest, Axiom had added and linked:

- `guides/evidence-artifact.md`
- the `.axi + scan scope + graph baseline + review story + visible intentional debt` artifact convention
- README, adoption, GitHub Actions, JSON consumer, and agent-loop guide entry points for the same convention

Method:

Used the same local MiroFish `.env` and model configuration through direct `LLMClient`. This was a targeted risk-map prompt, not a full OASIS social simulation rerun. No target repository installs, `npx`, dependency refreshes, or target scripts were run. The first Traditional Chinese direct response was mojibake due to the local MiroFish encoding fragility; a readable English rerun was retained and lightly normalized.

Primary result:

- The Evidence Artifact Loop materially reduces disconnected GitHub Actions / VS Code / MCP surface risk because every integration can wrap the same local evidence.
- The artifact guide is not a moat by itself. Incumbents can copy a file convention unless Axiom proves better resolver accuracy, review-story value, and visible debt discipline on real repositories.
- The guide introduces or sharpens two risks: artifact-management friction and enterprise privacy questions around future MCP graph exposure.
- The recommended next action is a public real-project calibration sprint on three to five mixed-shape repositories before shipping an MCP server, even a read-only one.

Follow-up decision:

- Keep MCP as a design sketch, not the next shipped surface.
- Use the Evidence Artifact Loop in the next real-project calibration reports: exact scan scope, graph baseline, `axi observe --json` review story, intentional debt ledger, and a short narrative of accepted or rejected debt.

Detailed result:

```text
experiments/axiom-forecast/results/mirofish-evidence-artifact-target-2026-05-14.md
```

### Framework/Tooling Calibration Target Backtest

Before this target backtest, Axiom had run and pushed a clone-only, no-install real-project calibration batch across:

- Express `lib/**`
- Fastify `lib/**`
- ESLint `lib/**`
- SvelteKit `packages/kit/src/**`
- UUID `src/**`

The batch added calibration classification artifacts and intentionally made no validator/resolver behavior changes. It also recorded an npm CLI workspace attempt that failed before Axiom because Windows checkout hit a deeply nested fixture path.

Method:

Used the same local MiroFish `.env` and model configuration through direct `LLMClient`. This was a targeted risk-map prompt, not a full OASIS social simulation rerun. No target repository installs, `npx`, dependency refreshes, target scripts, target tests, or target builds were run.

Primary result:

- MiroFish gave the checkpoint a deliberately harsh 4/10 credibility score for first-alpha/ecosystem readiness.
- The useful criticism was that scanner stability and portfolio discipline are not yet the same as a proven human-reviewed `.axi` validation loop.
- The run incorrectly phrased this as "no `.axi` spec was used"; retain it with the correction that the harness used inferred temporary external specs, but not maintainer-authored or human-reviewed declared contracts.
- The recommended next checkpoint is a spec-first pilot: author a small human-reviewed `.axi`, introduce or replay a deliberate boundary drift, prove `axi check` catches the hard violation, and preserve the `.axi + baseline + reviewStory + intentionalDebt` artifact.
- GitHub Actions should come after that as a trust pass over the same evidence; MCP and VS Code should still wait.

Follow-up decision:

- Treat the framework/tooling batch as a successful calibration sprint, but not enough to claim alpha validator readiness.
- Next implementation work should prove declared-contract validation against deliberate drift before new integration surfaces.

Detailed result:

```text
experiments/axiom-forecast/results/mirofish-framework-tooling-calibration-target-2026-05-14.md
```
