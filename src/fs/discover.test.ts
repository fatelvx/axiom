import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { findAxiomFiles, findSourceFiles } from "./discover.js";

test("source discovery skips generated and runtime directories by default", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-discover-"));

  try {
    writeFile(root, "src/app.ts", "export const app = true;\n");
    writeFile(root, "axiom/main.axi", "module App\npath \"src/**\"\n");

    for (const directory of [
      ".benchmark_tmp",
      ".cache",
      ".git",
      ".lumina",
      ".next",
      ".nuxt",
      ".svelte-kit",
      ".turbo",
      ".vite",
      "build",
      "coverage",
      "dist",
      "generated-projects",
      "node_modules",
      "out",
      "src-tauri",
      "target",
      "temp",
      "tmp"
    ]) {
      writeFile(root, `${directory}/ignored.ts`, "export const ignored = true;\n");
      writeFile(root, `${directory}/ignored.axi`, "module Ignored\npath \"ignored/**\"\n");
    }

    assert.deepEqual(findSourceFiles(root).map((filePath) => normalize(root, filePath)), ["src/app.ts"]);
    assert.deepEqual(findAxiomFiles(root).map((filePath) => normalize(root, filePath)), ["axiom/main.axi"]);
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

function writeFile(root: string, relativePath: string, contents: string): void {
  const filePath = path.join(root, relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents);
}

function normalize(root: string, filePath: string): string {
  return path.relative(root, filePath).replace(/\\/g, "/");
}
