import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
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
  assert.match(output, /fix: Remove the import, move the shared code to an allowed module/);
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

test("human diagnostics tell no-spec projects how to start", () => {
  const fixtureRoot = path.join(repoRoot, "fixtures/infer-cycle");
  const result = runCheck({ root: fixtureRoot });
  const output = formatCheckResult(result);

  assert.match(output, /error no_spec_files/);
  assert.match(output, /No \.axi files found/);
  assert.match(output, /scan: \d+ source files, \d+ imports scanned/);
  assert.match(output, /top largest files:/);
  assert.match(output, /inferred module candidates:/);
  assert.match(output, /quiet import graph can still hide intra-file responsibility concentration/);
  assert.match(output, /fix: Run `axi infer --root \. > axiom\/main\.axi` from the project root/);
  assert.match(output, /--spec <path-to-contract\.axi>/);
});

test("human no-spec diagnostics flag likely generated or runtime scan scope", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axiom-format-scope-"));

  try {
    fs.mkdirSync(path.join(root, ".agent-runtime/profile"), { recursive: true });
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.writeFileSync(path.join(root, ".agent-runtime/profile/runtime_background.js"), "export const runtimeState = 1;\n");
    fs.writeFileSync(path.join(root, "src/app.ts"), "export const app = 1;\n");

    const output = formatCheckResult(runCheck({ root }));

    assert.match(output, /scope guidance:/);
    assert.match(output, /hidden, generated, runtime, profile, smoke, or benchmark-looking folders/);
    assert.match(output, /matched folders: \.agent-runtime/);
    assert.match(output, /examples: \.agent-runtime\/profile\/runtime_background\.js/);
    assert.match(output, /try: `axi check --root \. --include "src\/\*\*"`/);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
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

test("human diagnostics include hidden re-export details", () => {
  const fixtureRoot = path.join(repoRoot, "fixtures/hidden-reexport");
  const result = runCheck({ root: fixtureRoot });
  const output = formatCheckResult(result);

  assert.match(output, /error hidden_reexport src\/services\/index\.ts:1/);
  assert.match(output, /Services re-exports a hidden path through an exposed file\./);
  assert.match(output, /observed: Services exposes hidden path via "\.\/internal\/token"/);
  assert.match(output, /rule: Services hides src\/services\/internal\/\*\* \(axiom\/main\.axi:4\)/);
  assert.match(output, /fix: Remove this re-export from the exposed surface/);
});

test("human diagnostics report intentional violations prominently", () => {
  const fixtureRoot = path.join(repoRoot, "fixtures/suppressed-dependency");
  const result = runCheck({ root: fixtureRoot });
  const output = formatCheckResult(result);

  assert.match(output, /Axiom check passed with intentional violations\./);
  assert.match(output, /intentional violations: 1/);
  assert.match(output, /intentional violations \(accepted by contract\):/);
  assert.match(output, /intentional violation forbidden_dependency src\/simulation\/step\.ts:1/);
  assert.match(
    output,
    /contract: Simulation intentionally accepts forbidden_dependency to Rendering until 2099-01-01 \(axiom\/main\.axi:7\)/
  );
  assert.match(output, /reason: legacy renderer migration/);
});

test("human diagnostics report expiring intentional violations as warnings", () => {
  const fixtureRoot = path.join(repoRoot, "fixtures/suppressed-dependency");
  const result = runCheck({ root: fixtureRoot, today: "2098-12-15" });
  const output = formatCheckResult(result);

  assert.match(output, /Axiom check passed with intentional violations and advisory warnings\./);
  assert.match(output, /advisory warnings: 1/);
  assert.match(output, /advisory notes:/);
  assert.match(output, /advisory warnings are review pressure, not a cleanup checklist or failure state/);
  assert.match(output, /do not refactor solely to reach zero warnings/);
  assert.match(output, /warning expiring_suppression axiom\/main\.axi:7/);
  assert.match(output, /Simulation has an intentional violation to Rendering that expires in 17 days\./);
  assert.match(output, /rule: Simulation accepts forbidden_dependency to Rendering until 2099-01-01/);
  assert.match(output, /fix: Review this intentional violation before it expires/);
});

test("human diagnostics report unused suppressions as warnings", () => {
  const fixtureRoot = path.join(repoRoot, "fixtures/unused-suppression");
  const result = runCheck({ root: fixtureRoot });
  const output = formatCheckResult(result);

  assert.match(output, /Axiom check passed with advisory warnings\./);
  assert.match(output, /warning unused_suppression axiom\/main\.axi:7/);
  assert.match(output, /Simulation has an unused intentional violation for Rendering\./);
  assert.match(output, /rule: Simulation accepts forbidden_dependency to Rendering until 2099-01-01/);
  assert.match(output, /fix: Remove the intentional violation if the architecture debt is gone/);
});
