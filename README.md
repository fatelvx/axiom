# Axiom

![Axiom architecture firewall banner](assets/banner.svg)

Axiom is an architecture compiler for AI-era codebases.

It reads `.axi` architecture contracts, scans real TypeScript/JavaScript source imports, builds declared and observed dependency graphs, and fails when the code breaks the declared architecture.

The core idea:

```text
.axi spec -> declared graph
source code -> observed graph
declared graph vs observed graph -> architecture breach report
```

Axiom is not an AI prompt wrapper. The first product is a real validator that can fail CI.

## Status

`v0.1` is an architecture firewall MVP.

It currently supports:

- `.axi` parser.
- TypeScript/JavaScript relative import scanning.
- Module path ownership.
- Declared vs observed dependency checks.
- Layer direction checks.
- Human-readable diagnostics.
- JSON output for CI and agents.
- Non-zero exit code on violations.

## Install

```bash
npm install
npm run build
```

Requirements:

- Node.js 20+
- npm

## Quickstart

Create an architecture contract:

```axi
layers Core -> UI

module Physics
path "src/physics/**"
layer Core

module Rendering
path "src/rendering/**"
layer UI

module Simulation
path "src/simulation/**"
layer Core
depends Physics
forbids module Rendering
purpose "deterministic physics simulation"
```

Run the validator:

```bash
node dist/cli.js check --root fixtures/basic-ts-valid
```

Expected output:

```text
Axiom check passed.
modules: 3
source files: 3
imports scanned: 1
observed dependencies: 1
```

Try a failing example:

```bash
node dist/cli.js check --root fixtures/layer-breach
```

Expected output:

```text
Axiom check failed.
violations: 1

error layer_breach src/simulation/step.ts:1
  Simulation in layer Core imports Rendering in outer layer UI.
  observed: Simulation -> Rendering via "../rendering/draw"
  rule: layers Core -> UI (axiom/main.axi:1)
  fix: Move the dependency inward, invert the dependency, or change the layer declarations.
```

## CLI

```bash
node dist/cli.js check --root <project>
node dist/cli.js check --root <project> --json
```

Default discovery skips common dependency, build, cache, generated, and local runtime folders:

```text
.benchmark_tmp
.cache
.git
.lumina
.next
.nuxt
.svelte-kit
.turbo
.vite
build
coverage
dist
generated-projects
node_modules
out
src-tauri
target
temp
tmp
```

Exit codes:

- `0`: no violations
- `1`: one or more violations

## JSON Output

`axi check --json` emits a stable v1 payload for CI and agent feedback loops:

```json
{
  "schemaVersion": "axiom.check.v1",
  "ok": false,
  "root": "/absolute/project/root",
  "summary": {
    "modules": 2,
    "specFiles": 1,
    "sourceFiles": 2,
    "importsScanned": 1,
    "observedDependencies": 1,
    "violations": 1
  },
  "specFiles": ["axiom/main.axi"],
  "sourceFiles": ["src/rendering/draw.ts", "src/simulation/step.ts"],
  "modules": [
    {
      "name": "Rendering",
      "paths": ["src/rendering/**"],
      "layer": "UI",
      "depends": [],
      "forbidsModules": [],
      "location": {
        "filePath": "axiom/main.axi",
        "line": 3
      }
    },
    {
      "name": "Simulation",
      "paths": ["src/simulation/**"],
      "layer": "Core",
      "depends": ["Rendering"],
      "forbidsModules": [],
      "location": {
        "filePath": "axiom/main.axi",
        "line": 7
      }
    }
  ],
  "observedDependencies": [
    {
      "fromModule": "Simulation",
      "toModule": "Rendering",
      "import": {
        "filePath": "src/simulation/step.ts",
        "line": 1,
        "specifier": "../rendering/draw",
        "resolvedPath": "src/rendering/draw.ts"
      }
    }
  ],
  "violations": [
    {
      "code": "layer_breach",
      "message": "Simulation in layer Core imports Rendering in outer layer UI.",
      "location": {
        "filePath": "src/simulation/step.ts",
        "line": 1
      },
      "details": {
        "fromModule": "Simulation",
        "toModule": "Rendering",
        "observed": "Simulation -> Rendering",
        "rule": "layers Core -> UI",
        "ruleLocation": {
          "filePath": "axiom/main.axi",
          "line": 1
        },
        "suggestion": "Move the dependency inward, invert the dependency, or change the layer declarations."
      }
    }
  ]
}
```

Paths inside `specFiles`, `sourceFiles`, `modules`, `observedDependencies`, and `violations` are relative to `root`. Code-specific data lives under `violations[].details`; consumers should key primarily on `schemaVersion`, `ok`, `summary`, and `violations[].code`.

## Violation Types

Axiom v0.1 can report:

- `forbidden_dependency`
- `undeclared_dependency`
- `layer_breach`
- `ambiguous_module_owner`
- `cycle_dependency`
- `unknown_module`
- `unknown_layer`
- `duplicate_module`
- `duplicate_layer_order`
- `missing_module_path`
- `parse_error`
- `no_spec_files`

## Test Fixtures

Useful fixtures:

- `fixtures/basic-ts-valid`
- `fixtures/basic-ts-invalid`
- `fixtures/basic-ts-undeclared`
- `fixtures/layer-valid`
- `fixtures/layer-breach`
- `fixtures/ambiguous-owner`
- `fixtures/cycle`

## Development

```bash
npm test
npm run check:fixture
node dist/cli.js check --root fixtures/layer-breach --json
```

## Roadmap

Near-term:

- Strict mode for unowned source files.
- Better import scanner coverage for multiline imports.
- GitHub Actions example.
- `axi graph` command.
- External package dependency modelling.

Later:

- Capability rules such as wall clock, network, filesystem, and random.
- AI context compiler as a derived output.
- Agent repair loop.
