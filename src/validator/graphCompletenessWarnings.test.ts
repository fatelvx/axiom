import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import type { AxiomModule, DynamicDependencyExpressionRecord, ImportRecord, SourceLocation } from "../axi/types.js";
import {
  findDynamicDependencyExpressionWarnings,
  findUnresolvedImportWarnings
} from "./graphCompletenessWarnings.js";
import { createOwnershipIndex } from "./ownership.js";

test("unresolved import warnings report only owned internal-like static imports", () => {
  const root = path.join("repo");
  const ownership = createOwnershipIndex(root, [moduleRef(root, "App", ["src/app/**"], 1)]);
  const imports: ImportRecord[] = [
    {
      filePath: path.join(root, "src/app/index.ts"),
      line: 1,
      kind: "import",
      specifier: "./generated/runtime"
    },
    {
      filePath: path.join(root, "src/app/index.ts"),
      line: 2,
      kind: "import",
      specifier: "react"
    },
    {
      filePath: path.join(root, "scripts/tool.ts"),
      line: 3,
      kind: "import",
      specifier: "#internal/tool"
    },
    {
      filePath: path.join(root, "src/app/resolved.ts"),
      line: 4,
      kind: "import",
      specifier: "./resolved",
      resolvedPath: path.join(root, "src/app/resolved-target.ts")
    }
  ];

  assert.deepEqual(findUnresolvedImportWarnings(imports, ownership, root), [
    {
      code: "unresolved_import",
      message: "App has an import that Axiom could not resolve into the observed graph.",
      location: {
        filePath: path.join(root, "src/app/index.ts"),
        line: 1
      },
      details: {
        module: "App",
        specifier: "./generated/runtime",
        importKind: "import",
        observed: "App unresolved import",
        resolution: "unresolved",
        scope: "relative_or_package_imports",
        suggestion:
          "Axiom could not map this static import to a source file, so the observed graph may be incomplete. Add the missing file, configure tsconfig/package imports, or exclude generated/runtime paths intentionally."
      }
    }
  ]);
});

test("unresolved Python import warnings stay limited to relative or configured-root prefixes", () => {
  const root = path.join("repo");
  const ownership = createOwnershipIndex(root, [moduleRef(root, "Bot", ["bot/**"], 1)]);
  const imports: ImportRecord[] = [
    {
      filePath: path.join(root, "bot/main.py"),
      line: 1,
      kind: "import",
      specifier: ".local"
    },
    {
      filePath: path.join(root, "bot/main.py"),
      line: 2,
      kind: "import",
      specifier: "common.missing"
    },
    {
      filePath: path.join(root, "bot/main.py"),
      line: 3,
      kind: "import",
      specifier: "utils"
    },
    {
      filePath: path.join(root, "bot/main.py"),
      line: 4,
      kind: "import",
      specifier: "discord.ext"
    }
  ];

  assert.deepEqual(
    findUnresolvedImportWarnings(imports, ownership, root, {
      pythonImportRoots: ["src/common", "src/ui", "."]
    }),
    [
      {
        code: "unresolved_import",
        message: "Bot has an import that Axiom could not resolve into the observed graph.",
        location: {
          filePath: path.join(root, "bot/main.py"),
          line: 1
        },
        details: {
          module: "Bot",
          specifier: ".local",
          importKind: "import",
          observed: "Bot unresolved import",
          resolution: "unresolved",
          scope: "relative_or_package_imports",
          suggestion:
            "Axiom could not map this static import to a source file, so the observed graph may be incomplete. Add the missing file, configure tsconfig/package imports, or exclude generated/runtime paths intentionally."
        }
      },
      {
        code: "unresolved_import",
        message: "Bot has an import that Axiom could not resolve into the observed graph.",
        location: {
          filePath: path.join(root, "bot/main.py"),
          line: 2
        },
        details: {
          module: "Bot",
          specifier: "common.missing",
          importKind: "import",
          observed: "Bot unresolved import",
          resolution: "unresolved",
          scope: "relative_or_package_imports",
          suggestion:
            "Axiom could not map this static import to a source file, so the observed graph may be incomplete. Add the missing file, configure tsconfig/package imports, or exclude generated/runtime paths intentionally."
        }
      }
    ]
  );
});

test("dynamic dependency warnings are sorted and skip unowned files", () => {
  const root = path.join("repo");
  const ownership = createOwnershipIndex(root, [moduleRef(root, "App", ["src/app/**"], 1)]);
  const expressions: DynamicDependencyExpressionRecord[] = [
    {
      filePath: path.join(root, "src/app/z.ts"),
      line: 5,
      kind: "require_expression",
      expressionKind: "Identifier",
      expressionPreview: "name"
    },
    {
      filePath: path.join(root, "scripts/tool.ts"),
      line: 1,
      kind: "dynamic_import_expression",
      expressionKind: "Identifier",
      expressionPreview: "toolName"
    },
    {
      filePath: path.join(root, "src/app/a.ts"),
      line: 2,
      kind: "dynamic_import_expression",
      expressionKind: "TemplateExpression",
      expressionPreview: "`./routes/${routeName}`"
    },
    {
      filePath: path.join(root, "src/app/p.py"),
      line: 3,
      kind: "python_import_expression",
      expressionKind: "importlib.import_module",
      expressionPreview: "module_name"
    }
  ];

  assert.deepEqual(findDynamicDependencyExpressionWarnings(expressions, ownership, root), [
    {
      code: "dynamic_dependency_expression",
      message: "App has a non-literal import() expression that Axiom cannot resolve into the observed graph.",
      location: {
        filePath: path.join(root, "src/app/a.ts"),
        line: 2
      },
      details: {
        module: "App",
        dependencyKind: "import()",
        expressionKind: "TemplateExpression",
        expressionPreview: "`./routes/${routeName}`",
        observed: "App dynamic dependency expression",
        resolution: "not_statically_resolved",
        scope: "dynamic_dependency_expression",
        note:
          "Literal dynamic imports are scanned as observed dependencies; non-literal dependency expressions are graph-incompleteness evidence.",
        suggestion:
          "Prefer literal imports or a visible registry when the dependency is architectural, or document it as runtime wiring outside Axiom's static graph."
      }
    },
    {
      code: "dynamic_dependency_expression",
      message:
        "App has a non-literal importlib.import_module() expression that Axiom cannot resolve into the observed graph.",
      location: {
        filePath: path.join(root, "src/app/p.py"),
        line: 3
      },
      details: {
        module: "App",
        dependencyKind: "importlib.import_module()",
        expressionKind: "importlib.import_module",
        expressionPreview: "module_name",
        observed: "App dynamic dependency expression",
        resolution: "not_statically_resolved",
        scope: "dynamic_dependency_expression",
        note:
          "Literal dynamic imports are scanned as observed dependencies; non-literal dependency expressions are graph-incompleteness evidence.",
        suggestion:
          "Prefer literal imports or a visible registry when the dependency is architectural, or document it as runtime wiring outside Axiom's static graph."
      }
    },
    {
      code: "dynamic_dependency_expression",
      message: "App has a non-literal require() expression that Axiom cannot resolve into the observed graph.",
      location: {
        filePath: path.join(root, "src/app/z.ts"),
        line: 5
      },
      details: {
        module: "App",
        dependencyKind: "require()",
        expressionKind: "Identifier",
        expressionPreview: "name",
        observed: "App dynamic dependency expression",
        resolution: "not_statically_resolved",
        scope: "dynamic_dependency_expression",
        note:
          "Literal dynamic imports are scanned as observed dependencies; non-literal dependency expressions are graph-incompleteness evidence.",
        suggestion:
          "Prefer literal imports or a visible registry when the dependency is architectural, or document it as runtime wiring outside Axiom's static graph."
      }
    }
  ]);
});

function moduleRef(root: string, name: string, paths: string[], line: number): AxiomModule {
  return {
    name,
    location: loc(root, "axiom/main.axi", line),
    paths,
    pathLocations: paths.map((_, index) => loc(root, "axiom/main.axi", line + index + 1)),
    depends: [],
    forbidsModules: [],
    exposes: [],
    hides: [],
    suppressions: [],
    forbidsCapabilities: [],
    requires: []
  };
}

function loc(root: string, relativeFilePath: string, line: number): SourceLocation {
  return {
    filePath: path.join(root, relativeFilePath),
    line
  };
}
