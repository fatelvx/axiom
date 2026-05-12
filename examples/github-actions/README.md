# GitHub Actions Example

This folder contains a copyable GitHub Actions integration for Axiom.

Files:

- `axiom-pr-review.yml`: hard `axi check` gate plus PR/job summary.
- `annotate-check.mjs`: optional helper that turns `axi check --json` hard violations into GitHub annotations.

The workflow is intentionally split:

- `axi check --json` decides whether the job fails.
- `annotate-check.mjs` only annotates hard violations.
- `axi observe --markdown` writes review context for humans and agents.

See [GitHub Actions And PR Summaries](../../guides/github-actions.md) for the full guide.

From the repository root, run this smoke test to verify the example wiring:

```bash
npm run github-actions:smoke
```
