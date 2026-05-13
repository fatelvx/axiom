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

test("resolver supports package imports from package.json", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-resolver-imports-"));

  try {
    writeFile(
      root,
      "package.json",
      JSON.stringify({
        name: "@demo/app",
        imports: {
          "#runtime/*": "./src/runtime/*.ts",
          "#config": {
            import: "./src/config.js",
            types: "./src/config.d.ts"
          }
        }
      })
    );
    writeFile(root, "src/app/main.ts", "export const app = true;\n");
    writeFile(root, "src/runtime/clock.ts", "export const clock = true;\n");
    writeFile(root, "src/config.ts", "export const config = true;\n");
    writeFile(root, "src/config.d.ts", "export interface Config {}\n");

    const resolver = createImportResolver({ root });
    const fromFile = path.join(root, "src/app/main.ts");

    assert.equal(normalize(root, resolver.resolve(fromFile, "#runtime/clock")), "src/runtime/clock.ts");
    assert.equal(normalize(root, resolver.resolve(fromFile, "#config")), "src/config.ts");
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("resolver resolves declaration files only when explicitly allowed", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-resolver-declarations-"));

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
    writeFile(root, "src/app/main.ts", "export const app = true;\n");
    writeFile(root, "src/types/local.d.ts", "export interface LocalType {}\n");
    writeFile(root, "types/config.d.ts", "export interface Config {}\n");

    const resolver = createImportResolver({ root });
    const fromFile = path.join(root, "src/app/main.ts");

    assert.equal(resolver.resolve(fromFile, "#types/config"), undefined);
    assert.equal(resolver.resolve(fromFile, "../types/local"), undefined);
    assert.equal(
      normalize(root, resolver.resolve(fromFile, "#types/config", { allowDeclarationFiles: true })),
      "types/config.d.ts"
    );
    assert.equal(
      normalize(root, resolver.resolve(fromFile, "../types/local", { allowDeclarationFiles: true })),
      "src/types/local.d.ts"
    );
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("resolver supports package exports and workspace package subpaths", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-resolver-workspace-"));

  try {
    writeFile(
      root,
      "package.json",
      JSON.stringify({
        name: "@demo/root",
        exports: {
          ".": "./src/index.ts",
          "./feature": {
            import: "./src/feature.js",
            types: "./src/feature.d.ts"
          }
        },
        workspaces: ["packages/*"]
      })
    );
    writeFile(
      root,
      "packages/shared/package.json",
      JSON.stringify({
        name: "@demo/shared",
        exports: {
          ".": "./src/index.ts",
          "./tools/*": "./src/tools/*.js"
        }
      })
    );
    writeFile(root, "src/app/main.ts", "export const app = true;\n");
    writeFile(root, "src/index.ts", "export const root = true;\n");
    writeFile(root, "src/feature.ts", "export const feature = true;\n");
    writeFile(root, "src/feature.d.ts", "export interface Feature {}\n");
    writeFile(root, "packages/shared/src/index.ts", "export const shared = true;\n");
    writeFile(root, "packages/shared/src/tools/button.ts", "export const button = true;\n");

    const resolver = createImportResolver({ root });
    const fromFile = path.join(root, "src/app/main.ts");

    assert.equal(normalize(root, resolver.resolve(fromFile, "@demo/root")), "src/index.ts");
    assert.equal(normalize(root, resolver.resolve(fromFile, "@demo/root/feature")), "src/feature.ts");
    assert.equal(normalize(root, resolver.resolve(fromFile, "@demo/shared")), "packages/shared/src/index.ts");
    assert.equal(normalize(root, resolver.resolve(fromFile, "@demo/shared/tools/button")), "packages/shared/src/tools/button.ts");
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("resolver maps workspace package build exports back to source files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-resolver-workspace-source-mirror-"));

  try {
    writeFile(
      root,
      "package.json",
      JSON.stringify({
        name: "@demo/root",
        workspaces: ["packages/*"]
      })
    );
    writeFile(
      root,
      "packages/shared/package.json",
      JSON.stringify({
        name: "@demo/shared",
        main: "lib/index.js",
        exports: {
          ".": "./lib/index.js",
          "./tools/*": "./dist/tools/*.mjs"
        }
      })
    );
    writeFile(root, "apps/web/src/main.ts", "export const app = true;\n");
    writeFile(root, "packages/shared/src/index.ts", "export const shared = true;\n");
    writeFile(root, "packages/shared/src/tools/button.mts", "export const button = true;\n");

    const resolver = createImportResolver({ root });
    const fromFile = path.join(root, "apps/web/src/main.ts");

    assert.equal(normalize(root, resolver.resolve(fromFile, "@demo/shared")), "packages/shared/src/index.ts");
    assert.equal(normalize(root, resolver.resolve(fromFile, "@demo/shared/tools/button")), "packages/shared/src/tools/button.mts");
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("resolver uses package main when workspace package exports are absent", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-resolver-workspace-main-"));

  try {
    writeFile(
      root,
      "package.json",
      JSON.stringify({
        name: "@demo/root",
        workspaces: ["packages/*"]
      })
    );
    writeFile(
      root,
      "packages/shared/package.json",
      JSON.stringify({
        name: "@demo/shared",
        main: "lib/index.js"
      })
    );
    writeFile(root, "apps/web/src/main.ts", "export const app = true;\n");
    writeFile(root, "packages/shared/src/index.ts", "export const shared = true;\n");

    const resolver = createImportResolver({ root });
    const fromFile = path.join(root, "apps/web/src/main.ts");

    assert.equal(normalize(root, resolver.resolve(fromFile, "@demo/shared")), "packages/shared/src/index.ts");
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("resolver discovers workspace packages from pnpm-workspace.yaml", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-resolver-pnpm-workspace-"));

  try {
    writeFile(
      root,
      "package.json",
      JSON.stringify({
        name: "@demo/root",
        private: true
      })
    );
    writeFile(
      root,
      "pnpm-workspace.yaml",
      `packages:
  - "apps/*"
  - 'packages/*'
  - "!packages/ignored"
`
    );
    writeFile(
      root,
      "packages/shared/package.json",
      JSON.stringify({
        name: "@demo/shared",
        exports: {
          ".": "./src/index.ts"
        }
      })
    );
    writeFile(root, "apps/web/src/main.ts", "export const app = true;\n");
    writeFile(root, "packages/shared/src/index.ts", "export const shared = true;\n");

    const resolver = createImportResolver({ root });
    const fromFile = path.join(root, "apps/web/src/main.ts");

    assert.equal(normalize(root, resolver.resolve(fromFile, "@demo/shared")), "packages/shared/src/index.ts");
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("resolver discovers inline pnpm workspace package patterns", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-resolver-pnpm-inline-workspace-"));

  try {
    writeFile(
      root,
      "package.json",
      JSON.stringify({
        name: "@demo/root",
        private: true
      })
    );
    writeFile(
      root,
      "pnpm-workspace.yaml",
      `packages: ["apps/*", 'packages/*', "!packages/ignored"] # compact YAML sequence
`
    );
    writeFile(
      root,
      "packages/shared/package.json",
      JSON.stringify({
        name: "@demo/shared",
        exports: {
          ".": "./src/index.ts"
        }
      })
    );
    writeFile(root, "apps/web/src/main.ts", "export const app = true;\n");
    writeFile(root, "packages/shared/src/index.ts", "export const shared = true;\n");

    const resolver = createImportResolver({ root });
    const fromFile = path.join(root, "apps/web/src/main.ts");

    assert.equal(normalize(root, resolver.resolve(fromFile, "@demo/shared")), "packages/shared/src/index.ts");
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
