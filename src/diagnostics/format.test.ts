import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { formatCheckResult } from "./format.js";
import { runCheck } from "../validator/check.js";

const repoRoot = process.cwd();

test("human diagnostics include forbidden rule details", () => {
  const fixtureRoot = path.join(repoRoot, "fixtures/basic-ts-invalid");
  const result = runCheck({ root: fixtureRoot });
  const output = formatCheckResult(result);

  assert.match(output, /observed: Simulation -> Rendering via "\.\.\/rendering\/draw"/);
  assert.match(output, /rule: Simulation forbids module Rendering \(axiom\/main\.axi:13\)/);
});

test("human diagnostics include undeclared dependency fix", () => {
  const fixtureRoot = path.join(repoRoot, "fixtures/basic-ts-undeclared");
  const result = runCheck({ root: fixtureRoot });
  const output = formatCheckResult(result);

  assert.match(output, /observed: Simulation -> Physics via "\.\.\/physics\/math"/);
  assert.match(output, /fix: Add 'depends Physics' under module Simulation, or remove the import\./);
});

test("human diagnostics include spec validation fixes", () => {
  const fixtureRoot = path.join(repoRoot, "fixtures/missing-path");
  const result = runCheck({ root: fixtureRoot });
  const output = formatCheckResult(result);

  assert.match(output, /error missing_module_path axiom\/main\.axi:1/);
  assert.match(output, /fix: Add at least one path declaration under module Simulation\./);
});

test("human diagnostics include layer breach rule details", () => {
  const fixtureRoot = path.join(repoRoot, "fixtures/layer-breach");
  const result = runCheck({ root: fixtureRoot });
  const output = formatCheckResult(result);

  assert.match(output, /error layer_breach src\/simulation\/step\.ts:1/);
  assert.match(output, /observed: Simulation -> Rendering via "\.\.\/rendering\/draw"/);
  assert.match(output, /rule: layers Core -> UI \(axiom\/main\.axi:1\)/);
});

test("human diagnostics include ambiguous owner details", () => {
  const fixtureRoot = path.join(repoRoot, "fixtures/ambiguous-owner");
  const result = runCheck({ root: fixtureRoot });
  const output = formatCheckResult(result);

  assert.match(output, /error ambiguous_module_owner src\/simulation\/step\.ts:1/);
  assert.match(output, /owners: App, Simulation/);
  assert.match(output, /fix: Make module path declarations non-overlapping/);
});

test("human diagnostics include visibility rule details", () => {
  const fixtureRoot = path.join(repoRoot, "fixtures/visibility-rules");
  const result = runCheck({ root: fixtureRoot });
  const output = formatCheckResult(result);

  assert.match(output, /error unexposed_import src\/ui\/view\.ts:2/);
  assert.match(output, /rule: Services exposes src\/services\/index\.ts \(axiom\/main\.axi:7\)/);
  assert.match(output, /error hidden_import src\/ui\/view\.ts:3/);
  assert.match(output, /rule: Services hides src\/services\/internal\/\*\* \(axiom\/main\.axi:8\)/);
});
