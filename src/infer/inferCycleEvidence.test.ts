import assert from "node:assert/strict";
import test from "node:test";
import { buildCollapsedCycleEvidence, buildCycleBreakingCandidates } from "./inferCycleEvidence.js";
import type { CollapsedCycleDependency, InferredImportSample } from "./infer.js";

const sample = (filePath: string, specifier: string, resolvedPath: string): InferredImportSample => ({
  filePath,
  line: 1,
  specifier,
  resolvedPath
});

test("collapsed cycle evidence includes sorted groups, path sample, dependencies, and review candidates", () => {
  const evidence = buildCollapsedCycleEvidence({
    candidateGroups: [
      { key: "services", name: "Services" },
      { key: "store", name: "Store" },
      { key: "tools", name: "Tools" }
    ],
    candidateEdges: [
      {
        from: "store",
        to: "services",
        count: 2,
        samples: [sample("src/store/chat.ts", "../services/agent", "src/services/agent.ts")]
      },
      {
        from: "services",
        to: "tools",
        count: 4,
        samples: [sample("src/services/agent.ts", "../tools/run", "src/tools/run.ts")]
      },
      {
        from: "tools",
        to: "store",
        count: 1,
        samples: [sample("src/tools/run.ts", "../store/chat", "src/store/chat.ts")]
      }
    ],
    component: {
      name: "ServicesCycle",
      keys: ["store", "tools", "services"]
    }
  });

  assert.equal(evidence.module, "ServicesCycle");
  assert.deepEqual(evidence.sourceGroups, ["Services", "Store", "Tools"]);
  assert.deepEqual(evidence.cyclePathSamples, [
    {
      groups: ["Services", "Tools", "Store", "Services"]
    }
  ]);
  assert.deepEqual(evidence.internalDependencies.map((dependency) => ({
    fromGroup: dependency.fromGroup,
    toGroup: dependency.toGroup,
    count: dependency.count
  })), [
    { fromGroup: "Services", toGroup: "Tools", count: 4 },
    { fromGroup: "Store", toGroup: "Services", count: 2 },
    { fromGroup: "Tools", toGroup: "Store", count: 1 }
  ]);
  assert.deepEqual(evidence.cycleBreakingCandidates.map((candidate) => ({
    fromGroup: candidate.fromGroup,
    toGroup: candidate.toGroup,
    count: candidate.count
  })), [
    { fromGroup: "Services", toGroup: "Tools", count: 4 },
    { fromGroup: "Store", toGroup: "Services", count: 2 },
    { fromGroup: "Tools", toGroup: "Store", count: 1 }
  ]);
  assert.match(evidence.cycleBreakingCandidates[0]?.rationale ?? "", /4 import sites/);
  assert.match(evidence.cycleBreakingCandidates[0]?.rationale ?? "", /inspection|inspect/);
});

test("cycle-breaking candidates are capped and deterministic", () => {
  const dependencies: CollapsedCycleDependency[] = [
    dependency("Ui", "Services", 1),
    dependency("Services", "Store", 7),
    dependency("Store", "Services", 7),
    dependency("Tools", "Services", 3),
    dependency("Mcp", "Tools", 2),
    dependency("Sandbox", "Tools", 2)
  ];

  assert.deepEqual(buildCycleBreakingCandidates(dependencies).map((candidate) => ({
    fromGroup: candidate.fromGroup,
    toGroup: candidate.toGroup,
    count: candidate.count
  })), [
    { fromGroup: "Services", toGroup: "Store", count: 7 },
    { fromGroup: "Store", toGroup: "Services", count: 7 },
    { fromGroup: "Tools", toGroup: "Services", count: 3 },
    { fromGroup: "Mcp", toGroup: "Tools", count: 2 },
    { fromGroup: "Sandbox", toGroup: "Tools", count: 2 }
  ]);
});

function dependency(fromGroup: string, toGroup: string, count: number): CollapsedCycleDependency {
  return {
    fromGroup,
    toGroup,
    count,
    samples: [sample(`src/${fromGroup}.ts`, `../${toGroup}`, `src/${toGroup}.ts`)]
  };
}
