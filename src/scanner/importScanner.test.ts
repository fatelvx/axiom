import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
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
        specifier: record.specifier,
        resolvedPath: normalize(root, record.resolvedPath)
      })),
      [
        {
          line: 1,
          specifier: "./feature",
          resolvedPath: "src/feature.ts"
        },
        {
          line: 2,
          specifier: "./barrel",
          resolvedPath: "src/barrel/index.ts"
        },
        {
          line: 3,
          specifier: "./lazy",
          resolvedPath: "src/lazy.ts"
        },
        {
          line: 4,
          specifier: "./legacy",
          resolvedPath: "src/legacy.js"
        }
      ]
    );
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
