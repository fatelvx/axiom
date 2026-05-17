# Spec-First Python Pilot

This example is a sanitized Python version of the spec-first hard-gate loop.

It models a small bot-style Python app:

- `AppEntry` owns `main.py`.
- `Cogs` owns command handlers under `cogs/**`.
- `Common` owns shared helpers.
- `Gacha` and `Market` own feature/domain behavior.
- `Ui` owns presentation helpers and may depend on `Common`, but not directly on `Market`.

The project uses `pythonImportRoots` because the source roots are explicit import roots rather than package-relative imports:

```json
"pythonImportRoots": ["src/common", "src/ui", "src/market", "src/gacha", "."]
```

Run:

```bash
node ../../dist/cli.js check --root .
node ../../dist/cli.js observe --root . --markdown
node ../../dist/cli.js graph --root . --json --portable > .axi/baselines/current.graph.json
node ../../dist/cli.js diff .axi/baselines/current.graph.json --root .
```

Expected result:

- `axi check` passes at rest.
- Python static imports produce the same observed dependency evidence as TS/JS imports.
- Literal Python `importlib.import_module("...")` calls can produce observed dynamic-import edges when they resolve to repo-local source.
- Non-literal Python importlib-style calls stay opt-in graph-completeness warnings under `--warn-dynamic-imports`.
- `axi observe` and `axi diff` stay advisory review surfaces.

The repeatable smoke harness copies this example to a temporary directory, then edits `src/ui/trade_modals.py` to import `order_engine`. That creates `Ui -> Market` drift and must fail as `undeclared_dependency`.

Run the full rehearsal:

```bash
npm run spec-first:smoke
```
