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
  assert.match(output, /# inference review story:/);
  assert.match(output, /# summary: Starter contract inferred 3 modules and 1 observed module edge from 3 source files\./);
  assert.match(output, /# pressure: Review inferred dependencies - 1 observed module edge became `depends on` lines/);
  assert.match(output, /# authoring checklist:/);
  assert.match(output, /# 1\. Rename modules so they match the team's architecture vocabulary/);
  assert.match(output, /# next commands:/);
  assert.match(output, /# axi observe --root \. --spec <draft\.axi> --markdown/);
  assert.match(output, /# axi diff --root \. --spec <draft\.axi> axiom-baseline\.json/);
  assert.match(output, /module Simulation/);
  assert.match(output, /path "src\/simulation\/\*\*"/);
  assert.match(output, /# evidence: 1 import site observed for Simulation -> Physics/);
  assert.match(output, /# sample: src\/simulation\/step\.ts:1 imports "\.\.\/physics\/math" -> src\/physics\/math\.ts/);
  assert.match(output, /depends on Physics/);
});

test("infer collapses cyclic candidate groups into one starter module", () => {
  const result = runInfer({ root: path.join(repoRoot, "fixtures/infer-cycle") });

  assert.equal(result.candidateModules, 2);
  assert.deepEqual(result.collapsedCycles, [
    {
      module: "AB",
      sourceGroups: ["A", "B"],
      cyclePathSamples: [
        {
          groups: ["A", "B", "A"]
        }
      ],
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
      ],
      cycleBreakingCandidates: [
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
          ],
          rationale:
            "A -> B participates in the collapsed cycle with 1 import site; inspect whether this edge should become an explicit boundary, interface, event, or accepted merged responsibility."
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
          ],
          rationale:
            "B -> A participates in the collapsed cycle with 1 import site; inspect whether this edge should become an explicit boundary, interface, event, or accepted merged responsibility."
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
  assert.match(output, /# cycle path sample:\n# - A -> B -> A/);
  assert.match(output, /# cycle-breaking candidates:\n# - A -> B \(1 import site\)/);
  assert.match(output, /#   sample: src\/a\/index\.ts:1 imports "\.\.\/b" -> src\/b\/index\.ts/);
  assert.match(output, /candidates are inspection points, not automatic refactor instructions/);
  assert.match(output, /# reason: inferred groups form a circular dependency/);
  assert.match(output, /Review collapsed cycles as boundary tangles/);

  const payload = toInferJson(result);
  assert.equal(payload.schemaVersion, "axiom.infer.v8");
  assert.equal(payload.reviewStory.pressures[0]?.kind, "collapsed_cycle");
  assert.match(payload.reviewStory.nextStep, /Review collapsed-cycle candidates/);
  assert.deepEqual(payload.collapsedCycles[0]?.cycleBreakingCandidates?.map((candidate) => ({
    fromGroup: candidate.fromGroup,
    toGroup: candidate.toGroup,
    count: candidate.count
  })), [
    { fromGroup: "A", toGroup: "B", count: 1 },
    { fromGroup: "B", toGroup: "A", count: 1 }
  ]);
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
  assert.match(output, /# cycle path sample:\n# - ServicesAgentLoop -> ServicesMemory -> ServicesTools -> Store -> ServicesAgentLoop/);
  assert.doesNotMatch(output, /ServicesAgentLoopServicesMemoryServicesToolsStore/);
});

test("infer avoids duplicated shared prefixes in collapsed cycle names", () => {
  const result = runInfer({ root: path.join(repoRoot, "fixtures/infer-shared-prefix-cycle") });

  assert.equal(result.candidateModules, 2);
  assert.deepEqual(result.collapsedCycles.map((cycle) => cycle.module), ["SignalsDebugCycle"]);
  assert.deepEqual(result.collapsedCycles[0]?.sourceGroups, ["Signals", "SignalsDebug"]);
  assert.deepEqual(result.modules.map((module) => module.name), ["SignalsDebugCycle"]);

  const output = formatInferResult(result);
  assert.match(output, /# collapsed cycle: SignalsDebugCycle/);
  assert.doesNotMatch(output, /SignalsSignalsDebug/);
});

test("infer gives mixed long collapsed cycles a neutral readable module name", () => {
  const result = runInfer({ root: path.join(repoRoot, "fixtures/infer-mixed-long-cycle") });

  assert.equal(result.candidateModules, 5);
  assert.deepEqual(result.collapsedCycles.map((cycle) => cycle.module), ["MixedCycle"]);
  assert.deepEqual(result.collapsedCycles[0]?.sourceGroups, ["Adapter", "Client", "Middleware", "Router", "Utils"]);
  assert.deepEqual(result.modules.map((module) => module.name), ["MixedCycle"]);

  const output = formatInferResult(result);
  assert.match(output, /# collapsed cycle: MixedCycle/);
  assert.match(output, /# includes:\n# - Adapter\n# - Client\n# - Middleware\n# - Router\n# - Utils/);
  assert.match(output, /# cycle path sample:/);
  assert.doesNotMatch(output, /CycleGroupAdapterAnd/);
});

test("infer JSON includes the generated .axi draft", () => {
  const result = runInfer({ root: path.join(repoRoot, "fixtures/basic-ts-valid") });
  const payload = toInferJson(result);

  assert.equal(payload.schemaVersion, "axiom.infer.v8");
  assert.deepEqual(payload.starterContract, {
    kind: "current_graph_snapshot",
    notice: [
      "This starter contract mirrors the current dependency graph; it is not a recommended architecture.",
      "Review module names, collapsed cycles, visibility suggestions, and dependencies before treating it as intent.",
      "Use `axi check` only after the contract describes the architecture you want to protect."
    ],
    authoringChecklist: [
      "Rename modules so they match the team's architecture vocabulary, not only folder names.",
      "Review each `depends on` edge and its evidence comments as intended architecture; remove or refactor accidental edges before using this as a gate.",
      "Turn commented `exposes` and `hides` suggestions into real rules only after confirming the public/internal boundary.",
      "Add `layers` and `layer` statements only when dependency direction is clear enough to enforce.",
      "Use `accepts ... [at \"path\"] until ... because ...` only for reviewed migration debt; do not blanket-accept first-run problems.",
      "Save an unfiltered portable graph JSON baseline when the draft is useful so future runs can show drift over time without local root-path churn.",
      "If the module map feels too broad or too detailed, rerun inference with `--group-depth` or `--group-by workspace`."
    ],
    nextCommands: [
      "axi observe --root . --spec <draft.axi> --markdown",
      "axi graph --root . --spec <draft.axi> --mermaid",
      "axi graph --root . --spec <draft.axi> --json --portable > axiom-baseline.json",
      "axi diff --root . --spec <draft.axi> axiom-baseline.json"
    ]
  });
  assert.equal(payload.summary.sourceFiles, 3);
  assert.equal(payload.summary.importsScanned, 1);
  assert.equal(payload.summary.observedDependencies, 1);
  assert.equal(payload.summary.observedModuleEdges, 1);
  assert.equal(payload.summary.observedImportSites, 1);
  assert.deepEqual(payload.reviewStory, {
    summary: "Starter contract inferred 3 modules and 1 observed module edge from 3 source files.",
    setup:
      "Scanned 3 source files and 1 import; 3 candidate groups became 3 starter modules. This is a current-graph snapshot, not declared architecture intent yet.",
    pressures: [
      {
        kind: "dependency_evidence",
        title: "Review inferred dependencies",
        description:
          "1 observed module edge became `depends on` lines with sample import evidence. Confirm each edge is intended before using this draft as a gate.",
        severity: "info",
        modules: ["Physics", "Simulation"]
      }
    ],
    nextStep:
      "Rename modules, confirm inferred dependency evidence, then run `axi observe --root . --spec <draft.axi> --markdown` before saving a graph baseline.",
    caveat:
      "Inference reads static imports and folder/package shape. It can lower authoring cost, but humans still decide module names, visibility, layers, accepted debt, and which edges are real architecture intent."
  });
  assert.equal(payload.summary.architecturePressureNotes, 0);
  assert.deepEqual(payload.architecturePressureNotes, []);
  assert.equal(payload.summary.modules, 3);
  assert.deepEqual(payload.modules.find((module) => module.name === "Simulation")?.dependencyEvidence, [
    {
      toModule: "Physics",
      count: 1,
      samples: [
        {
          filePath: "src/simulation/step.ts",
          line: 1,
          specifier: "../physics/math",
          resolvedPath: "src/physics/math.ts"
        }
      ]
    }
  ]);
  assert.deepEqual(payload.modules.find((module) => module.name === "Physics")?.dependencyEvidence, []);
  assert.match(payload.axi, /not a recommended architecture/);
  assert.match(payload.axi, /module Physics/);
});

test("infer JSON distinguishes module edges from import-site evidence", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-infer-summary-counts-"));

  try {
    fs.mkdirSync(path.join(root, "src/a"), { recursive: true });
    fs.mkdirSync(path.join(root, "src/b"), { recursive: true });
    fs.writeFileSync(path.join(root, "src/a/one.ts"), 'import { api } from "../b/api";\napi;\n');
    fs.writeFileSync(path.join(root, "src/a/two.ts"), 'import { api } from "../b/api";\napi;\n');
    fs.writeFileSync(path.join(root, "src/b/api.ts"), "export const api = true;\n");

    const payload = toInferJson(runInfer({ root }));

    assert.equal(payload.summary.importsScanned, 2);
    assert.equal(payload.summary.observedDependencies, 1);
    assert.equal(payload.summary.observedModuleEdges, 1);
    assert.equal(payload.summary.observedImportSites, 2);
    assert.equal(payload.observedDependencies[0]?.count, 2);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("infer includes architecture pressure notes for large source files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-infer-large-file-"));

  try {
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "src/main.ts"),
      Array.from({ length: 805 }, (_, index) => `export const value${index} = ${index};`).join("\n")
    );

    const result = runInfer({ root });
    const output = formatInferResult(result);
    const payload = toInferJson(result);

    assert.equal(result.architecturePressureNotes.length, 1);
    assert.deepEqual(result.architecturePressureNotes[0], {
      kind: "large_source_file",
      filePath: "src/main.ts",
      lineCount: 805,
      threshold: 800,
      importsScanned: 0,
      exportsScanned: 0,
      functionLikeCount: 0,
      classCount: 0,
      message:
        "src/main.ts has 805 lines; inferred module boundaries may miss responsibilities concentrated inside this file."
    });
    assert.match(output, /# architecture pressure notes:/);
    assert.match(output, /# pressure: Large-file pressure in inferred scope - 1 large source file may hide responsibilities/);
    assert.match(output, /# - src\/main\.ts: 805 lines, 0 imports, 0 functions, 0 classes/);
    assert.match(output, /quiet inferred import graph can still hide responsibilities inside very large files/);
    assert.equal(payload.summary.architecturePressureNotes, 1);
    assert.equal(payload.reviewStory.pressures[0]?.kind, "large_source_file");
    assert.equal(payload.architecturePressureNotes[0]?.filePath, "src/main.ts");
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
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

test("inferred visibility suggestions do not drive hard validation", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-infer-visibility-suggestions-"));

  try {
    fs.mkdirSync(path.join(root, "src/services/internal"), { recursive: true });
    fs.mkdirSync(path.join(root, "src/ui"), { recursive: true });
    fs.writeFileSync(path.join(root, "src/services/index.ts"), "export const publicApi = true;\n");
    fs.writeFileSync(path.join(root, "src/services/internal/secret.ts"), "export const secret = true;\n");
    fs.writeFileSync(path.join(root, "src/ui/view.ts"), 'import { secret } from "../services/internal/secret";\nsecret;\n');

    const inferred = runInfer({ root });
    const services = inferred.modules.find((module) => module.name === "Services");
    assert.deepEqual(services?.suggestedExposes, ["src/services/index.ts"]);
    assert.deepEqual(services?.suggestedHides, ["src/services/internal/**"]);

    const specPath = path.join(root, "draft.axi");
    fs.writeFileSync(specPath, `${formatInferResult(inferred)}\n`);
    const check = runCheck({ root, specPaths: [specPath] });

    assert.deepEqual(check.violations, []);
    assert.deepEqual(check.observedDependencies.map((dependency) => `${dependency.fromModule}->${dependency.toModule}`), [
      "Ui->Services"
    ]);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
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

test("infer names source-root entry files as app entry candidates", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-infer-app-entry-"));

  try {
    fs.mkdirSync(path.join(root, "src/engine"), { recursive: true });
    fs.writeFileSync(path.join(root, "src/main.ts"), 'import { createEngine } from "./engine";\ncreateEngine();\n');
    fs.writeFileSync(path.join(root, "src/engine/index.ts"), "export function createEngine() {}\n");

    const result = runInfer({ root });

    assert.deepEqual(
      result.modules.map((module) => ({
        name: module.name,
        paths: module.paths,
        depends: module.depends
      })),
      [
        {
          name: "AppEntry",
          paths: ["src/*"],
          depends: ["Engine"]
        },
        {
          name: "Engine",
          paths: ["src/engine/**"],
          depends: []
        }
      ]
    );
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
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

test("infer uses configured Python import roots", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-infer-python-roots-"));

  try {
    fs.mkdirSync(path.join(root, "src/cogs"), { recursive: true });
    fs.mkdirSync(path.join(root, "src/common"), { recursive: true });
    fs.mkdirSync(path.join(root, "src/ui"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "axiom.config.json"),
      JSON.stringify({
        pythonImportRoots: ["src/common", "src/ui"]
      })
    );
    fs.writeFileSync(path.join(root, "src/cogs/main.py"), "from utils import load\n");
    fs.writeFileSync(path.join(root, "src/common/utils.py"), "def load(): pass\n");
    fs.writeFileSync(path.join(root, "src/ui/utils.py"), "def draw(): pass\n");

    const result = runInfer({ root });

    assert.deepEqual(
      result.observedDependencies.map((dependency) => ({
        fromModule: dependency.fromModule,
        toModule: dependency.toModule,
        count: dependency.count,
        specifier: dependency.samples[0]?.specifier,
        resolvedPath: dependency.samples[0]?.resolvedPath
      })),
      [
        {
          fromModule: "Cogs",
          toModule: "Common",
          count: 1,
          specifier: "utils",
          resolvedPath: "src/common/utils.py"
        }
      ]
    );
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("infer honors explicit include scopes instead of narrowing to src", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-infer-explicit-scope-"));

  try {
    fs.mkdirSync(path.join(root, "cogs"), { recursive: true });
    fs.mkdirSync(path.join(root, "src/common"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "axiom.config.json"),
      JSON.stringify({
        include: ["main.py", "cogs/**/*.py", "src/**/*.py"],
        pythonImportRoots: ["src/common", "."]
      })
    );
    fs.writeFileSync(path.join(root, "main.py"), "import cogs.trading\nfrom utils import load\n");
    fs.writeFileSync(path.join(root, "cogs/__init__.py"), "");
    fs.writeFileSync(path.join(root, "cogs/trading.py"), "from utils import load\n");
    fs.writeFileSync(path.join(root, "src/common/utils.py"), "def load(): pass\n");

    const result = runInfer({ root });

    assert.deepEqual(
      result.sourceFiles.map((filePath) => normalize(root, filePath)),
      ["cogs/__init__.py", "cogs/trading.py", "main.py", "src/common/utils.py"]
    );
    assert.deepEqual(
      result.modules.map((module) => ({
        name: module.name,
        paths: module.paths,
        depends: module.depends
      })),
      [
        {
          name: "AppEntry",
          paths: ["main.py"],
          depends: ["Cogs", "Common"]
        },
        {
          name: "Cogs",
          paths: ["cogs/**"],
          depends: ["Common"]
        },
        {
          name: "Common",
          paths: ["src/common/**"],
          depends: []
        }
      ]
    );
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
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

function normalize(root: string, filePath: string): string {
  return path.relative(root, filePath).replace(/\\/g, "/");
}
