# Spec-First Python Package Pilot

This example is a small package-shaped Python project for the spec-first hard-gate loop.

It models a common repository-local package layout:

- `AppEntry` owns the package entry point.
- `Domain` owns order data and pure domain helpers.
- `Services` owns pricing behavior and may depend on `Domain`.
- `Ui` owns presentation helpers and may depend on `Domain`, but not directly on `Services`.

The project uses explicit package-relative imports such as:

```python
from .ui.presenter import render_order
from ..domain import Order
```

It also includes a conservative type-only import inside a `TYPE_CHECKING`
block so JSON and MCP consumers can see `import.kind: "import_type"` without
turning that evidence into a new contract rule.

Run:

```bash
node ../../dist/cli.js check --root .
node ../../dist/cli.js observe --root . --markdown
node ../../dist/cli.js graph --root . --json --portable > .axi/baselines/current.graph.json
node ../../dist/cli.js diff .axi/baselines/current.graph.json --root .
```

Expected result:

- `axi check` passes at rest.
- Python package `__init__.py` files and explicit relative imports produce observed dependency evidence.
- `axi observe` and `axi diff` stay advisory review surfaces.

The repeatable smoke harness copies this example to a temporary directory, then edits `app/ui/presenter.py` to import `quote_order` from `Services`. That creates `Ui -> Services` drift and must fail as `undeclared_dependency`.

Run the full rehearsal:

```bash
npm run spec-first:smoke
```
