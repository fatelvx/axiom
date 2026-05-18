import assert from "node:assert/strict";
import test from "node:test";
import { buildInferReviewStory, buildStarterContract } from "./inferGuidance.js";
import type { CollapsedCycle, InferArchitecturePressureNote, InferredDependency, InferredModule } from "./infer.js";

test("starter contract guidance preserves inferred-contract caveats", () => {
  const starter = buildStarterContract([], []);

  assert.equal(starter.kind, "current_graph_snapshot");
  assert.match(starter.notice[0] ?? "", /not a recommended architecture/);
  assert.ok(starter.reviewPass.some((item) => item.includes("desired architecture")));
  assert.ok(starter.authoringChecklist.some((item) => item.includes("--group-depth")));
  assert.deepEqual(starter.nextCommands, [
    "axi observe --root . --spec <draft.axi> --markdown",
    "axi graph --root . --spec <draft.axi> --mermaid",
    "axi graph --root . --spec <draft.axi> --json --portable > axiom-baseline.json",
    "axi diff --root . --spec <draft.axi> axiom-baseline.json"
  ]);
});

test("starter contract guidance calls out collapsed cycles and large-file pressure", () => {
  const starter = buildStarterContract(
    [collapsedCycle("ServicesCycle")],
    [largeFileNote("src/services/aiService.ts")]
  );

  assert.ok(starter.authoringChecklist.some((item) => item.includes("collapsed cycles as boundary tangles")));
  assert.ok(starter.authoringChecklist.some((item) => item.includes("quiet inferred import graph can still hide")));
});

test("infer review story ranks collapsed cycles, large files, and dependency evidence", () => {
  const story = buildInferReviewStory({
    sourceFileCount: 12,
    importCount: 30,
    candidateModules: 5,
    modules: [{ name: "Components" }, { name: "ServicesCycle" }],
    observedDependencies: [dependency("Components", "ServicesCycle")],
    collapsedCycles: [collapsedCycle("ServicesCycle")],
    architecturePressureNotes: [largeFileNote("src/services/aiService.ts")]
  });

  assert.equal(story.summary, "Starter contract inferred 2 modules and 1 observed module edge from 12 source files.");
  assert.equal(
    story.setup,
    "Scanned 12 source files and 30 imports; 5 candidate groups became 2 starter modules. This is a current-graph snapshot, not declared architecture intent yet."
  );
  assert.deepEqual(story.pressures.map((pressure) => pressure.kind), [
    "collapsed_cycle",
    "large_source_file",
    "dependency_evidence"
  ]);
  assert.match(story.nextStep, /Review collapsed-cycle candidates and large-file pressure notes/);
  assert.match(story.caveat, /humans still decide/);
});

test("infer review story keeps quiet snapshots actionable", () => {
  const story = buildInferReviewStory({
    sourceFileCount: 1,
    importCount: 0,
    candidateModules: 1,
    modules: [{ name: "AppEntry" }],
    observedDependencies: [],
    collapsedCycles: [],
    architecturePressureNotes: []
  });

  assert.deepEqual(story.pressures, [
    {
      kind: "quiet_snapshot",
      title: "Quiet starter snapshot",
      description:
        "No cross-module import edges, collapsed cycles, or large-file pressure notes were found in this inference scope. Confirm the scan scope is the architecture you meant to model before saving a baseline.",
      severity: "info"
    }
  ]);
  assert.match(story.nextStep, /Rename modules/);
});

function collapsedCycle(module: string): CollapsedCycle {
  return {
    module,
    sourceGroups: [],
    cyclePathSamples: [],
    internalDependencies: [],
    cycleBreakingCandidates: []
  };
}

function largeFileNote(filePath: string): InferArchitecturePressureNote {
  return {
    kind: "large_source_file",
    filePath,
    lineCount: 1200,
    threshold: 800,
    importsScanned: 2,
    exportsScanned: 1,
    functionLikeCount: 30,
    classCount: 0,
    message: `${filePath} has 1200 lines; inferred module boundaries may miss responsibilities concentrated inside this file.`
  };
}

function dependency(fromModule: string, toModule: string): InferredDependency {
  return {
    fromModule,
    toModule,
    count: 1,
    samples: []
  };
}
