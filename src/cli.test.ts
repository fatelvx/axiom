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
  assert.equal(payload.schemaVersion, "axiom.check.v3");
  assert.equal(payload.ok, true);
  assert.equal(payload.summary.violations, 0);
  assert.equal(payload.summary.warnings, 0);
  assert.equal(payload.summary.modules, 3);
  assert.equal(payload.violations.length, 0);
  assert.equal(payload.warnings.length, 0);
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
  assert.equal(payload.schemaVersion, "axiom.check.v3");
  assert.equal(payload.ok, false);
  assert.equal(payload.summary.violations, 1);
  assert.equal(payload.violations[0].code, "forbidden_dependency");
  assert.equal(payload.violations[0].details.rule, "Simulation forbids module Rendering");
  assert.deepEqual(payload.violations[0].location, {
    filePath: "src/simulation/step.ts",
    line: 2
  });
});

test("cli check --warn-unowned reports warnings without failing", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "check", "--root", "fixtures/unowned-source", "--warn-unowned", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.summary.violations, 0);
  assert.equal(payload.summary.warnings, 1);
  assert.equal(payload.warnings[0].code, "unowned_source_file");
  assert.deepEqual(payload.warnings[0].location, {
    filePath: "src/loose/helper.ts",
    line: 1
  });
});

test("cli check --strict reports unowned source files as violations", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "check", "--root", "fixtures/unowned-source", "--strict", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 1);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.summary.violations, 1);
  assert.equal(payload.violations[0].code, "unowned_source_file");
});

test("cli graph returns graph output without acting as a validation gate", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "graph", "--root", "fixtures/visibility-rules"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Axiom graph\./);
  assert.match(result.stdout, /violations: 2/);
  assert.match(result.stdout, /UI -> Services via src\/ui\/view\.ts:1 "\.\.\/services"/);
});

test("cli graph --json returns parseable graph output", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "graph", "--root", "fixtures/visibility-rules", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, "axiom.graph.v4");
  assert.equal(payload.summary.observedDependencies, 3);
  assert.equal(payload.summary.shownObservedDependencies, 3);
  assert.equal(payload.violations[0].code, "unexposed_import");
});

test("cli graph --violations-only filters observed dependency output", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "graph", "--root", "fixtures/visibility-rules", "--violations-only"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Axiom graph \(violations only\)\./);
  assert.match(result.stdout, /observed dependencies: 2 of 3/);
  assert.doesNotMatch(result.stdout, /src\/ui\/view\.ts:1 "\.\.\/services"/);
  assert.match(result.stdout, /src\/ui\/view\.ts:2 "\.\.\/services\/feature"/);
  assert.match(result.stdout, /src\/ui\/view\.ts:3 "\.\.\/services\/internal\/secret"/);
});

test("cli graph --violations-only --json returns filtered graph output", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "graph", "--root", "fixtures/visibility-rules", "--violations-only", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, "axiom.graph.v4");
  assert.deepEqual(payload.filters, { violationsOnly: true });
  assert.equal(payload.summary.observedDependencies, 3);
  assert.equal(payload.summary.shownObservedDependencies, 2);
  assert.deepEqual(
    payload.observedDependencies.map((edge: { violations: Array<{ code: string }> }) => edge.violations[0]?.code),
    ["unexposed_import", "hidden_import"]
  );
});

test("cli infer prints a starter .axi contract", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "infer", "--root", "fixtures/basic-ts-valid"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Generated by axi infer/);
  assert.match(result.stdout, /module Simulation/);
  assert.match(result.stdout, /depends on Physics/);
});

test("cli infer --json returns parseable inferred output", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "infer", "--root", "fixtures/basic-ts-valid", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, "axiom.infer.v2");
  assert.equal(payload.summary.modules, 3);
  assert.match(payload.axi, /module Physics/);
});

test("cli infer supports group depth", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "infer", "--root", "fixtures/infer-group-depth", "--group-depth", "2", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.deepEqual(
    payload.modules.map((module: { name: string }) => module.name),
    ["ServicesAgent", "ServicesTools", "Ui"]
  );
});

test("cli infer supports workspace grouping", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "infer", "--root", "fixtures/package-exports", "--group-by", "workspace", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.deepEqual(
    payload.modules.map((module: { name: string }) => module.name),
    ["Shared", "Web"]
  );
  assert.deepEqual(payload.modules.find((module: { name: string }) => module.name === "Web")?.depends, ["Shared"]);
});

test("cli check uses project config discovery settings", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "check", "--root", "fixtures/config-filter", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.summary.specFiles, 1);
  assert.equal(payload.summary.sourceFiles, 1);
  assert.deepEqual(payload.specFiles, ["architecture/main.axi"]);
  assert.deepEqual(payload.sourceFiles, ["src/app.ts"]);
});
