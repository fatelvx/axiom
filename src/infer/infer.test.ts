import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { formatInferResult, toInferJson } from "../diagnostics/infer.js";
import { runCheck } from "../validator/check.js";
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
  assert.match(output, /not a recommended architecture/);
  assert.match(output, /# authoring checklist:/);
  assert.match(output, /# 1\. Rename modules so they match the team's architecture vocabulary/);
  assert.match(output, /# next commands:/);
  assert.match(output, /# axi observe --root \. --spec <draft\.axi> --markdown/);
  assert.match(output, /# axi diff --root \. --spec <draft\.axi> axiom-baseline\.json/);
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
      sourceGroups: ["A", "B"],
      internalDependencies: [
        {
          fromGroup: "A",
          toGroup: "B",
          count: 1,
          samples: [
            {
              filePath: "src/a/index.ts",
              line: 1,
              specifier: "../b",
              resolvedPath: "src/b/index.ts"
            }
          ]
        },
        {
          fromGroup: "B",
          toGroup: "A",
          count: 1,
          samples: [
            {
              filePath: "src/b/index.ts",
              line: 1,
              specifier: "../a",
              resolvedPath: "src/a/index.ts"
            }
          ]
        }
      ]
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

  const output = formatInferResult(result);
  assert.match(output, /# collapsed cycle: AB/);
  assert.match(output, /# includes: A, B/);
  assert.match(output, /# - A -> B \(1\)/);
  assert.match(output, /# reason: inferred groups form a circular dependency/);
  assert.match(output, /Review collapsed cycles as boundary tangles/);
});

test("infer gives long collapsed cycles a readable module name", () => {
  const result = runInfer({ root: path.join(repoRoot, "fixtures/infer-long-cycle"), groupDepth: 2 });

  assert.equal(result.candidateModules, 4);
  assert.deepEqual(result.collapsedCycles.map((cycle) => cycle.module), ["ServicesCycle"]);
  assert.deepEqual(result.collapsedCycles[0]?.sourceGroups, [
    "ServicesAgentLoop",
    "ServicesMemory",
    "ServicesTools",
    "Store"
  ]);
  assert.deepEqual(result.modules.map((module) => module.name), ["ServicesCycle"]);

  const output = formatInferResult(result);
  assert.match(output, /# collapsed cycle: ServicesCycle/);
  assert.match(output, /# includes: ServicesAgentLoop, ServicesMemory, ServicesTools, Store/);
  assert.match(output, /# - ServicesAgentLoop -> ServicesMemory \(1\)/);
  assert.doesNotMatch(output, /ServicesAgentLoopServicesMemoryServicesToolsStore/);
});

test("infer JSON includes the generated .axi draft", () => {
  const result = runInfer({ root: path.join(repoRoot, "fixtures/basic-ts-valid") });
  const payload = toInferJson(result);

  assert.equal(payload.schemaVersion, "axiom.infer.v3");
  assert.deepEqual(payload.starterContract, {
    kind: "current_graph_snapshot",
    notice: [
      "This starter contract mirrors the current dependency graph; it is not a recommended architecture.",
      "Review module names, collapsed cycles, visibility suggestions, and dependencies before treating it as intent.",
      "Use `axi check` only after the contract describes the architecture you want to protect."
    ],
    authoringChecklist: [
      "Rename modules so they match the team's architecture vocabulary, not only folder names.",
      "Review each `depends on` edge as intended architecture; remove or refactor accidental edges before using this as a gate.",
      "Turn commented `exposes` and `hides` suggestions into real rules only after confirming the public/internal boundary.",
      "Add `layers` and `layer` statements only when dependency direction is clear enough to enforce.",
      "Use `accepts ... until ... because ...` only for reviewed migration debt; do not blanket-accept first-run problems.",
      "Save an unfiltered graph JSON baseline when the draft is useful so future runs can show drift over time.",
      "If the module map feels too broad or too detailed, rerun inference with `--group-depth` or `--group-by workspace`."
    ],
    nextCommands: [
      "axi observe --root . --spec <draft.axi> --markdown",
      "axi graph --root . --spec <draft.axi> --mermaid",
      "axi graph --root . --spec <draft.axi> --json > axiom-baseline.json",
      "axi diff --root . --spec <draft.axi> axiom-baseline.json"
    ]
  });
  assert.equal(payload.summary.sourceFiles, 3);
  assert.equal(payload.summary.modules, 3);
  assert.match(payload.axi, /not a recommended architecture/);
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

test("infer keeps parent and child folder ownership non-overlapping for deeper grouping", () => {
  const result = runInfer({ root: path.join(repoRoot, "fixtures/infer-overlap-folders"), groupDepth: 2 });

  assert.deepEqual(
    result.modules.map((module) => ({
      name: module.name,
      paths: module.paths
    })),
    [
      {
        name: "Services",
        paths: ["src/services/*"]
      },
      {
        name: "ServicesBenchmark",
        paths: ["src/services/benchmark/**"]
      },
      {
        name: "ServicesGuard",
        paths: ["src/services/guard/**"]
      }
    ]
  );

  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "axi-infer-overlap-"));
  const specPath = path.join(directory, "main.axi");

  try {
    fs.writeFileSync(specPath, `${formatInferResult(result)}\n`);

    const check = runCheck({
      root: path.join(repoRoot, "fixtures/infer-overlap-folders"),
      specPaths: [specPath]
    });

    assert.equal(check.violations.some((violation) => violation.code === "ambiguous_module_owner"), false);
  } finally {
    fs.rmSync(directory, { force: true, recursive: true });
  }
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
