# Contributing To Axiom

Thanks for helping sharpen Axiom.

Axiom is validator-first: `.axi` contracts plus source scanning produce concrete architecture diagnostics. New features should preserve the split between hard violations, visible intentional debt, and advisory warnings.

## Local Setup

```bash
npm install
npm run build
npm test
npm run axiom:self
```

Useful checks:

```bash
npm run ci
npm run perf:smoke
node dist/cli.js check --root examples/basic-app
node dist/cli.js observe --root examples/basic-app
```

## Good First Contributions

- Better examples and adoption docs.
- Resolver hardening for common TypeScript or monorepo patterns.
- Focused diagnostics that make an existing violation easier to repair.
- Small advisory signals that surface real architecture pressure without becoming default gates.

## Before Changing `.axi`

Open a discussion or issue before changing the language grammar.

Language changes should answer:

- Is this reliable enough to enforce, or should it start advisory?
- Can the diagnostic point to a concrete file, line, rule, and repair path?
- Does this keep `.axi` small and line-oriented?
- Does this avoid hidden allowlists and invisible suppressions?
- Can existing users adopt it gradually?

## Pull Requests

For implementation PRs:

- Add or update tests.
- Update README, guides, or changelog when behavior changes.
- Run `npm test`.
- Run `npm run axiom:self`.
- Keep unrelated refactors out of the PR.

For performance changes:

- Run `npm run perf:smoke`.
- Keep synthetic numbers caveated.
- Prefer repeatable artifacts over broad speed claims.

For MiroFish or forecast artifacts:

- Publish sanitized summaries only.
- Do not commit API keys, `.env`, local private paths, or raw runtime dumps.
- Label outputs as synthetic forecasts, not real user research.
