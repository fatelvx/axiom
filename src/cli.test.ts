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
  assert.equal(payload.schemaVersion, "axiom.check.v4");
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
  assert.equal(payload.schemaVersion, "axiom.check.v4");
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

test("cli check --warn-public-api-surface reports advisory broad surface warnings", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "check", "--root", "fixtures/public-api-surface", "--warn-public-api-surface", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.summary.violations, 0);
  assert.equal(payload.summary.warnings, 1);
  assert.equal(payload.warnings[0].code, "broad_public_surface");
  assert.equal(payload.warnings[0].details.exportKind, "star");
});

test("cli observe --warn-coupling-concentration reports advisory coupling warnings", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "observe", "--root", "fixtures/coupling-concentration", "--warn-coupling-concentration", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, "axiom.graph.v9");
  assert.deepEqual(payload.filters, { violationsOnly: true, attention: true });
  assert.equal(payload.summary.violations, 0);
  assert.equal(payload.summary.warnings, 1);
  assert.equal(payload.warnings[0].code, "coupling_concentration");
  assert.equal(payload.warnings[0].details.module, "Hub");
  assert.equal(payload.warnings[0].details.fanInModules, 4);
  assert.deepEqual(payload.warnings[0].details.incomingModules, ["FeatureA", "FeatureB", "FeatureC", "FeatureD"]);
});

test("cli observe --warn-deep-internal-imports reports advisory deep import warnings", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "observe", "--root", "fixtures/deep-internal-import", "--warn-deep-internal-imports", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, "axiom.graph.v9");
  assert.equal(payload.summary.violations, 0);
  assert.equal(payload.summary.warnings, 1);
  assert.equal(payload.warnings[0].code, "deep_internal_import");
  assert.equal(payload.warnings[0].details.importedPath, "src/lib/internal/secret.ts");
  assert.deepEqual(payload.warnings[0].details.publicEntrypoints, ["src/lib/index.ts"]);
});

test("cli observe --warn-unresolved-imports reports advisory unresolved import warnings", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "observe", "--root", "fixtures/unresolved-import", "--warn-unresolved-imports", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, "axiom.graph.v9");
  assert.equal(payload.summary.violations, 0);
  assert.equal(payload.summary.warnings, 1);
  assert.equal(payload.warnings[0].code, "unresolved_import");
  assert.equal(payload.warnings[0].details.specifier, "./generated/runtime-token");
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
  assert.equal(payload.schemaVersion, "axiom.graph.v9");
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

test("cli graph --attention aliases the focused architecture attention view", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "graph", "--root", "fixtures/visibility-rules", "--attention"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Axiom graph \(attention\)\./);
  assert.match(result.stdout, /observed dependencies: 2 of 3/);
  assert.doesNotMatch(result.stdout, /src\/ui\/view\.ts:1 "\.\.\/services"/);
});

test("cli graph --mermaid returns a visual observed dependency graph", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "graph", "--root", "fixtures/basic-ts-invalid", "--mermaid"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /%% Generated by axi graph --mermaid\./);
  assert.match(result.stdout, /flowchart TB/);
  assert.match(result.stdout, /module_Simulation -->\|1 import; forbidden_dependency\| module_Rendering/);
});

test("cli observe --mermaid keeps the attention filter", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "observe", "--root", "fixtures/visibility-rules", "--mermaid"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /%% Generated by axi observe --mermaid\./);
  assert.match(result.stdout, /observedDependencies=2 of 3/);
  assert.match(result.stdout, /module_UI -->\|2 imports; hidden_import, unexposed_import\| module_Services/);
});

test("cli observe shows the architecture attention surface", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "observe", "--root", "fixtures/visibility-rules"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Axiom observe\./);
  assert.match(result.stdout, /observed dependencies: 2 of 3/);
  assert.match(result.stdout, /violating dependencies:/);
  assert.doesNotMatch(result.stdout, /src\/ui\/view\.ts:1 "\.\.\/services"/);
});

test("cli graph --violations-only --json returns filtered graph output", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "graph", "--root", "fixtures/visibility-rules", "--violations-only", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, "axiom.graph.v9");
  assert.deepEqual(payload.filters, { violationsOnly: true, attention: false });
  assert.equal(payload.summary.observedDependencies, 3);
  assert.equal(payload.summary.shownObservedDependencies, 2);
  assert.deepEqual(
    payload.observedDependencies.map((edge: { violations: Array<{ code: string }> }) => edge.violations[0]?.code),
    ["unexposed_import", "hidden_import"]
  );
});

test("cli graph --attention --json marks the attention filter", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "graph", "--root", "fixtures/visibility-rules", "--attention", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, "axiom.graph.v9");
  assert.deepEqual(payload.filters, { violationsOnly: true, attention: true });
  assert.equal(payload.summary.shownObservedDependencies, 2);
});

test("cli observe --json marks the attention filter", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "observe", "--root", "fixtures/visibility-rules", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, "axiom.graph.v9");
  assert.deepEqual(payload.filters, { violationsOnly: true, attention: true });
  assert.equal(payload.summary.shownObservedDependencies, 2);
});

test("cli observe --baseline reports observed edge drift without failing", () => {
  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "observe",
      "--root",
      "fixtures/basic-ts-invalid",
      "--baseline",
      "fixtures/baseline-drift/basic-valid.graph.json",
      "--json"
    ],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, "axiom.graph.v9");
  assert.equal(payload.drift.kind, "advisory_observed_edge_drift");
  assert.deepEqual(
    payload.drift.newObservedEdges.map((edge: { fromModule: string; toModule: string }) => `${edge.fromModule}->${edge.toModule}`),
    ["Simulation->Rendering"]
  );
  assert.deepEqual(
    payload.drift.removedObservedEdges.map((edge: { fromModule: string; toModule: string }) => `${edge.fromModule}->${edge.toModule}`),
    ["Rendering->Physics"]
  );
  assert.deepEqual(payload.drift.newObservedEdges[0].violations.map((violation: { code: string }) => violation.code), [
    "forbidden_dependency"
  ]);
});

test("cli observe --baseline --markdown prints a PR-friendly review without failing", () => {
  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "observe",
      "--root",
      "fixtures/basic-ts-invalid",
      "--baseline",
      "fixtures/baseline-drift/basic-valid.graph.json",
      "--markdown"
    ],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /## Axiom Architecture Review/);
  assert.match(result.stdout, /Status: failing contract/);
  assert.match(result.stdout, /Review mode: observe \(advisory\)/);
  assert.match(result.stdout, /### Hard Violations/);
  assert.match(result.stdout, /`Simulation -> Rendering` via `src\/simulation\/step\.ts:2` importing `\.\.\/rendering\/draw`/);
  assert.match(result.stdout, /### Architecture Drift \(Advisory\)/);
  assert.match(result.stdout, /`advisory_observed_edge_drift`/);
});

test("cli observe --baseline rejects filtered graph baselines", () => {
  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "observe",
      "--root",
      "fixtures/basic-ts-invalid",
      "--baseline",
      "fixtures/baseline-drift/filtered.graph.json",
      "--json"
    ],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Baseline graph must be unfiltered/);
});

test("cli graph rejects markdown and json together", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "graph", "--root", "fixtures/basic-ts-valid", "--json", "--markdown"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Use only one of --json, --markdown, or --mermaid/);
});

test("cli graph rejects mermaid and json together", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "graph", "--root", "fixtures/basic-ts-valid", "--json", "--mermaid"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Use only one of --json, --markdown, or --mermaid/);
});

test("cli check rejects markdown output", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "check", "--root", "fixtures/basic-ts-valid", "--markdown"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /--markdown is only supported by graph and observe/);
});

test("cli check rejects mermaid output", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "check", "--root", "fixtures/basic-ts-valid", "--mermaid"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /--mermaid is only supported by graph and observe/);
});

test("cli infer prints a starter .axi contract", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "infer", "--root", "fixtures/basic-ts-valid"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Generated by axi infer/);
  assert.match(result.stdout, /not a recommended architecture/);
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
  assert.equal(payload.starterContract.kind, "current_graph_snapshot");
  assert.match(payload.starterContract.notice.join("\n"), /not a recommended architecture/);
  assert.equal(payload.summary.modules, 3);
  assert.match(payload.axi, /not a recommended architecture/);
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

test("cli check --spec uses an external contract file instead of root discovery", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "check", "--root", "fixtures/basic-ts-valid", "--spec", "fixtures/external-contracts/basic-main.axi", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.summary.specFiles, 1);
  assert.deepEqual(payload.specFiles, ["../external-contracts/basic-main.axi"]);
  assert.equal(
    payload.modules.find((module: { name: string }) => module.name === "Simulation")?.purpose,
    "external pilot contract"
  );
});

test("cli infer rejects --spec because inference stays read-only and spec-free", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "infer", "--root", "fixtures/basic-ts-valid", "--spec", "fixtures/external-contracts/basic-main.axi"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /--spec is only supported by check, graph, and observe/);
});

test("cli rejects invalid intentional violation warning day windows", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "check", "--root", "fixtures/basic-ts-valid", "--intentional-violation-warning-days", "soon"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /--intentional-violation-warning-days must be a non-negative integer/);
});
