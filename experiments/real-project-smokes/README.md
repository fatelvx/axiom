# Axiom Real-Project Smokes

This folder records small real-repository checks used to calibrate Axiom against code that was not written for Axiom.

These runs are not production benchmarks and they are not endorsements of the scanned projects. They are quick evidence loops for:

- whether Axiom can surface useful architecture signals in ordinary repositories
- whether `axi infer` produces a starter contract that is usable rather than self-conflicting
- where the current representation is too coarse, too noisy, or missing important semantic context

Reports in this folder should be readable by external developers. Keep them framed as scoped calibration artifacts, not as chat transcripts, maintainer critiques, or marketing claims.

## Method

Use a temporary clone, build the local Axiom CLI, and run one of:

```bash
node dist/cli.js infer --root <repo>
node dist/cli.js check --root <repo> --json
node dist/cli.js observe --root <repo> --markdown
```

When a hand-written contract is used, keep it small and state what it is trying to observe. Do not treat the result as a judgment about the whole project.

## Safety Rules

Real-project smokes should prefer repositories that are not part of an active supply-chain incident or active malware remediation window.

For every external repo smoke:

- Clone source only with shallow `git clone`.
- Do not run `npm install`, package-manager lifecycle scripts, build scripts, tests, or repo-provided GitHub Actions.
- Do not run `npx` inside the target repository.
- Do not enable submodules unless a run explicitly justifies it.
- Avoid repos or package namespaces currently named in public compromise advisories, even if the smoke would only inspect source.
- Treat results as architecture calibration, not an endorsement of repository or package safety.

This keeps product evidence from being mixed with avoidable local or CI security risk.

## Version Smoke Harness

Use the version smoke harness when the question is how architecture pressure changes across tags or branches:

```bash
npm run real-project:version-smoke -- \
  --repo https://github.com/colinhacks/zod.git \
  --name zod \
  --refs v3.25.76,v4.0.1,v4.4.3 \
  --warnings coupling,deep,public-api \
  --json-out experiments/real-project-smokes/results/zod-version-smoke-2026-05-13.json \
  --markdown-out experiments/real-project-smokes/results/zod-version-smoke-2026-05-13.md
```

The script clones each ref into a temporary directory, runs `axi infer --group-by workspace`, writes the inferred contract into that clone, then records `axi check --json` and `axi graph --json` with advisory warnings enabled.

Treat this as drift calibration, not an architecture verdict. The inferred contract mirrors each version's current graph; it does not know the maintainers' intended architecture unless that intent is later declared in `.axi`.

Public API surface warnings require active `exposes` rules. Raw inferred contracts usually leave `exposes` suggestions as comments, so public API pressure should be calibrated with a declared or probe contract when that is the question being tested.

## Diff Smoke Harness

Use the diff smoke harness when the question is whether one baseline contract can make version-to-version architecture drift reviewable:

```bash
npm run real-project:diff-smoke -- \
  --repo https://github.com/colinhacks/zod.git \
  --name zod \
  --baseline-ref v4.0.1 \
  --current-ref v4.4.3 \
  --warnings coupling,deep,unresolved \
  --json-out experiments/real-project-smokes/results/zod-diff-smoke-2026-05-13.json \
  --markdown-out experiments/real-project-smokes/results/zod-diff-smoke-2026-05-13.md
```

The script clones the baseline and current refs, optionally writes a small temporary `axiom.config.json` from `--include` / `--exclude`, runs `axi infer --group-by <mode>` on the baseline ref, saves an `axi graph --json` baseline, then runs `axi diff` and `axi observe --baseline --markdown` against the current ref with the inferred contract as an external `--spec`.

This is closer to an Axiom pilot workflow than the version smoke harness. It asks: "If this was the contract snapshot we cared about, what architecture edges and advisory signals changed later?" The answer is still a smoke calibration result, not a maintainer-intent claim.

For complex repositories, run both a whole-repo view and a focused source view when possible. Whole-repo scans can reveal test, benchmark, and runtime harness coupling to source internals. Focused scans such as `--include "src/**"` are better for asking whether the production source graph itself drifted.

Example focused source run:

```bash
npm run real-project:diff-smoke -- \
  --repo https://github.com/honojs/hono.git \
  --name hono-src \
  --baseline-ref v4.8.4 \
  --current-ref v4.9.12 \
  --group-by folder \
  --include "src/**" \
  --warnings coupling,deep,unresolved
```

## Recorded Runs

- [nanoid and zod smoke, 2026-05-13](results/2026-05-13-nanoid-zod.md)
- [zod version architecture smoke, 2026-05-13](results/zod-version-smoke-2026-05-13.md)
- [zod version architecture smoke with public API flag, 2026-05-13](results/zod-version-smoke-public-api-2026-05-13.md)
- [public API surface pilot, 2026-05-13](results/public-api-pilot-2026-05-13.md)
- [zod `axi diff` baseline pilot, 2026-05-13](results/zod-diff-pilot-2026-05-13.md)
- [zod diff architecture smoke from the repeatable harness, 2026-05-13](results/zod-diff-smoke-2026-05-13.md)
- [zustand diff architecture smoke, 2026-05-13](results/zustand-diff-smoke-2026-05-13.md)
- [hono whole-repo diff architecture smoke, 2026-05-13](results/hono-diff-smoke-2026-05-13.md)
- [hono source-scoped diff architecture smoke, 2026-05-13](results/hono-src-diff-smoke-2026-05-13.md)
