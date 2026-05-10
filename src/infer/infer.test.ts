import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { formatInferResult, toInferJson } from "../diagnostics/infer.js";
import { runInfer } from "./infer.js";

const repoRoot = process.cwd();

test("infer creates a starter contract from source folders", () => {
  const result = runInfer({ root: path.join(repoRoot, "fixtures/basic-ts-valid") });

  assert.equal(result.candidateModules, 3);
  assert.deepEqual(
    result.modules.map((module) => module.name),
    ["Physics", "Rendering", "Simulation"]
  );

  const simulation = result.modules.find((module) => module.name === "Simulation");
  assert.deepEqual(simulation?.paths, ["src/simulation/**"]);
  assert.deepEqual(simulation?.depends, ["Physics"]);

  const output = formatInferResult(result);
  assert.match(output, /module Simulation/);
  assert.match(output, /path "src\/simulation\/\*\*"/);
  assert.match(output, /depends on Physics/);
});

test("infer collapses cyclic candidate groups into one starter module", () => {
  const result = runInfer({ root: path.join(repoRoot, "fixtures/infer-cycle") });

  assert.equal(result.candidateModules, 2);
  assert.deepEqual(result.collapsedCycles, [
    {
      module: "AB",
      sourceGroups: ["A", "B"]
    }
  ]);
  assert.deepEqual(result.modules, [
    {
      name: "AB",
      paths: ["src/a/**", "src/b/**"],
      depends: [],
      sourceGroups: ["A", "B"]
    }
  ]);
});

test("infer JSON includes the generated .axi draft", () => {
  const result = runInfer({ root: path.join(repoRoot, "fixtures/basic-ts-valid") });
  const payload = toInferJson(result);

  assert.equal(payload.schemaVersion, "axiom.infer.v1");
  assert.equal(payload.summary.sourceFiles, 3);
  assert.equal(payload.summary.modules, 3);
  assert.match(payload.axi, /module Physics/);
});

test("infer uses TypeScript path aliases from tsconfig", () => {
  const result = runInfer({ root: path.join(repoRoot, "fixtures/tsconfig-paths") });

  assert.deepEqual(result.observedDependencies.map((dependency) => `${dependency.fromModule}->${dependency.toModule}`), [
    "App->Shared"
  ]);
  assert.deepEqual(result.modules.find((module) => module.name === "App")?.depends, ["Shared"]);
});
