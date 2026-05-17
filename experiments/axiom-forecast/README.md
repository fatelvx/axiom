# Axiom Forecast Experiment

This folder packages Axiom's current product state for a MiroFish-style social reception forecast.

Goal:

Use a multi-agent social simulation to predict how real users may understand, adopt, criticize, misuse, or ignore Axiom before the project over-invests in the wrong product direction.

Current backtest focus:

- `axi observe` as a product-facing architecture attention command.
- Architecture observability with enforceable contracts.
- Baseline-aware observed edge drift for PR and agent review.
- Markdown review summaries for PR comments and agent repair loops.
- Performance memoization and static blind-spot visibility after the 10k synthetic smoke check improved.
- Public comparison against ESLint architecture rules, Dependency Cruiser, Nx boundaries, CodeQL, and custom scripts.
- Whether "observe first, negotiate accepted tradeoffs, enforce only high-confidence intent" improves trust or sounds too abstract.

Files:

- `seed.md`: the product context to feed into MiroFish.
- `protocol.md`: simulation roles, questions, phases, and expected output.
- `run-log.md`: concrete run notes from this workspace.
- `results/dry-run-forecast.md`: a local dry-run forecast produced before a full MiroFish simulation is available.
- `results/mirofish-live-run-2026-05-11.md`: sanitized English summary of the live compact run.
- `results/mirofish-live-run-2026-05-11.zh.md`: Chinese process log and actual generated-output excerpts.
- `results/mirofish-observe-backtest-2026-05-11.md`: targeted backtest after adding `axi observe` and reframing the product around architecture observability.
- `results/mirofish-coupling-backtest-2026-05-11.md`: targeted backtest after adding opt-in coupling concentration warnings.
- `results/mirofish-baseline-drift-backtest-2026-05-11.md`: targeted backtest after adding baseline-aware observed edge drift.
- `results/mirofish-markdown-review-backtest-2026-05-12.md`: targeted backtest after adding Markdown PR / agent review summaries.
- `results/mirofish-performance-memoization-backtest-2026-05-12.md`: targeted backtest after reducing synthetic scan cost with ownership lookup memoization.
- `results/mirofish-intentional-debt-ledger-backtest-2026-05-12.md`: targeted backtest after adding the top-level `intentionalDebt` ledger for accepted non-edge surface debt.
- `results/mirofish-comparison-backtest-2026-05-12.md`: targeted backtest after adding the public comparison and boundaries guide.
- `results/mirofish-big-backtest-v1-2026-05-13.md`: larger multi-stakeholder synthetic backtest after external specs, real-project smoke notes, pilot workflow guidance, and observe-first positioning.
- `results/mirofish-public-api-surface-target-2026-05-13.md`: targeted backtest after the nanoid/zod public API surface pilot.
- `results/mirofish-inference-onboarding-target-2026-05-13.md`: targeted backtest after improving `no_spec_files` onboarding and collapsed cycle inference output.
- `results/mirofish-mermaid-graph-target-2026-05-13.md`: targeted backtest after adding visual Mermaid graph output and the in-diagram legend repair.
- `results/mirofish-big-backtest-v2-2026-05-13.md`: larger synthetic backtest after the Mermaid legend repair, including the rejected blanket-adopt recommendation.
- `results/mirofish-contract-recipes-target-2026-05-13.md`: targeted backtest after adding contract recipes for common adoption shapes and external pilots.
- `results/mirofish-big-backtest-v3-2026-05-13.md`: larger synthetic backtest after contract recipes, target-pilot follow-up, Mermaid graph output, baseline drift, and real-project smoke evidence.
- `results/mirofish-graph-interpretation-mcp-target-2026-05-13.md`: targeted backtest after adding graph interpretation output and refreshing the GitHub banner; includes the MCP timing recommendation.
- `results/mirofish-read-the-graph-pilot-card-target-2026-05-13.md`: targeted backtest after adding the read-the-graph guide, 10-minute pilot card, and v11 interpretation replay evidence.
- `results/mirofish-pilot-confidence-mcp-target-2026-05-13.md`: targeted backtest after the Lumina entrypoint-confidence repair plus ofetch / Preact Signals safe pilots; recommends one more review-story refinement before MCP.
- `results/mirofish-review-story-target-2026-05-13.md`: targeted backtest after adding `architectureSummary.reviewStory`; recommends a larger public-reception / MCP backtest next.
- `results/mirofish-big-backtest-v4-2026-05-13.md`: larger synthetic backtest after `reviewStory`; recommends a limited read-only MCP preview after baseline lifecycle and agent-loop guardrail docs.
- `results/mirofish-tiered-evidence-validator-target-2026-05-14.md`: targeted backtest after pnpm / Vite resolver hardening and the calibration-portfolio decision; keeps tiered evidence internal until hard-gate trust is broader.
- `results/mirofish-evidence-artifact-target-2026-05-14.md`: targeted backtest after adding the Evidence Artifact Loop guide; says the artifact reduces disconnected-surface risk but still needs real-project calibration before MCP shipping.
- `results/mirofish-framework-tooling-calibration-target-2026-05-14.md`: targeted backtest after the Express / Fastify / ESLint / SvelteKit / UUID calibration batch; recommends a human-reviewed spec-first pilot before broad MCP or VS Code work.
- `results/mirofish-mcp-roots-agent-loop-target-2026-05-14.md`: targeted backtest after adding `axiom_roots` and the temp-only MCP agent-loop smoke; recommends MCP tool-consumption conformance scenarios before Python or dynamic expansion.
- `results/mirofish-import-kind-dynamic-target-2026-05-17.md`: targeted backtest after adding observed import-kind evidence; says keep the change, clarify that `import.kind` is descriptive evidence, and do not add YAML before dynamic/Python needs prove it.
- `results/mirofish-mcp-import-kind-conformance-2026-05-17.md`: targeted backtest after adding MCP conformance coverage for import-kind evidence; says keep the patch and continue treating `import.kind` as descriptive evidence, not contract language.
- `results/mirofish-module-require-dynamic-target-2026-05-17.md`: targeted backtest after adding `module.require()` scanner evidence; says keep the narrow patch and freeze broader dynamic-require expansion until Python planning.
- `tools/write-mirofish-env.ps1`: local helper for writing MiroFish credentials to `.env` without pasting secrets into chat.

Live run input snapshot:

```text
https://github.com/fatelvx/axiom
current master after the axi observe / observability positioning update
```

Latest targeted backtest snapshot:

```text
current master after pilot workflow guidance, external contract support, real-project smoke notes, and public entrypoint coupling warnings
```

Latest public API surface target snapshot:

```text
current master after the nanoid/zod public API pilot and `public_entrypoint_coupling` report calibration
```

Latest inference onboarding target snapshot:

```text
current master after `no_spec_files` guidance and readable collapsed cycle output
```

Latest Mermaid graph target snapshot:

```text
current master after `axi graph --mermaid`, `axi observe --mermaid`, and visible in-diagram graph legends
```

Latest big backtest snapshot:

```text
current master after Mermaid graph legend repair and explicit guidance against blanket auto-accepted first-run debt
```

Latest contract recipes target snapshot:

```text
current master after adding contract recipes for React/Vite apps, React plus Pixi game clients, TypeScript libraries, monorepos, and external pilot contracts
```

Latest big backtest V3 snapshot:

```text
current master after contract recipes, gate-readiness guidance, Mermaid graph output, external specs, baseline drift, and real-project smoke evidence
```

Latest `axi diff` target pilot snapshot:

```text
current master after adding `axi diff`, then fixing PowerShell UTF-16LE redirected baseline graph loading
```

Latest graph interpretation / MCP target snapshot:

```text
current master after adding `architectureSummary.interpretation`, a "How To Read A Graph" README section, and the refreshed README banner
```

Latest read-the-graph / pilot-card target snapshot:

```text
current working tree after adding `guides/read-the-graph.md`, `guides/pilot-card.md`, and v11 interpretation replays for ofetch and Preact Signals
```

Latest tiered evidence / validator landing target snapshot:

```text
current master after pnpm workspace source-mirror resolution, Vite type-only declaration resolution, and the calibration-portfolio overfitting guardrail
```

Latest framework/tooling calibration target snapshot:

```text
current master after the clone-only Express, Fastify, ESLint, SvelteKit, and UUID diff-smoke batch plus portfolio classification artifacts
```

Latest MCP roots / agent-loop target snapshot:

```text
current master after adding axiom_roots, root-policy docs, Lumina MCP allowed-root registration guidance, and npm run mcp:agent-loop:smoke
```

Latest import-kind / dynamic target snapshot:

```text
current working tree after adding observed import-kind evidence to JSON, human, Markdown, drift output, and the portable self baseline
```

Use this experiment as forecast input, not as a replacement for real users. A useful forecast should produce falsifiable adoption risks, concrete messaging changes, and roadmap tradeoffs.

Public sharing rule:

- Publish the sanitized summaries, not raw `.env`, local paths, or full runtime dumps.
- Label the result as a synthetic forecast, not real user research or demand proof.
- Keep the limitations attached: partial OASIS completion, one empty report section, and simulated profiles.
- Keep first-page product docs separate from run-by-run forecast narration. Public docs should summarize stable product decisions and user workflows; detailed model critiques stay here as research artifacts.

## Local Credential Entry

Do not paste API keys into chat. Use the local helper:

```powershell
powershell -ExecutionPolicy Bypass -File experiments\axiom-forecast\tools\write-mirofish-env.ps1
```

The script finds the latest `<temp>/axiom-mirofish-*` clone by default and writes MiroFish credentials to that clone's `.env`.
