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
