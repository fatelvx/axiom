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
  assert.equal(payload.violations.length, 0);
  assert.equal(payload.spec.modules.length, 3);
});

test("cli --json returns parseable violation output with non-zero exit", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "check", "--root", "fixtures/basic-ts-invalid", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 1);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.violations[0].code, "forbidden_dependency");
  assert.equal(payload.violations[0].details.rule, "Simulation forbids module Rendering");
});
