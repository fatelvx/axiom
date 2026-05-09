import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { runCheck } from "./check.js";

const repoRoot = process.cwd();

test("valid fixture passes", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/basic-ts-valid") });

  assert.deepEqual(result.violations, []);
  assert.equal(result.spec.modules.length, 3);
  assert.equal(result.observedDependencies.length, 1);
});

test("invalid fixture reports forbidden dependency", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/basic-ts-invalid") });
  const codes = result.violations.map((violation) => violation.code);

  assert.ok(codes.includes("forbidden_dependency"));
});

test("undeclared fixture reports undeclared dependency", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/basic-ts-undeclared") });
  const codes = result.violations.map((violation) => violation.code);

  assert.ok(codes.includes("undeclared_dependency"));
});

test("cycle fixture reports declared dependency cycle", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/cycle") });
  const codes = result.violations.map((violation) => violation.code);

  assert.ok(codes.includes("cycle_dependency"));
});

test("unknown module fixture reports unknown module references", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/unknown-module") });
  const codes = result.violations.map((violation) => violation.code);

  assert.ok(codes.includes("unknown_module"));
});

test("duplicate module fixture reports duplicate module declarations", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/duplicate-module") });
  const codes = result.violations.map((violation) => violation.code);

  assert.ok(codes.includes("duplicate_module"));
});

test("missing path fixture reports missing module path", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/missing-path") });
  const codes = result.violations.map((violation) => violation.code);

  assert.ok(codes.includes("missing_module_path"));
});

test("layer valid fixture permits dependencies toward inner layers", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/layer-valid") });

  assert.deepEqual(result.violations, []);
});

test("layer breach fixture reports outward dependency", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/layer-breach") });
  const codes = result.violations.map((violation) => violation.code);

  assert.ok(codes.includes("layer_breach"));
});

test("unknown layer fixture reports unknown layer", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/unknown-layer") });
  const codes = result.violations.map((violation) => violation.code);

  assert.ok(codes.includes("unknown_layer"));
});

test("ambiguous owner fixture reports ambiguous module owner", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/ambiguous-owner") });
  const codes = result.violations.map((violation) => violation.code);

  assert.ok(codes.includes("ambiguous_module_owner"));
});

test("visibility fixture reports hidden and unexposed imports", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/visibility-rules") });
  const codes = result.violations.map((violation) => violation.code);

  assert.deepEqual(codes, ["unexposed_import", "hidden_import"]);
});
