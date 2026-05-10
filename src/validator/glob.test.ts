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
