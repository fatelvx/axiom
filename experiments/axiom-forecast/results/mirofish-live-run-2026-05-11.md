# MiroFish Live Forecast: Axiom Reception

Date: 2026-05-11

Status: live run completed with partial OASIS limitations.

## Public Sharing Note

This artifact is intended to be safe to publish as a sanitized experiment summary.

It contains no API keys, no `.env` values, and no private repository content. It should be presented as a MiroFish-based synthetic stakeholder forecast, not as real market research, real user interviews, or empirical adoption evidence. The useful value is pressure-testing Axiom's positioning and roadmap against simulated technical criticism.

If quoted publicly, keep these caveats attached:

- The run used generated stakeholder profiles and simulated Reddit-style posts.
- The OASIS runner did not complete all requested rounds.
- One report section was empty after interview-tool calls timed out against a stopped simulation environment.
- The output is a product-risk signal, not proof of demand.

A Chinese process log and actual generated-output excerpts are available in `mirofish-live-run-2026-05-11.zh.md`.

## Input

The run used the current public Axiom product seed at:

```text
https://github.com/fatelvx/axiom
commit 5211298 Add MiroFish credential entry helper
```

Uploaded material:

- `experiments/axiom-forecast/seed.md`
- `experiments/axiom-forecast/protocol.md`
- `experiments/axiom-forecast/mirofish-prompt.md`

The wider README and guides were intentionally not uploaded for the successful run because DeepSeek Pro spent too many tokens on reasoning in the larger ontology request. The compact seed kept the run focused on product reception rather than broad documentation summarization.

## Runtime

Local MiroFish clone:

```text
<local-temp>/axiom-mirofish-1778473109
```

Models and services:

- Main LLM: `deepseek-v4-pro`
- Zep Cloud: used for graph construction and graph queries with a local-only key
- Optional boost model: not used

Local runtime patch:

- MiroFish's local `LLMClient` was patched in the temp clone to retry once with a larger output token budget when a reasoning-heavy model returned empty `content` with `finish_reason="length"`.
- This patch was not made in the Axiom repository.

## MiroFish Artifacts

Ontology generation succeeded.

```text
project_id: proj_fa05f3b31ca1
entity types: SoftwareDeveloper, SeniorEngineer, TechLead, Cto, Researcher, Investor, Aicompany, OpenSourceProject, Person, Organization
edge types: SUPPORTS, OPPOSES, COMMENTS_ON, RESPONDS_TO, CRITICIZES, ENDORSES, INTEGRATES_WITH, ASKS_EVIDENCE
```

Zep graph construction succeeded.

```text
graph_id: mirofish_2a0d62ee48ed43be
chunks: 22
nodes: 127
edges: 199
```

Simulation preparation succeeded.

```text
simulation_id: sim_0744c54e88e4
profiles: 10
platform: reddit only
max rounds requested: 4
```

The full OASIS runner did not complete cleanly. It generated initial Reddit posts, but `run-status` stayed at round `0`; the runner was stopped to avoid an indefinite background process. Report generation completed afterward, but one generated report section was empty because MiroFish attempted interview-tool calls against the stopped simulation environment.

## Generated Social Signals

MiroFish generated seven initial Reddit-style posts. The strongest signals were:

- Axiom's own launch framing as "architecture contract validation, CI integration, JSON output, validator-first."
- Senior engineer skepticism: static import graphs cannot fully capture architecture health and should be treated as an auxiliary signal, not an authority.
- CI owner requirement: fast PR checks, configurable ignores, and no blocking of urgent fixes.
- Open-source maintainer objection: `.axi` maintenance can burden contributors unless `axi infer` is strong.
- Researcher interest: Axiom may become useful measurement data for AI-generated architecture drift, but accuracy must be validated.
- Startup CTO interest: fast architecture drift is painful enough that advisory drift scoring could be a buying/adoption trigger.
- Noisy-linter objection: focus on actionable errors, not large warning volumes.

## Report Forecast

MiroFish's report title:

```text
Axiom technical-community adoption forecast: polarization and the missing key piece
```

Main forecast:

Axiom is likely to create a polarized technical reception over the next 6-18 months. Some platform leads and startup/product teams will explore it in focused workflows, but skeptical senior engineers, security/compliance reviewers, and agent-framework developers can form a strong rejection pattern if Axiom appears to overclaim.

The report identified three rejection axes:

- Technical skepticism: Axiom v0 cannot prove semantic architecture health or symbol-level API quality.
- Workflow disruption: agent frameworks, CI owners, and linter-weary developers may treat it as another noisy blocking layer.
- Trust/compliance gaps: enterprise architects and security reviewers may reject it if it creates a false sense of architecture safety.

The report's sharpest product risk:

```text
symbol-level API health
```

In other words, Axiom can catch direct hidden re-exports, but it still cannot detect many "compliant but bad" public API surfaces where semantic coupling is routed through a broad barrel, shared type, enum, utility, or public entrypoint. The simulation predicts that senior engineers and AI-code-quality researchers will attack this gap directly.

## Interpretation For Axiom

The live run supports the existing product pivot:

- Keep hard gates for explicit, high-confidence import and visibility intent.
- Keep architecture awareness broader than enforcement.
- Make static-analysis limits visible before users discover them angrily.
- Treat intentional violations as a visible negotiation surface, not hidden suppressions.
- Add performance and CI comfort as first-class product proof.
- Avoid positioning Axiom as a complete architecture firewall.

## Roadmap Implications

High priority:

- Show scan duration and source/import counts in normal CLI output.
- Add a public comparison page against Dependency Cruiser, ESLint, Nx boundaries, ArchUnit, CodeQL, and custom scripts.
- Add a focused `axi graph --attention --json` agent workflow example.
- Add an intentional-violation/debt review command or guide.
- Improve `axi infer` review ergonomics so `.axi` authoring cost stays low.
- Add evidence from real repositories: scan time, false positives, and partial adoption examples.

Investigate, but do not overclaim:

- Symbol-aware public API surface analysis.
- Indirect hidden export leaks.
- Advisory coupling heuristics for broad barrels and shared utility modules.

Do not build yet:

- Full automatic architecture guardian behavior.
- Prompt-wrapper features before the validator loop is stronger.
- Broad semantic quality scoring presented as enforcement.
- Runtime dependency modeling as a v0 promise.

## Confidence

Medium.

Reasons:

- The ontology, graph, profile generation, initial posts, and report sections all ran against MiroFish with live LLM and Zep services.
- The full OASIS run did not progress past round `0`, and the report's first section was empty.
- The generated signals still strongly match independent product pressure-test questions already raised by the user, especially noisy-linter risk, static blind spots, `.axi` maintenance cost, CI friction, and "compliant but bad" public API surfaces.
