import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createImportResolver } from "./importResolver.js";

test("resolver resolves tsconfig path aliases and exact aliases", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-resolver-"));

  try {
    writeFile(
      root,
      "tsconfig.json",
      `{
        // JSONC is accepted because tsconfig commonly contains comments.
        "compilerOptions": {
          /* block comments are also accepted */
          "baseUrl": ".",
          "paths": {
            "@shared": ["src/shared/index.ts"],
            "@shared/*": ["src/shared/*"],
            "@pkg/*": ["packages/*/src/index.ts"],
          },
        },
      }`
    );
    writeFile(root, "src/app/main.ts", "export const app = true;\n");
    writeFile(root, "src/app/local.ts", "export const local = true;\n");
    writeFile(root, "src/shared/index.ts", "export const shared = true;\n");
    writeFile(root, "src/shared/helper.ts", "export const helper = true;\n");
    writeFile(root, "packages/core/src/index.ts", "export const core = true;\n");

    const resolver = createImportResolver({ root });
    const fromFile = path.join(root, "src/app/main.ts");

    assert.equal(normalize(root, resolver.resolve(fromFile, "./local")), "src/app/local.ts");
    assert.equal(normalize(root, resolver.resolve(fromFile, "@shared")), "src/shared/index.ts");
    assert.equal(normalize(root, resolver.resolve(fromFile, "@shared/helper")), "src/shared/helper.ts");
    assert.equal(normalize(root, resolver.resolve(fromFile, "@pkg/core")), "packages/core/src/index.ts");
    assert.equal(resolver.resolve(fromFile, "react"), undefined);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("resolver supports a configured tsconfig path", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-resolver-config-"));

  try {
    writeFile(
      root,
      "tsconfig.app.json",
      JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          paths: {
            "@domain/*": ["src/domain/*"]
          }
        }
      })
    );
    writeFile(root, "src/app/main.ts", "export const app = true;\n");
    writeFile(root, "src/domain/model.ts", "export const model = true;\n");

    const resolver = createImportResolver({ root, tsconfigPath: "tsconfig.app.json" });
    const fromFile = path.join(root, "src/app/main.ts");

    assert.equal(normalize(root, resolver.resolve(fromFile, "@domain/model")), "src/domain/model.ts");
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("resolver maps JavaScript ESM specifiers back to TypeScript source files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-resolver-esm-"));

  try {
    writeFile(root, "src/app/main.ts", "export const app = true;\n");
    writeFile(root, "src/app/local.ts", "export const local = true;\n");
    writeFile(root, "src/app/view.tsx", "export const view = true;\n");
    writeFile(root, "src/app/module.mts", "export const module = true;\n");
    writeFile(root, "src/app/common.cts", "export const common = true;\n");

    const resolver = createImportResolver({ root });
    const fromFile = path.join(root, "src/app/main.ts");

    assert.equal(normalize(root, resolver.resolve(fromFile, "./local.js")), "src/app/local.ts");
    assert.equal(normalize(root, resolver.resolve(fromFile, "./view.js")), "src/app/view.tsx");
    assert.equal(normalize(root, resolver.resolve(fromFile, "./module.mjs")), "src/app/module.mts");
    assert.equal(normalize(root, resolver.resolve(fromFile, "./common.cjs")), "src/app/common.cts");
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
