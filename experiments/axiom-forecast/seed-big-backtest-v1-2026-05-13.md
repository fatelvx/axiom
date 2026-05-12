# Axiom Big Backtest V1 Seed

Date: 2026-05-13

Repository snapshot: current `master` after the pilot workflow, external contract support, real-project smoke notes, and observe-first positioning work.

This seed is for a MiroFish-style synthetic forecast. Treat the output as a risk map, not user research, demand proof, or a roadmap script.

## Product Position

Axiom is moving from an "architecture enforcement tool" framing toward an architecture observability layer with enforceable contracts.

The core promise is:

> Code can be locally correct while globally collapsing.

Axiom makes architecture drift, hidden coupling, and accepted debt visible before they become normal. It can still fail CI, but only for explicit, high-confidence architecture contracts.

Axiom is not:

- a complete architecture oracle
- a semantic code understanding engine
- a prompt wrapper
- a replacement for ESLint, Dependency Cruiser, Nx, CodeQL, tests, or review
- a guarantee that broad public APIs are semantically healthy

Axiom is:

- `.axi` declared intent plus source scanner
- declared graph vs observed graph
- hard violations for explicit contract breaks
- advisory warnings for pressure signals
- visible intentional violations and accepted debt
- Markdown and JSON outputs for PRs, humans, and AI agents
- a repository cognition layer candidate, but only if the validator loop stays real

## Current Implemented Surface

The current CLI includes:

- `axi check`
- `axi observe`
- `axi graph`
- `axi infer`

Implemented signals include:

- module ownership through `path`
- allowed dependencies through `depends on`
- forbidden module edges
- layer direction checks
- public/private module surfaces with `exposes` and `hides`
- direct hidden-path re-export detection
- local import-then-export hidden leak detection from exposed entry points
- broad `export *` public API surface warnings through `--warn-public-api-surface`
- coupling concentration warnings through `--warn-coupling-concentration`
- unresolved static import warnings through `--warn-unresolved-imports`
- deep internal import warnings through `--warn-deep-internal-imports`
- baseline-aware observed edge drift through `--baseline`
- Markdown PR / agent review summaries through `--markdown`
- top-level graph JSON `intentionalDebt`
- visible intentional violations with expiration date and reason
- external contract scanning through `--spec <path>`
- pilot workflow guidance for scanning a repo without committing `.axi` into it
- GitHub Actions guide and performance smoke workflow
- comparison guide against ESLint architecture rules, Dependency Cruiser, Nx boundaries, CodeQL, and scripts

## Recent Evidence

Synthetic performance smoke:

- 10,000 files / 19,700 imports originally took about 78.7s on local Windows.
- ownership lookup memoization reduced that synthetic case to about 10.0s locally.
- Linux CI smoke artifacts are collected separately; the README does not publish guessed Linux numbers.

Lumina external smoke:

- Axiom was used as an external architecture scanner, not committed into the target repo.
- An advisory contract on a React/Pixi/AI-assisted project surfaced real architecture pressure:
  - Components + Hooks inferred as a cycle group.
  - Services + Store inferred as a cycle group.
  - Strict public API contract produced many violations because UI directly imported `services/*` and `store/chatStore`.
  - Advisory mode produced useful drift warnings without being suitable as a CI gate yet.
- This validated the distinction:
  - code-health audit: broad pressure dashboard
  - Axiom: concrete architecture boundary X-ray

Small open-source pilot direction:

- Candidate repos for smoke: `nanoid` for a tiny clean package, `zod` for a richer library with public/mini/locales surfaces.
- Useful possible findings:
  - deep internal imports
  - overexposed public API barrels
  - cycles
  - unexpected central dependency hubs
  - drift across versions
  - mismatch between stated public/internal boundaries and observed imports

## Known Product Philosophy

Use the forecast through this filter:

1. Is the issue something Axiom must eventually face?
2. Would a fix help hesitant real adopters, not just silence skeptics?
3. Does the fix preserve Axiom's core difference as an architecture contract validator and observability layer?

Do not blindly optimize for simulated criticism. Absorb the problems, not the answers.

## Known Hard Boundaries And Gaps

Symbol-level API health is the largest honest gap:

- Axiom can catch direct hidden imports and some export leaks.
- It can warn on broad public barrels.
- It cannot prove that a giant `index.ts`, facade, shared type module, utility module, or wrapper API is semantically healthy.
- It can be gamed by compliance-shaped code that routes everything through a public entry point while coupling remains high.

Static analysis blind spots:

- string-based dependency injection
- plugin registries
- generated imports
- runtime-only dynamic imports
- `eval`
- path construction that cannot be resolved at scan time

Adoption risks:

- false positives
- noisy advisory warnings
- slow CI on very large repos
- `.axi` maintenance cost at hundreds of modules
- users treating advisory output as a hard gate
- agents optimizing to pass rules instead of preserving intent
- hidden allowlists eroding trust
- public claims sounding like "Dependency Cruiser with a new syntax"

## Questions For The Backtest

Run this as a future-facing product reception forecast after the latest changes.

Answer in Traditional Chinese.

Please simulate skeptical but realistic reactions from these stakeholder groups:

- senior monorepo platform engineer
- AI coding tool builder
- frontend game developer using React/JSX/Pixi with heavy AI assistance
- open-source library maintainer
- static analysis researcher
- engineering manager considering CI adoption
- agent framework builder who wants repair loops
- skeptical developer who hates noisy linters
- security / compliance engineer
- early adopter who likes architecture observability

Evaluate:

1. Is Axiom now credible as "architecture observability with enforceable contracts", or does it still read like a rebranded linter?
2. What would make a real project try it in advisory mode?
3. What would block CI adoption?
4. Which current feature is most compelling?
5. Which current feature is most likely to be misunderstood?
6. What is the strongest remaining technical objection?
7. What is the strongest remaining product/onboarding objection?
8. Is `--spec` external contract scanning enough to make pilots easier?
9. Are intentional violations / visible debt a real adoption unlock or just process overhead?
10. Does Axiom have a defensible distinction from Dependency Cruiser and ESLint architecture rules?
11. What should Axiom absolutely not build next?
12. What one or two engineering tasks would most improve signal-to-noise before a larger public push?
13. If a repo like Lumina gets useful advisory findings, what should Axiom's next pilot workflow be?
14. If a repo like Zod is scanned across versions, what evidence would actually be convincing rather than cherry-picked?

Output format:

- Executive verdict
- Stakeholder reaction map
- Strongest objections
- Most promising adoption wedge
- Roadmap traps to avoid
- Recommended next engineering tasks, ranked by signal/noise and implementation size
- What to say publicly
- What not to claim publicly
- Decision: run more small pilots first, or start a larger public/backtest push?
