import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createImportResolver } from "./importResolver.js";
import { scanImports, scanSourceFile } from "./importScanner.js";

test("scanner resolves relative dynamic imports and barrel index imports", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-imports-"));

  try {
    writeFile(
      root,
      "src/app.ts",
      [
        'import { value } from "./feature";',
        'export { publicApi } from "./barrel";',
        'const lazy = () => import("./lazy");',
        'const legacy = require("./legacy");'
      ].join("\n")
    );
    writeFile(root, "src/feature.ts", "export const value = true;\n");
    writeFile(root, "src/barrel/index.ts", "export const publicApi = true;\n");
    writeFile(root, "src/lazy.ts", "export const lazy = true;\n");
    writeFile(root, "src/legacy.js", "exports.legacy = true;\n");

    const imports = scanImports(path.join(root, "src/app.ts"));

    assert.deepEqual(
      imports.map((record) => ({
        line: record.line,
        kind: record.kind,
        specifier: record.specifier,
        resolvedPath: normalize(root, record.resolvedPath)
      })),
      [
        {
          line: 1,
          kind: "import",
          specifier: "./feature",
          resolvedPath: "src/feature.ts"
        },
        {
          line: 2,
          kind: "export",
          specifier: "./barrel",
          resolvedPath: "src/barrel/index.ts"
        },
        {
          line: 3,
          kind: "dynamic_import",
          specifier: "./lazy",
          resolvedPath: "src/lazy.ts"
        },
        {
          line: 4,
          kind: "require",
          specifier: "./legacy",
          resolvedPath: "src/legacy.js"
        }
      ]
    );
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("scanner records non-literal dynamic dependency expressions without inventing graph edges", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-imports-dynamic-expr-"));

  try {
    writeFile(
      root,
      "src/app.ts",
      [
        "const lazyName = './lazy';",
        "const lazy = () => import(lazyName);",
        "const templated = () => import(`./pages/${lazyName}`);",
        "const legacy = require(lazyName);",
        "const literal = () => import('./literal');"
      ].join("\n")
    );
    writeFile(root, "src/literal.ts", "export const literal = true;\n");

    const scan = scanSourceFile(path.join(root, "src/app.ts"));

    assert.deepEqual(
      scan.imports.map((record) => ({
        line: record.line,
        kind: record.kind,
        specifier: record.specifier,
        resolvedPath: normalize(root, record.resolvedPath)
      })),
      [
        {
          line: 5,
          kind: "dynamic_import",
          specifier: "./literal",
          resolvedPath: "src/literal.ts"
        }
      ]
    );
    assert.deepEqual(
      scan.dynamicDependencyExpressions.map((record) => ({
        line: record.line,
        kind: record.kind,
        expressionKind: record.expressionKind,
        expressionPreview: record.expressionPreview
      })),
      [
        {
          line: 2,
          kind: "dynamic_import_expression",
          expressionKind: "Identifier",
          expressionPreview: "lazyName"
        },
        {
          line: 3,
          kind: "dynamic_import_expression",
          expressionKind: "TemplateExpression",
          expressionPreview: "`./pages/${lazyName}`"
        },
        {
          line: 4,
          kind: "require_expression",
          expressionKind: "Identifier",
          expressionPreview: "lazyName"
        }
      ]
    );
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("scanner treats module.require as CommonJS dependency evidence", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-imports-module-require-"));

  try {
    writeFile(
      root,
      "src/app.ts",
      [
        'const direct = module.require("./direct");',
        "const lazyName = './lazy';",
        "const lazy = module.require(lazyName);"
      ].join("\n")
    );
    writeFile(root, "src/direct.js", "exports.direct = true;\n");

    const scan = scanSourceFile(path.join(root, "src/app.ts"));

    assert.deepEqual(
      scan.imports.map((record) => ({
        line: record.line,
        kind: record.kind,
        specifier: record.specifier,
        resolvedPath: normalize(root, record.resolvedPath)
      })),
      [
        {
          line: 1,
          kind: "require",
          specifier: "./direct",
          resolvedPath: "src/direct.js"
        }
      ]
    );
    assert.deepEqual(
      scan.dynamicDependencyExpressions.map((record) => ({
        line: record.line,
        kind: record.kind,
        expressionKind: record.expressionKind,
        expressionPreview: record.expressionPreview
      })),
      [
        {
          line: 3,
          kind: "require_expression",
          expressionKind: "Identifier",
          expressionPreview: "lazyName"
        }
      ]
    );
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("scanner reads Python static imports and repo-local resolution", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-imports-python-"));

  try {
    writeFile(
      root,
      "app/main.py",
      [
        "import app.services.worker as worker",
        "from app.services import registry",
        "from .services.worker import run",
        "from . import settings",
        "from ..shared import helpers",
        "from utils import load_db",
        "from discord.ext import commands",
        "def handle_message():",
        "    pass",
        "class BotClient:",
        "    pass"
      ].join("\n")
    );
    writeFile(root, "app/__init__.py", "");
    writeFile(root, "app/settings.py", "TOKEN = 'x'\n");
    writeFile(root, "app/services/__init__.py", "");
    writeFile(root, "app/services/worker.py", "def run(): pass\n");
    writeFile(root, "app/services/registry.py", "registry = {}\n");
    writeFile(root, "shared/__init__.py", "");
    writeFile(root, "shared/helpers.py", "def help(): pass\n");
    writeFile(root, "src/common/utils.py", "def load_db(): pass\n");

    const scan = scanSourceFile(path.join(root, "app/main.py"), {
      resolver: createImportResolver({ root })
    });

    assert.deepEqual(
      scan.imports.map((record) => ({
        line: record.line,
        kind: record.kind,
        specifier: record.specifier,
        resolvedPath: normalize(root, record.resolvedPath),
        importedBindings: record.importedBindings
      })),
      [
        {
          line: 1,
          kind: "import",
          specifier: "app.services.worker",
          resolvedPath: "app/services/worker.py",
          importedBindings: [{ localName: "worker", importedName: "app.services.worker" }]
        },
        {
          line: 2,
          kind: "import",
          specifier: "app.services.registry",
          resolvedPath: "app/services/registry.py",
          importedBindings: [{ localName: "registry", importedName: "registry" }]
        },
        {
          line: 3,
          kind: "import",
          specifier: ".services.worker",
          resolvedPath: "app/services/worker.py",
          importedBindings: [{ localName: "run", importedName: "run" }]
        },
        {
          line: 4,
          kind: "import",
          specifier: ".settings",
          resolvedPath: "app/settings.py",
          importedBindings: [{ localName: "settings", importedName: "settings" }]
        },
        {
          line: 5,
          kind: "import",
          specifier: "..shared.helpers",
          resolvedPath: "shared/helpers.py",
          importedBindings: [{ localName: "helpers", importedName: "helpers" }]
        },
        {
          line: 6,
          kind: "import",
          specifier: "utils",
          resolvedPath: "src/common/utils.py",
          importedBindings: [{ localName: "load_db", importedName: "load_db" }]
        },
        {
          line: 7,
          kind: "import",
          specifier: "discord.ext",
          resolvedPath: undefined,
          importedBindings: [{ localName: "commands", importedName: "commands" }]
        }
      ]
    );
    assert.equal(scan.metrics.functionLikeCount, 1);
    assert.equal(scan.metrics.classCount, 1);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("scanner records Python literal and non-literal dynamic import evidence", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-imports-python-dynamic-"));

  try {
    writeFile(
      root,
      "bot/main.py",
      [
        "import importlib",
        "module_name = 'market.runtime'",
        "literal = importlib.import_module('market.order_engine')",
        "runtime = importlib.import_module(module_name)",
        "direct = __import__('common.utils')",
        'stdlib = __import__("random")',
        "templated = __import__(f'plugins.{module_name}')",
        "ignored = loader.__import__(module_name)"
      ].join("\n")
    );
    writeFile(root, "src/common/utils.py", "def load(): pass\n");
    writeFile(root, "src/market/order_engine.py", "def open_order(): pass\n");

    const scan = scanSourceFile(path.join(root, "bot/main.py"), {
      resolver: createImportResolver({ root, pythonImportRoots: ["src"] })
    });

    assert.deepEqual(
      scan.imports.map((record) => ({
        line: record.line,
        kind: record.kind,
        specifier: record.specifier,
        resolvedPath: normalize(root, record.resolvedPath)
      })),
      [
        {
          line: 1,
          kind: "import",
          specifier: "importlib",
          resolvedPath: undefined
        },
        {
          line: 3,
          kind: "dynamic_import",
          specifier: "market.order_engine",
          resolvedPath: "src/market/order_engine.py"
        },
        {
          line: 5,
          kind: "dynamic_import",
          specifier: "common.utils",
          resolvedPath: "src/common/utils.py"
        },
        {
          line: 6,
          kind: "dynamic_import",
          specifier: "random",
          resolvedPath: undefined
        }
      ]
    );
    assert.deepEqual(
      scan.dynamicDependencyExpressions.map((record) => ({
        line: record.line,
        kind: record.kind,
        expressionKind: record.expressionKind,
        expressionPreview: record.expressionPreview
      })),
      [
        {
          line: 4,
          kind: "python_import_expression",
          expressionKind: "importlib.import_module",
          expressionPreview: "module_name"
        },
        {
          line: 7,
          kind: "python_import_expression",
          expressionKind: "__import__",
          expressionPreview: "f'plugins.{module_name}'"
        }
      ]
    );
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("scanner reads multiline Python from imports and skips triple-quoted examples", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-imports-python-multiline-"));

  try {
    writeFile(
      root,
      "pkg/main.py",
      [
        '"""',
        "from pkg.fake import nope",
        '"""',
        "from pkg import (",
        "    alpha,",
        "    beta as renamed_beta,",
        ")"
      ].join("\n")
    );
    writeFile(root, "pkg/__init__.py", "");
    writeFile(root, "pkg/alpha.py", "A = 1\n");
    writeFile(root, "pkg/beta.py", "B = 1\n");

    const scan = scanSourceFile(path.join(root, "pkg/main.py"), {
      resolver: createImportResolver({ root })
    });

    assert.deepEqual(
      scan.imports.map((record) => ({
        line: record.line,
        specifier: record.specifier,
        resolvedPath: normalize(root, record.resolvedPath),
        importedBindings: record.importedBindings
      })),
      [
        {
          line: 4,
          specifier: "pkg.alpha",
          resolvedPath: "pkg/alpha.py",
          importedBindings: [{ localName: "alpha", importedName: "alpha" }]
        },
        {
          line: 4,
          specifier: "pkg.beta",
          resolvedPath: "pkg/beta.py",
          importedBindings: [{ localName: "renamed_beta", importedName: "beta" }]
        }
      ]
    );
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("scanner avoids ambiguous Python source-root fallback matches", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-imports-python-ambiguous-"));

  try {
    writeFile(root, "cogs/main.py", "from utils import load\n");
    writeFile(root, "src/common/utils.py", "def load(): pass\n");
    writeFile(root, "src/ui/panel.py", "from utils import draw\n");
    writeFile(root, "src/ui/utils.py", "def draw(): pass\n");

    const resolver = createImportResolver({ root });
    const externalScan = scanSourceFile(path.join(root, "cogs/main.py"), { resolver });
    const uiScan = scanSourceFile(path.join(root, "src/ui/panel.py"), { resolver });

    assert.equal(externalScan.imports[0]?.specifier, "utils");
    assert.equal(externalScan.imports[0]?.resolvedPath, undefined);
    assert.deepEqual(
      uiScan.imports.map((record) => ({
        specifier: record.specifier,
        resolvedPath: normalize(root, record.resolvedPath)
      })),
      [
        {
          specifier: "utils",
          resolvedPath: "src/ui/utils.py"
        }
      ]
    );
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("scanner uses configured Python import roots in declared order", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-imports-python-config-roots-"));

  try {
    writeFile(root, "cogs/main.py", "from utils import load\n");
    writeFile(root, "src/common/utils.py", "def load(): pass\n");
    writeFile(root, "src/ui/utils.py", "def draw(): pass\n");

    const scan = scanSourceFile(path.join(root, "cogs/main.py"), {
      resolver: createImportResolver({
        root,
        pythonImportRoots: ["src/common", "src/ui"]
      })
    });

    assert.deepEqual(
      scan.imports.map((record) => ({
        specifier: record.specifier,
        resolvedPath: normalize(root, record.resolvedPath)
      })),
      [
        {
          specifier: "utils",
          resolvedPath: "src/common/utils.py"
        }
      ]
    );
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("scanner reads imports from TypeScript syntax instead of line regexes", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-imports-ast-"));

  try {
    writeFile(
      root,
      "src/app.ts",
      [
        '// import { ignored } from "./ignored";',
        'const text = "require(\\"./not-real\\")";',
        "import {",
        "  value",
        '} from "./feature";',
        'import type { TypeThing } from "./types";',
        'import "./setup";',
        'export { publicApi } from "./barrel";',
        'export type { TypeThing as OtherThing } from "./types";',
        "const lazy = () => import(",
        "  `./lazy`",
        ");",
        'import legacy = require("./legacy");',
        "const common = require(",
        '  "./common"',
        ");"
      ].join("\n")
    );
    writeFile(root, "src/feature.ts", "export const value = true;\n");
    writeFile(root, "src/types.ts", "export interface TypeThing { ok: boolean }\n");
    writeFile(root, "src/setup.ts", "export const setup = true;\n");
    writeFile(root, "src/barrel/index.ts", "export const publicApi = true;\n");
    writeFile(root, "src/lazy.ts", "export const lazy = true;\n");
    writeFile(root, "src/legacy.ts", "export const legacy = true;\n");
    writeFile(root, "src/common.js", "exports.common = true;\n");

    const imports = scanImports(path.join(root, "src/app.ts"));

    assert.deepEqual(
      imports.map((record) => ({
        line: record.line,
        kind: record.kind,
        specifier: record.specifier,
        resolvedPath: normalize(root, record.resolvedPath)
      })),
      [
        {
          line: 3,
          kind: "import",
          specifier: "./feature",
          resolvedPath: "src/feature.ts"
        },
        {
          line: 6,
          kind: "import",
          specifier: "./types",
          resolvedPath: "src/types.ts"
        },
        {
          line: 7,
          kind: "import",
          specifier: "./setup",
          resolvedPath: "src/setup.ts"
        },
        {
          line: 8,
          kind: "export",
          specifier: "./barrel",
          resolvedPath: "src/barrel/index.ts"
        },
        {
          line: 9,
          kind: "export",
          specifier: "./types",
          resolvedPath: "src/types.ts"
        },
        {
          line: 10,
          kind: "dynamic_import",
          specifier: "./lazy",
          resolvedPath: "src/lazy.ts"
        },
        {
          line: 13,
          kind: "import",
          specifier: "./legacy",
          resolvedPath: "src/legacy.ts"
        },
        {
          line: 14,
          kind: "require",
          specifier: "./common",
          resolvedPath: "src/common.js"
        }
      ]
    );
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("scanner resolves declaration files for type-only imports", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-imports-type-declarations-"));

  try {
    writeFile(
      root,
      "package.json",
      JSON.stringify({
        name: "@demo/app",
        imports: {
          "#types/*": "./types/*.d.ts"
        }
      })
    );
    writeFile(
      root,
      "src/app.ts",
      [
        'import type { Config } from "#types/config";',
        'export type { LocalType } from "./types/local";',
        'import { Runtime } from "./types/runtime";'
      ].join("\n")
    );
    writeFile(root, "types/config.d.ts", "export interface Config {}\n");
    writeFile(root, "src/types/local.d.ts", "export interface LocalType {}\n");
    writeFile(root, "src/types/runtime.d.ts", "export interface Runtime {}\n");

    const imports = scanImports(path.join(root, "src/app.ts"), {
      resolver: createImportResolver({ root })
    });

    assert.deepEqual(
      imports.map((record) => ({
        line: record.line,
        kind: record.kind,
        specifier: record.specifier,
        resolvedPath: normalize(root, record.resolvedPath),
        isTypeOnly: record.isTypeOnly
      })),
      [
        {
          line: 1,
          kind: "import",
          specifier: "#types/config",
          resolvedPath: "types/config.d.ts",
          isTypeOnly: true
        },
        {
          line: 2,
          kind: "export",
          specifier: "./types/local",
          resolvedPath: "src/types/local.d.ts",
          isTypeOnly: true
        },
        {
          line: 3,
          kind: "import",
          specifier: "./types/runtime",
          resolvedPath: undefined,
          isTypeOnly: false
        }
      ]
    );
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("scanner marks broad re-export forms", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-imports-export-kind-"));

  try {
    writeFile(
      root,
      "src/app.ts",
      ['export * from "./feature";', 'export * as featureNamespace from "./feature";'].join("\n")
    );
    writeFile(root, "src/feature.ts", "export const value = true;\n");

    const imports = scanImports(path.join(root, "src/app.ts"));

    assert.deepEqual(
      imports.map((record) => ({
        line: record.line,
        kind: record.kind,
        specifier: record.specifier,
        resolvedPath: normalize(root, record.resolvedPath),
        exportKind: record.exportKind,
        isTypeOnly: record.isTypeOnly
      })),
      [
        {
          line: 1,
          kind: "export",
          specifier: "./feature",
          resolvedPath: "src/feature.ts",
          exportKind: "star",
          isTypeOnly: false
        },
        {
          line: 2,
          kind: "export",
          specifier: "./feature",
          resolvedPath: "src/feature.ts",
          exportKind: "namespace",
          isTypeOnly: false
        }
      ]
    );
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("scanner records imported bindings and local re-export names", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-imports-local-export-"));

  try {
    writeFile(
      root,
      "src/app.ts",
      [
        'import defaultToken, { issueServiceToken as issue, type TokenOptions } from "./internal/token";',
        'export { issue, type TokenOptions as PublicTokenOptions };',
        "export default defaultToken;"
      ].join("\n")
    );
    writeFile(root, "src/internal/token.ts", "export const issueServiceToken = true;\n");

    const scan = scanSourceFile(path.join(root, "src/app.ts"));

    assert.deepEqual(
      scan.imports.map((record) => ({
        line: record.line,
        kind: record.kind,
        specifier: record.specifier,
        resolvedPath: normalize(root, record.resolvedPath),
        importedBindings: record.importedBindings
      })),
      [
        {
          line: 1,
          kind: "import",
          specifier: "./internal/token",
          resolvedPath: "src/internal/token.ts",
          importedBindings: [
            {
              localName: "defaultToken",
              importedName: "default",
              isTypeOnly: false
            },
            {
              localName: "issue",
              importedName: "issueServiceToken",
              isTypeOnly: false
            },
            {
              localName: "TokenOptions",
              importedName: "TokenOptions",
              isTypeOnly: true
            }
          ]
        }
      ]
    );
    assert.deepEqual(scan.localExports, [
      {
        filePath: path.join(root, "src/app.ts"),
        line: 2,
        kind: "named",
        exportedNames: ["issue", "TokenOptions"],
        isTypeOnly: false
      },
      {
        filePath: path.join(root, "src/app.ts"),
        line: 3,
        kind: "default",
        exportedNames: ["defaultToken"]
      }
    ]);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("scanner summarizes declaration-name token clusters for large-file review hints", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-imports-name-clusters-"));

  try {
    writeFile(
      root,
      "src/app.ts",
      [
        "export function renderScene() { return true; }",
        "export function renderSprite() { return true; }",
        "export function renderHud() { return true; }",
        "export function physicsStep() { return true; }",
        "export function physicsBody() { return true; }",
        "export function physicsCollision() { return true; }"
      ].join("\n")
    );

    const scan = scanSourceFile(path.join(root, "src/app.ts"));

    assert.equal(scan.metrics.functionLikeCount, 6);
    assert.deepEqual(scan.metrics.nameTokenClusters, [
      {
        token: "physics",
        count: 3,
        samples: ["physicsStep", "physicsBody", "physicsCollision"]
      },
      {
        token: "render",
        count: 3,
        samples: ["renderScene", "renderSprite", "renderHud"]
      }
    ]);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("scanner reads imports from Vue single-file component script blocks", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-imports-vue-"));

  try {
    writeFile(
      root,
      "src/App.vue",
      [
        "<template>",
        "  <Widget />",
        "</template>",
        "<script setup lang=\"ts\">",
        "import Widget from \"./Widget.vue\";",
        "import { useThing } from \"./composables/useThing\";",
        "const lazy = () => import(\"./LazyPane.vue\");",
        "function renderThing() { return useThing(); }",
        "</script>",
        "<style scoped>",
        ".root { color: red; }",
        "</style>"
      ].join("\n")
    );
    writeFile(root, "src/Widget.vue", "<script setup>\n</script>\n");
    writeFile(root, "src/LazyPane.vue", "<script setup>\n</script>\n");
    writeFile(root, "src/composables/useThing.ts", "export const useThing = () => true;\n");

    const scan = scanSourceFile(path.join(root, "src/App.vue"));

    assert.deepEqual(
      scan.imports.map((record) => ({
        line: record.line,
        kind: record.kind,
        specifier: record.specifier,
        resolvedPath: normalize(root, record.resolvedPath)
      })),
      [
        {
          line: 5,
          kind: "import",
          specifier: "./Widget.vue",
          resolvedPath: "src/Widget.vue"
        },
        {
          line: 6,
          kind: "import",
          specifier: "./composables/useThing",
          resolvedPath: "src/composables/useThing.ts"
        },
        {
          line: 7,
          kind: "dynamic_import",
          specifier: "./LazyPane.vue",
          resolvedPath: "src/LazyPane.vue"
        }
      ]
    );
    assert.equal(scan.metrics.lineCount, 12);
    assert.equal(scan.metrics.functionLikeCount, 2);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("scanner resolves aliases through an injected resolver", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-imports-alias-"));

  try {
    writeFile(
      root,
      "tsconfig.json",
      JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@shared": ["src/shared/index.ts"]
          }
        }
      })
    );
    writeFile(root, "src/app.ts", 'import { shared } from "@shared";\n');
    writeFile(root, "src/shared/index.ts", "export const shared = true;\n");

    const imports = scanImports(path.join(root, "src/app.ts"), {
      resolver: createImportResolver({ root })
    });

    assert.deepEqual(imports.map((record) => normalize(root, record.resolvedPath)), ["src/shared/index.ts"]);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

function writeFile(root: string, relativePath: string, contents: string): void {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function normalize(root: string, filePath: string | undefined): string | undefined {
  return filePath ? path.relative(root, filePath).replace(/\\/g, "/") : undefined;
}
