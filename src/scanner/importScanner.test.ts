import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createImportResolver } from "./importResolver.js";
import { scanImports } from "./importScanner.js";

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
