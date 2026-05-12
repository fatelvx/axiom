# Axiom Real-Project Smokes

This folder records small real-repository checks used to calibrate Axiom against code that was not written for Axiom.

These runs are not production benchmarks and they are not endorsements of the scanned projects. They are quick evidence loops for:

- whether Axiom can surface useful architecture signals in ordinary repositories
- whether `axi infer` produces a starter contract that is usable rather than self-conflicting
- where the current representation is too coarse, too noisy, or missing important semantic context

## Method

Use a temporary clone, build the local Axiom CLI, and run one of:

```bash
node dist/cli.js infer --root <repo>
node dist/cli.js check --root <repo> --json
node dist/cli.js observe --root <repo> --markdown
```

When a hand-written contract is used, keep it small and state what it is trying to observe. Do not treat the result as a judgment about the whole project.

## Recorded Runs

- [nanoid and zod smoke, 2026-05-13](results/2026-05-13-nanoid-zod.md)
