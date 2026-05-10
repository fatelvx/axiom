import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { formatGraphResult, graphJsonSchemaVersion, toGraphJson } from "./graph.js";
import { runCheck } from "../validator/check.js";

const repoRoot = process.cwd();

test("graph JSON exposes declared, forbidden, visibility, and observed edges", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/visibility-rules") });
  const payload = toGraphJson(result);

  assert.deepEqual(Object.keys(payload), [
    "schemaVersion",
    "root",
    "filters",
    "summary",
    "modules",
    "declaredDependencies",
    "forbiddenDependencies",
    "exposedPaths",
    "hiddenPaths",
    "observedDependencies",
    "violations",
    "warnings"
  ]);
  assert.equal(payload.schemaVersion, graphJsonSchemaVersion);
  assert.deepEqual(payload.filters, { violationsOnly: false });
  assert.deepEqual(payload.summary, {
    modules: 2,
    declaredDependencies: 1,
    forbiddenDependencies: 0,
    exposedPaths: 1,
    hiddenPaths: 1,
    observedDependencies: 3,
    shownObservedDependencies: 3,
    violations: 2,
    suppressedViolations: 0,
    warnings: 0
  });
  assert.deepEqual(payload.declaredDependencies, [
    {
      fromModule: "UI",
      toModule: "Services",
      ruleLocation: {
        filePath: "axiom/main.axi",
        line: 3
      }
    }
  ]);
  assert.deepEqual(payload.exposedPaths, [
    {
      module: "Services",
      pattern: "src/services/index.ts",
      ruleLocation: {
        filePath: "axiom/main.axi",
        line: 7
      }
    }
  ]);
  assert.deepEqual(payload.hiddenPaths, [
    {
      module: "Services",
      pattern: "src/services/internal/**",
      ruleLocation: {
        filePath: "axiom/main.axi",
        line: 8
      }
    }
  ]);
  assert.deepEqual(
    payload.observedDependencies.map((edge) => `${edge.fromModule}->${edge.toModule}:${edge.import.line}`),
    ["UI->Services:1", "UI->Services:2", "UI->Services:3"]
  );
  assert.deepEqual(payload.observedDependencies.map((edge) => edge.violations.map((violation) => violation.code)), [
    [],
    ["unexposed_import"],
    ["hidden_import"]
  ]);
  assert.deepEqual(payload.observedDependencies.map((edge) => edge.suppressedViolations), [[], [], []]);
});

test("human graph output includes readable sections", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/basic-ts-invalid") });
  const output = formatGraphResult(result);

  assert.match(output, /Axiom graph\./);
  assert.match(output, /declared dependencies:\n  Simulation -> Physics \(axiom\/main\.axi:12\)/);
  assert.match(output, /forbidden dependencies:\n  Simulation -X-> Rendering \(axiom\/main\.axi:13\)/);
  assert.match(output, /observed dependencies:/);
  assert.match(output, /Simulation -> Physics via src\/simulation\/step\.ts:1 "\.\.\/physics\/math"/);
  assert.match(output, /Simulation -> Rendering via src\/simulation\/step\.ts:2 "\.\.\/rendering\/draw"/);
});

test("violations-only graph output focuses observed edges with diagnostics", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/visibility-rules") });
  const output = formatGraphResult(result, { violationsOnly: true });

  assert.match(output, /Axiom graph \(violations only\)\./);
  assert.match(output, /observed dependencies: 2 of 3/);
  assert.doesNotMatch(output, /src\/ui\/view\.ts:1 "\.\.\/services"/);
  assert.match(output, /src\/ui\/view\.ts:2 "\.\.\/services\/feature"/);
  assert.match(output, /unexposed_import: UI imports a non-exposed path from Services\./);
  assert.match(output, /fix: Import an exposed entry point from Services, or add an exposes rule for this public API\./);
  assert.match(output, /src\/ui\/view\.ts:3 "\.\.\/services\/internal\/secret"/);
  assert.match(output, /hidden_import: UI imports hidden path from Services\./);
  assert.match(output, /other violations:\n  none/);
});

test("violations-only graph JSON filters observed dependencies but keeps total counts", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/visibility-rules") });
  const payload = toGraphJson(result, { violationsOnly: true });

  assert.deepEqual(payload.filters, { violationsOnly: true });
  assert.equal(payload.summary.observedDependencies, 3);
  assert.equal(payload.summary.shownObservedDependencies, 2);
  assert.deepEqual(
    payload.observedDependencies.map((edge) => `${edge.import.line}:${edge.violations[0]?.code}`),
    ["2:unexposed_import", "3:hidden_import"]
  );
});

test("violations-only graph output includes active suppressed dependency debt", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/suppressed-dependency") });
  const output = formatGraphResult(result, { violationsOnly: true });

  assert.match(output, /violations: 0/);
  assert.match(output, /suppressed violations: 1/);
  assert.match(output, /Simulation -> Rendering via src\/simulation\/step\.ts:1 "\.\.\/rendering\/draw"/);
  assert.match(output, /suppressed forbidden_dependency: Simulation imports forbidden module Rendering\./);
  assert.match(output, /suppression: until 2099-01-01 \(axiom\/main\.axi:7\)/);
  assert.match(output, /reason: legacy renderer migration/);
});
