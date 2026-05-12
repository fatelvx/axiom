# MiroFish Targeted Backtest: Public API Surface Probe

Created: 2026-05-12T20:04:31.814746+00:00

Method: direct MiroFish `LLMClient` using the local configured model. This is a synthetic forecast and not real user research or a full OASIS social simulation run.

Seed: `experiments/axiom-forecast/seed-public-api-surface-target-2026-05-13.md`
Model: `deepseek-v4-pro` via `api.deepseek.com`

## Forecast Output

1. Executive verdict

Hold. Public-surface probe contracts are high-signal but high-risk for misinterpretation. They expose visible facade pressure that neither lint rules nor directory naming can catch. However, they look like architecture judgment to developers who have not internalized Axiom's philosophy. The pilot evidence is too thin to recommend them as a default onboarding step. Keep them as an advanced calibration tool for teams that already understand that Axiom surfaces observability, not correctness.

2. Stakeholder reaction map

*Senior TypeScript library maintainer*: Sees broad_public_surface as a cheap lint, but public_entrypoint_coupling feels invasive. The zod locales result reads like an obvious false positive because aggregation by design is not decay. Low tolerance for noise; expects a quick ignore mechanism.

*Monorepo platform engineer*: Cares about barrel creep across packages. Would use the probe to find sprawling entrypoints during code review, not as an always-on warning. Wants a way to mark intentional aggregation so repeating warnings don't turn into audit fatigue.

*AI coding workflow maintainer*: Interested because AI agents often add re-exports without understanding facade impact. Would integrate the probe as a non-blocking review comment. Wants it to be opt-in per workspace so agents don't generate alarm fatigue in CI.

*Skeptical Dependency Cruiser / ESLint user*: Immediately asks "How is this different from fan-out count?" Will treat public_entrypoint_coupling as a reimplementation of existing tools unless the product clearly explains that it only counts reachable internals under an active exposes rule, making it architecture-contextual rather than graph-theoretical.

*Small React/Pixi game developer using AI agents*: Sees "public API surface" and assumes Axiom is judging their design. High risk of feeling shamed if a probe surfaces many warnings on a small project. Needs docs that say "this is not a grade; it is a flashlight."

*Open-source contributor reading the README for the first time*: Will scroll past if "public-surface probe" sounds esoteric. If they see a sample output showing "x/internal touched by public entrypoint", they might mistake it for a security scanner. Clear labeling as "optional observability lens" is essential.

3. Strongest adoption wedge

The feature catches architectural entropy that conventional tooling misses. Barrel `export *` and AI-generated re-exports gradually turn a single public entrypoint into an undocumented facade that reaches dozens of internal files. That drift is invisible to ESLint and Dependency Cruiser because they have no concept of a declared public API contract. Axiom's probe gives teams a low-ceremony way to notice that drift during review, not to gate it. This fits teams that already write `.axi` contracts for other reasons, especially monorepos with active AI coding assistance.

4. Strongest rejection pattern

Developers will believe Axiom is claiming the aggregation is wrong. In the zod case, locale aggregation reaching 52 files is intentional, not problematic. If the probe surfaces 19 broad_public_surface warnings and 2 coupling warnings, the immediate reaction will be "these are false positives, the tool does not understand my project." Even with advisory-only wording, the volume will feel like nagging. Without a one-click "this is intentional, suppress for this contract" mechanism, the probe will be dismissed as noisy architecture pedantry.

5. Decision: advanced calibration only

Do not include public-surface probe contracts in the recommended pilot workflow. Keep them as an advanced calibration tool behind explicit documentation. The pilot evidence shows the probe works mechanically but proves nothing about how maintainers interpret the results. Until real-project maintainers explicitly request to see facade pressure for their own contracts, elevating this risk pollutes the signal-to-noise ratio of Axiom's core message.

6. Suggested wording for public docs

"Public API surface probe: An optional observability lens for teams that already have an active `.axi` contract with `exposes` rules. It counts how many same-module internal files a public entrypoint reaches through imports or re-exports. This is not an architecture grade. A high count is not a design mistake. It simply surfaces visible facade pressure so a human can decide whether to refactor, document, or ignore. Use it as a review aid, not as a gate. You can suppress it per contract or per entrypoint."

7. Next engineering/doc tasks, ordered

a. Document the probe under "Advanced techniques", not in the quickstart or pilot guide.
b. Ship a built-in ignore per-entrypoint syntax (e.g., `# axiom ignore public-entrypoint-coupling`) so intentional aggregation does not produce repeated advisory warnings.
c. Publish a one-page interpretation guide with the zod locales example and an explanation of why it is not a false positive but a useful question.
d. Wait for at least three unsolicited reports from real projects where the probe led to a concrete refactor before considering it for default pilot onboarding.

8. What not to claim

Never claim that Axiom's public-surface probe detects architectural health, evaluates API quality, or identifies dangerous dependencies. Never present the coupling count as a proxy for semantic coupling or developer experience. Do not imply that a high `public_entrypoint_coupling` count means the codebase is harder to maintain; only say that it reaches more internals, which is a prompt to review, not a defect.

## Maintainer Interpretation

This target backtest changes the product posture around public-surface probes:

- Keep `--warn-public-api-surface` implemented and documented, but do not place it in the default pilot or PR-summary path.
- Position public-surface probes as an advanced calibration lens for teams that already have active `exposes` rules and specifically want to review public entrypoint growth.
- Use "visible facade pressure" wording instead of "hidden coupling" when the signal is advisory.
- Do not adopt hidden inline ignore syntax from the forecast. If advisory warning acknowledgement becomes necessary later, it should preserve Axiom's visible-debt principle rather than becoming a silent allowlist.

Follow-up taken after this run:

- Removed `--warn-public-api-surface` from the default pilot workflow command and default GitHub PR-summary example.
- Clarified README, getting-started, and adoption docs that public-surface warnings are advanced, advisory, and not an API-quality verdict.
