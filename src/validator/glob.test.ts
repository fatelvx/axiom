import assert from "node:assert/strict";
import test from "node:test";
import { globToRegExp } from "./glob.js";

test("glob supports **/ matching zero or more directories", () => {
  const regexp = globToRegExp("axiom/**/*.axi");

  assert.equal(regexp.test("axiom/main.axi"), true);
  assert.equal(regexp.test("axiom/nested/main.axi"), true);
  assert.equal(regexp.test("src/main.axi"), false);
});

test("glob supports **/ in file excludes", () => {
  const regexp = globToRegExp("src/**/*.test.ts");

  assert.equal(regexp.test("src/app.test.ts"), true);
  assert.equal(regexp.test("src/features/app.test.ts"), true);
  assert.equal(regexp.test("src/app.ts"), false);
});

test("glob supports simple brace alternatives for extensions", () => {
  const regexp = globToRegExp("src/**/*.{ts,tsx}");

  assert.equal(regexp.test("src/app.ts"), true);
  assert.equal(regexp.test("src/features/view.tsx"), true);
  assert.equal(regexp.test("src/app.js"), false);
  assert.equal(regexp.test("lib/app.ts"), false);
});

test("glob supports simple brace alternatives for path segments", () => {
  const regexp = globToRegExp("src/{app,lib}/**/*.ts");

  assert.equal(regexp.test("src/app/main.ts"), true);
  assert.equal(regexp.test("src/lib/main.ts"), true);
  assert.equal(regexp.test("src/other/main.ts"), false);
});
