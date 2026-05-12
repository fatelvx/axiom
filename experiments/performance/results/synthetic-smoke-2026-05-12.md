# Axiom Synthetic Performance Smoke

Date: 2026-05-12

Commit under test:

```text
working tree after adding scripts/perf-smoke.mjs
```

Environment:

```text
OS: Windows x64
Node: v24.14.1
CPU: Intel(R) Core(TM) i5-8400 CPU @ 2.80GHz
Command: npm run perf:smoke
```

## Method

The smoke harness creates a temporary synthetic TypeScript workspace with generated modules, source files, cross-module imports, and an `.axi` contract that declares the generated dependencies.

The measured `axi check duration` is the child process duration for:

```bash
node dist/cli.js check --root <temp-root>
```

It excludes TypeScript build time and fixture generation time, but includes cold Node CLI startup, source discovery, import parsing, import resolution, ownership matching, validation, and human summary output.

## Results

| Modules | Files / module | Source files | Imports scanned | Observed dependencies | Fixture generation | `axi check` duration | Files / sec | Imports / sec |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 50 | 40 | 2,000 | 3,880 | 3,880 | 5,543.6 ms | 7,796.8 ms | 257 | 498 |
| 100 | 100 | 10,000 | 19,700 | 19,700 | 41,413.3 ms | 78,667.2 ms | 127 | 250 |

## Interpretation

This gives Axiom a repeatable baseline instead of a vague performance claim.

The small synthetic run is comfortable enough for local smoke testing. The 10k-file cold run completes, but at roughly 79 seconds on this Windows machine it can absolutely become a CI adoption blocker for teams that expect every PR check to be short.

This supports the product's honest positioning:

- Axiom should not promise large-monorepo comfort without scope control.
- Users should rely on `include`, `exclude`, and focused contract locations during early adoption.
- Resolver/discovery caching and more realistic pilot measurements are meaningful next work before claiming broad monorepo readiness.

## Caveat

Synthetic projects are simpler than real monorepos. They do not exercise complex package export graphs, generated source folders, mixed languages, path alias depth, or large dependency trees. Treat this as a regression and honesty harness, not production benchmark proof.
