# Axiom Synthetic Performance Smoke: Ownership Lookup Memoization

Date: 2026-05-12

Change under test:

```text
Memoize module ownership matches per resolved source path inside the validator ownership index.
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
| 50 | 40 | 2,000 | 3,880 | 3,880 | 1,300.8 ms | 2,914.1 ms | 686 | 1,331 |
| 100 | 100 | 10,000 | 19,700 | 19,700 | 7,665.4 ms | 10,002.0 ms | 1,000 | 1,970 |

## Comparison To Initial Baseline

| Source files | Initial `axi check` duration | After memoization | Approximate change |
| ---: | ---: | ---: | ---: |
| 2,000 | 7,796.8 ms | 2,914.1 ms | 2.7x faster |
| 10,000 | 78,667.2 ms | 10,002.0 ms | 7.9x faster |

## Interpretation

Repeated module ownership matching was a major early cost center. The same source path can be checked multiple times while validating import sites, building observed dependencies, evaluating visibility rules, checking unowned files, and producing warning surfaces. Caching ownership matches per resolved path removes repeated glob work without changing validation semantics.

This is a meaningful product-risk reduction for the "slow CI step" objection, but it is still synthetic evidence. The result should be treated as a local regression signal and adoption comfort check, not as proof that every large monorepo will be fast.

Next performance work should focus on real pilot repositories, resolver/discovery caching, scoped PR workflows, and measurements that include complex package export graphs.
