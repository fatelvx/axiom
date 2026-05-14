# Targeted MiroFish Backtest Seed: Framework/Tooling Calibration Batch

Use this as a MiroFish-style risk-map prompt after running the clone-only framework/tooling calibration batch across Express, Fastify, ESLint, SvelteKit, and UUID.

This is synthetic forecast input, not user research, demand proof, or a roadmap script.

## Current Axiom State

- Axiom is validator-first: `.axi` spec + source scanner -> declared graph vs observed graph -> hard violations, visible intentional debt, and advisory warnings.
- The strategic target is: credible single-repo validator first; then portable evidence artifact (`.axi` + baseline + `reviewStory` + `intentionalDebt`); GitHub Actions for PR trust; VS Code for authoring/drift navigation; MCP for read-only agent queries over the same evidence; later contract templates/inheritance/sharing.
- Recent work added calibration classification metadata to real-project diff smoke reports.
- A five-repo clone-only, no-install calibration batch just ran across Express `lib/**`, Fastify `lib/**`, ESLint `lib/**`, SvelteKit `packages/kit/src/**`, and UUID `src/**`.
- Safety: no target installs, no package-manager lifecycle scripts, no target tests/builds/actions/submodules/`npx`.
- Results:
  - Express: +0/-0 drift, 1 deep internal import warning.
  - Fastify: +0/-0 drift, 0 warnings, 2 large-file pressure notes.
  - ESLint: +0/-0 drift, 16 warnings, 1 collapsed cycle, 8 large-file pressure notes.
  - SvelteKit: +0/-0 drift, 0 warnings after excluding tests/specs.
  - UUID: +0/-0 drift, 0 warnings after excluding `src/test`.
- npm CLI workspace attempt failed before Axiom because Windows checkout hit a deeply nested fixture path. Treat it as harness/environment evidence, not a target architecture signal.
- Decision taken: no validator/resolver behavior change from this batch. Keep warnings opt-in. Treat scan scope as part of pilot design. Keep portfolio classification as a guardrail against target-specific tuning.

Important nuance:

The diff-smoke harness does use a temporary inferred `.axi` baseline contract as an external spec. However, these are not maintainer-authored or human-reviewed declared contracts. Do not treat the batch as proof that real teams can author and maintain `.axi` yet.

## Forecast Question

After this mixed-shape calibration batch, is Axiom closer to a credible first alpha validator and future GitHub Actions / VS Code / MCP ecosystem path?

What would skeptical senior engineers, AI-tool builders, enterprise/security reviewers, and maintainers still attack?

Should the next step be more validator implementation, more real-project calibration, a limited read-only MCP prototype, or authoring UX?

## Output Shape

Answer as a concise risk map:

1. Overall read: 1-10 credibility score and why.
2. What this batch meaningfully de-risks.
3. What this batch does not prove.
4. Biggest remaining product/architecture risks.
5. Recommended next move for the next 1-2 implementation checkpoints.
6. Clear no-go lines: what not to ship or claim yet.

Do not hallucinate features Axiom does not have. Do not recommend semantic health scores, hidden suppressions, broad AI repair automation, broad MCP write tools, or hard gates from advisory warnings.
