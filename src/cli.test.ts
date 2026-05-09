import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const cliPath = path.join(repoRoot, "dist/cli.js");

test("cli --json returns parseable success output", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "check", "--root", "fixtures/basic-ts-valid", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, "axiom.check.v1");
  assert.equal(payload.ok, true);
  assert.equal(payload.summary.violations, 0);
  assert.equal(payload.summary.modules, 3);
  assert.equal(payload.violations.length, 0);
  assert.equal(payload.spec, undefined);
});

test("cli --json returns parseable violation output with non-zero exit", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "check", "--root", "fixtures/basic-ts-invalid", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 1);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, "axiom.check.v1");
  assert.equal(payload.ok, false);
  assert.equal(payload.summary.violations, 1);
  assert.equal(payload.violations[0].code, "forbidden_dependency");
  assert.equal(payload.violations[0].details.rule, "Simulation forbids module Rendering");
  assert.deepEqual(payload.violations[0].location, {
    filePath: "src/simulation/step.ts",
    line: 2
  });
});
