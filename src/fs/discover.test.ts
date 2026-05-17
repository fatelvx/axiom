import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { findAxiomFiles, findSourceFiles } from "./discover.js";

test("source discovery skips dependency, build, and cache directories by default", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-discover-"));

  try {
    writeFile(root, "src/app.ts", "export const app = true;\n");
    writeFile(root, "axiom/main.axi", "module App\npath \"src/**\"\n");

    for (const directory of [
      ".cache",
      ".benchmark_tmp",
      ".git",
      ".mypy_cache",
      ".next",
      ".nuxt",
      ".pytest_cache",
      ".ruff_cache",
      ".svelte-kit",
      ".turbo",
      ".vite",
      ".venv",
      "__pycache__",
      "build",
      "coverage",
      "dist",
      "node_modules",
      "out",
      "target",
      "temp",
      "tmp",
      "venv"
    ]) {
      writeFile(root, `${directory}/ignored.ts`, "export const ignored = true;\n");
      writeFile(root, `${directory}/ignored.py`, "ignored = True\n");
      writeFile(root, `${directory}/ignored.axi`, "module Ignored\npath \"ignored/**\"\n");
    }

    assert.deepEqual(findSourceFiles(root).map((filePath) => normalize(root, filePath)), ["src/app.ts"]);
    assert.deepEqual(findAxiomFiles(root).map((filePath) => normalize(root, filePath)), ["axiom/main.axi"]);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("project-specific generated folders are controlled by exclude config", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-discover-generated-"));

  try {
    writeFile(root, "src/app.ts", "export const app = true;\n");
    writeFile(root, "project-artifacts/output.ts", "export const generated = true;\n");

    assert.deepEqual(findSourceFiles(root).map((filePath) => normalize(root, filePath)), [
      "project-artifacts/output.ts",
      "src/app.ts"
    ]);
    assert.deepEqual(findSourceFiles(root, { exclude: ["project-artifacts/**"] }).map((filePath) => normalize(root, filePath)), [
      "src/app.ts"
    ]);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("source discovery includes Vue single-file components", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-discover-vue-"));

  try {
    writeFile(root, "src/App.vue", "<script setup>\nimport './feature.js';\n</script>\n");
    writeFile(root, "src/feature.js", "export const feature = true;\n");
    writeFile(root, "src/types.d.ts", "export interface Types {}\n");

    assert.deepEqual(findSourceFiles(root).map((filePath) => normalize(root, filePath)), [
      "src/App.vue",
      "src/feature.js"
    ]);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("source discovery includes Python modules but not type stubs", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-discover-python-"));

  try {
    writeFile(root, "src/app.py", "from .feature import run\n");
    writeFile(root, "src/feature.py", "def run(): pass\n");
    writeFile(root, "src/types.pyi", "class Types: ...\n");

    assert.deepEqual(findSourceFiles(root).map((filePath) => normalize(root, filePath)), [
      "src/app.py",
      "src/feature.py"
    ]);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("source and spec discovery respect include, exclude, and specs config", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-discover-config-"));

  try {
    writeFile(root, "src/app.ts", "export const app = true;\n");
    writeFile(root, "src/app.test.ts", "export const test = true;\n");
    writeFile(root, "other/side.ts", "export const side = true;\n");
    writeFile(root, "architecture/main.axi", "module App\npath \"src/**\"\n");
    writeFile(root, "axiom/default.axi", "module Default\npath \"other/**\"\n");

    const options = {
      include: ["src/**"],
      exclude: ["src/**/*.test.ts"],
      specs: ["architecture/**/*.axi"]
    };

    assert.deepEqual(findSourceFiles(root, options).map((filePath) => normalize(root, filePath)), ["src/app.ts"]);
    assert.deepEqual(findAxiomFiles(root, options).map((filePath) => normalize(root, filePath)), ["architecture/main.axi"]);
    assert.deepEqual(findAxiomFiles(root, { ...options, exclude: ["architecture/**"] }).map((filePath) => normalize(root, filePath)), [
      "architecture/main.axi"
    ]);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("default spec discovery includes common monorepo package contract locations", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-discover-monorepo-specs-"));

  try {
    writeFile(root, "axiom/main.axi", "module Root\npath \"src/**\"\n");
    writeFile(root, "apps/web/axiom/main.axi", "module Web\npath \"apps/web/src/**\"\n");
    writeFile(root, "apps/admin/.axi", "module Admin\npath \"apps/admin/src/**\"\n");
    writeFile(root, "packages/shared/axiom/main.axi", "module Shared\npath \"packages/shared/src/**\"\n");
    writeFile(root, "packages/core/.axi", "module Core\npath \"packages/core/src/**\"\n");
    writeFile(root, "examples/demo/axiom/main.axi", "module Demo\npath \"examples/demo/src/**\"\n");

    assert.deepEqual(findAxiomFiles(root).map((filePath) => normalize(root, filePath)), [
      "apps/admin/.axi",
      "apps/web/axiom/main.axi",
      "axiom/main.axi",
      "packages/core/.axi",
      "packages/shared/axiom/main.axi"
    ]);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("source discovery keeps include pruning conservative for wildcard directories", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-discover-include-"));

  try {
    writeFile(root, "src/app.ts", "export const app = true;\n");
    writeFile(root, "packages/core/src/index.ts", "export const core = true;\n");
    writeFile(root, "packages/core/test/helper.ts", "export const helper = true;\n");
    writeFile(root, "other/side.ts", "export const side = true;\n");

    assert.deepEqual(findSourceFiles(root, { include: ["src/**", "packages/*/src/**"] }).map((filePath) => normalize(root, filePath)), [
      "packages/core/src/index.ts",
      "src/app.ts"
    ]);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

function writeFile(root: string, relativePath: string, contents: string): void {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function normalize(root: string, filePath: string): string {
  return path.relative(root, filePath).replace(/\\/g, "/");
}
