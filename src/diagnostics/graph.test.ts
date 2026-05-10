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
    "summary",
    "modules",
    "declaredDependencies",
    "forbiddenDependencies",
    "exposedPaths",
    "hiddenPaths",
    "observedDependencies",
    "violations"
  ]);
  assert.equal(payload.schemaVersion, graphJsonSchemaVersion);
  assert.deepEqual(payload.summary, {
    modules: 2,
    declaredDependencies: 1,
    forbiddenDependencies: 0,
    exposedPaths: 1,
    hiddenPaths: 1,
    observedDependencies: 3,
    violations: 2
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
