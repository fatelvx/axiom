import assert from "node:assert/strict";
import test from "node:test";
import { buildInferVisibilitySuggestions, isHiddenDirectoryName } from "./inferVisibility.js";

test("visibility suggestions expose public index files and hide private folders", () => {
  const suggestions = buildInferVisibilitySuggestions([
    "src/services/index.ts",
    "src/services/internal/secret.ts",
    "src/services/private/index.ts",
    "src/ui/index.tsx",
    "src/ui/view.ts"
  ]);

  assert.deepEqual(suggestions.suggestedExposes, ["src/services/index.ts", "src/ui/index.tsx"]);
  assert.deepEqual(suggestions.suggestedHides, ["src/services/internal/**", "src/services/private/**"]);
});

test("visibility suggestions dedupe and sort stable path patterns", () => {
  const suggestions = buildInferVisibilitySuggestions([
    "src/z/index.ts",
    "src/a/internal/one.ts",
    "src/a/internal/two.ts",
    "src/a/index.ts",
    "src/z/index.ts"
  ]);

  assert.deepEqual(suggestions.suggestedExposes, ["src/a/index.ts", "src/z/index.ts"]);
  assert.deepEqual(suggestions.suggestedHides, ["src/a/internal/**"]);
});

test("visibility suggestions normalize windows-style paths", () => {
  const suggestions = buildInferVisibilitySuggestions([
    "src\\services\\index.ts",
    "src\\services\\internal\\secret.ts"
  ]);

  assert.deepEqual(suggestions.suggestedExposes, ["src/services/index.ts"]);
  assert.deepEqual(suggestions.suggestedHides, ["src/services/internal/**"]);
});

test("hidden directory names are case-insensitive", () => {
  assert.equal(isHiddenDirectoryName("internal"), true);
  assert.equal(isHiddenDirectoryName("Private"), true);
  assert.equal(isHiddenDirectoryName("implementation"), false);
});
