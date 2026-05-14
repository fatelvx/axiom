# Alpha Notes

Axiom `v0.6.0-alpha.2` is the first Static Contract Loop milestone.

It is an alpha because the core loop is real, but the public API and surrounding ecosystem are still intentionally small:

```text
.axi contract + static source scanner
-> declared graph vs observed graph
-> hard violations, advisory review, baseline drift, visible intentional debt
```

## What This Alpha Is For

Use this alpha to test whether Axiom can protect explicit architecture boundaries in a real TypeScript, JavaScript, or Vue codebase.

Good alpha targets:

- a small service/app boundary you already care about;
- a module with private internals and a public entry point;
- a monorepo package boundary;
- an AI-generated or fast-moving repository where import drift is hard to see;
- a PR workflow that wants `axi check` as the hard gate and `axi observe` as review context.

## What Is Stable Enough To Try

- `axi check` as the hard gate for reviewed `.axi` contracts.
- `axi infer` as current-graph authoring evidence, not architecture truth.
- `axi observe`, `axi graph`, and `axi diff` as advisory review surfaces.
- JSON, Markdown, and Mermaid outputs for CI, PRs, dashboards, and agents.
- GitHub Actions examples.
- The read-only MCP preview surface.
- Static imports in `.ts`, `.tsx`, `.js`, `.jsx`, `.mts`, `.cts`, and Vue SFC `<script>` blocks.

## Known Alpha Limits

- Runtime-only dependency paths are not observed: non-literal dynamic imports, dependency injection containers, plugin registries, generated imports, and `eval` stay outside v0 static evidence.
- A quiet graph does not prove healthy design inside a large file.
- Inferred contracts mirror the current graph; they are not maintainer-declared intent.
- Advisory warnings and baseline drift are not CI gates unless your workflow explicitly promotes them.
- Axiom does not prove symbol-level API health. Broad barrels, facades, and shared types can still hide coupling even when import paths obey the contract.
- Python support is intentionally not part of this alpha.

## MiroFish Backtests

During development, Axiom used MiroFish-style synthetic backtests as release and roadmap pressure maps. Those runs helped identify risks such as noisy-linter perception, static-analysis blind spots, MCP agent misuse, and Vue SFC under-scanning.

Treat those backtests as design review inputs only. They are not user research, demand proof, benchmark proof, contribution credit, or evidence that a market exists.

## Release Criteria

Before tagging this alpha, the candidate package should pass:

```bash
npm test
npm run axiom:self
npm run spec-first:smoke
npm run mcp:smoke
npm run mcp:agent-loop:smoke
npm run mcp:conformance:smoke
npm run github-actions:smoke
npm run release:candidate:smoke
npm run pack:dry-run
```

The release candidate smoke packs the local package without publishing, extracts the tarball, then verifies packaged CLI examples, Vue SFC scanning, monorepo path coverage, inference JSON, bin aliases, and the MCP entry point.
