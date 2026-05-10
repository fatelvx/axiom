# Getting Started With Axiom

Axiom validates architecture contracts against real TypeScript and JavaScript imports.

The short version:

```text
.axi contract -> declared graph
source imports -> observed graph
Axiom compares both and reports architecture drift
```

## 1. Install

Axiom's npm package target is `@fatelvx/axiom`. The unscoped `axiom` package name is already used by another package, so the first alpha release uses a scoped package.

Until the first npm publish, install from this repository checkout:

```bash
npm install
npm run build
npm install -g .
```

Then run:

```bash
axi --help
```

You can also use the local build without global install:

```bash
node dist/cli.js check --root examples/basic-app
```

After the first npm publish:

```bash
npm install -D @fatelvx/axiom
npx axi check --root .
npx @fatelvx/axiom check --root .
```

## 2. Run The Example

The fastest way to feel the tool is the intentionally invalid example:

```bash
node dist/cli.js check --root examples/basic-app
```

You should see two violations:

- `unexposed_import`: UI imports a Services file that is not part of the public surface.
- `hidden_import`: UI imports a Services internal file.

For a smaller view:

```bash
node dist/cli.js graph --root examples/basic-app --violations-only
```

## 3. Write A First Contract

Create `axiom/main.axi` in your project:

```axi
layers Domain -> App -> UI

module Domain
path "src/domain/**"
layer Domain
exposes "src/domain/index.ts"

module Services
path "src/services/**"
layer App
depends on Domain
exposes "src/services/index.ts"
hides "src/services/internal/**"

module UI
path "src/ui/**"
layer UI
depends on Services
```

This says:

- Domain is the inner layer.
- Services may depend on Domain.
- UI may depend on Services.
- Other modules should import Services through `src/services/index.ts`.
- `src/services/internal/**` is private.

## 4. Run The Check

```bash
axi check --root .
```

If the code follows the contract, Axiom exits `0`.

If the code breaks the contract, Axiom exits `1` and prints the file, line, observed dependency, rule, and suggested fix.

## 5. Adopt Gradually

You do not need to model the whole repository on day one.

Start with one boundary that matters:

- UI should not import backend internals.
- Domain should not import React.
- Runtime code should not import test helpers.
- Public services should be used through an index file.

By default, files not owned by a module path are ignored. Use these when the contract is mature:

```bash
axi check --root . --warn-unowned
axi check --root . --strict
```

## 6. Generate A Starter Draft

For an existing project:

```bash
axi infer --root .
```

For a more detailed draft:

```bash
axi infer --root . --group-depth 2
```

For a workspace or monorepo:

```bash
axi infer --root . --group-by workspace
```

The inferred contract is a starting point, not a final architecture. Rename modules, add layers, tighten `depends on`, and add `exposes` or `hides` after review.
