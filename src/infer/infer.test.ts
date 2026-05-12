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
      suggestedExposes: ["src/a/index.ts", "src/b/index.ts"],
      suggestedHides: [],
      depends: [],
      sourceGroups: ["A", "B"]
    }
  ]);
});

test("infer JSON includes the generated .axi draft", () => {
  const result = runInfer({ root: path.join(repoRoot, "fixtures/basic-ts-valid") });
  const payload = toInferJson(result);

  assert.equal(payload.schemaVersion, "axiom.infer.v2");
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

test("infer suggests visibility rules as comments", () => {
  const result = runInfer({ root: path.join(repoRoot, "fixtures/infer-visibility") });
  const services = result.modules.find((module) => module.name === "Services");

  assert.deepEqual(services?.suggestedExposes, ["src/services/index.ts"]);
  assert.deepEqual(services?.suggestedHides, ["src/services/internal/**"]);

  const output = formatInferResult(result);
  assert.match(output, /# suggestion: exposes "src\/services\/index\.ts"/);
  assert.match(output, /# suggestion: hides "src\/services\/internal\/\*\*"/);
});

test("infer supports deeper source grouping", () => {
  const shallow = runInfer({ root: path.join(repoRoot, "fixtures/infer-group-depth") });
  const deep = runInfer({ root: path.join(repoRoot, "fixtures/infer-group-depth"), groupDepth: 2 });

  assert.deepEqual(
    shallow.modules.map((module) => module.name),
    ["Services", "Ui"]
  );
  assert.deepEqual(
    deep.modules.map((module) => module.name),
    ["ServicesAgent", "ServicesTools", "Ui"]
  );
  assert.deepEqual(deep.modules.find((module) => module.name === "Ui")?.depends, ["ServicesAgent", "ServicesTools"]);
});

test("infer supports workspace package grouping", () => {
  const result = runInfer({ root: path.join(repoRoot, "fixtures/package-exports"), groupBy: "workspace" });

  assert.equal(result.candidateModules, 2);
  assert.deepEqual(
    result.modules.map((module) => ({
      name: module.name,
      paths: module.paths,
      depends: module.depends
    })),
    [
      {
        name: "Shared",
        paths: ["packages/shared/src/**"],
        depends: []
      },
      {
        name: "Web",
        paths: ["apps/web/src/**"],
        depends: ["Shared"]
      }
    ]
  );
});

test("workspace inference keeps package root files from overlapping src modules", () => {
  const result = runInfer({ root: path.join(repoRoot, "fixtures/workspace-infer-root-files"), groupBy: "workspace" });

  assert.equal(result.candidateModules, 2);
  assert.deepEqual(
    result.modules.map((module) => ({
      name: module.name,
      paths: module.paths
    })),
    [
      {
        name: "Lib",
        paths: ["packages/lib/src/**"]
      },
      {
        name: "LibVitest",
        paths: ["packages/lib/vitest.config.ts"]
      }
    ]
  );
});
