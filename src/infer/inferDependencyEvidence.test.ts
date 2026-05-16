import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import type { ImportRecord } from "../axi/types.js";
import { buildCandidateEdges, buildObservedDependencies, type CandidateEdge } from "./inferDependencyEvidence.js";

test("candidate dependency evidence aggregates owned cross-group imports with capped samples", () => {
  const root = path.resolve("tmp/infer-dependency-evidence");
  const uiFile = path.join(root, "src/ui/panel.ts");
  const servicesFile = path.join(root, "src/services/api.ts");
  const storeFile = path.join(root, "src/store/state.ts");
  const unownedFile = path.join(root, "src/legacy/sidecar.ts");
  const fileOwners = new Map([
    [uiFile, "ui"],
    [servicesFile, "services"],
    [storeFile, "store"]
  ]);

  const imports: ImportRecord[] = [
    record(uiFile, "../services/api", servicesFile, 1),
    record(uiFile, "../services/api", servicesFile, 2),
    record(uiFile, "../services/api", servicesFile, 3),
    record(uiFile, "../services/api", servicesFile, 4),
    record(uiFile, "../services/api", servicesFile, 5),
    record(uiFile, "../services/api", servicesFile, 6),
    record(storeFile, "../services/api", servicesFile, 7),
    record(uiFile, "../ui/local", uiFile, 8),
    record(unownedFile, "../services/api", servicesFile, 9),
    { filePath: uiFile, line: 10, kind: "import", specifier: "../generated/missing" }
  ];

  const edges = buildCandidateEdges(root, imports, fileOwners);

  assert.deepEqual(edges.map((edge) => ({
    from: edge.from,
    to: edge.to,
    count: edge.count
  })), [
    { from: "store", to: "services", count: 1 },
    { from: "ui", to: "services", count: 6 }
  ]);
  assert.equal(edges[1]?.samples.length, 5);
  assert.deepEqual(edges[1]?.samples[0], {
    filePath: "src/ui/panel.ts",
    line: 1,
    specifier: "../services/api",
    resolvedPath: "src/services/api.ts"
  });
});

test("observed dependency evidence merges collapsed component edges without leaking internal cycles", () => {
  const root = path.resolve("tmp/infer-observed-dependencies");
  const candidateEdges: CandidateEdge[] = [
    edge("services/agent", "store", 3, "src/services/agent.ts", "../store/state", "src/store/state.ts"),
    edge("services/tools", "store", 4, "src/services/tools.ts", "../store/state", "src/store/state.ts"),
    edge("services/agent", "services/tools", 2, "src/services/agent.ts", "../tools", "src/services/tools.ts"),
    edge("store", "ui", 1, "src/store/state.ts", "../ui/panel", "src/ui/panel.ts")
  ];
  const components = [
    { id: 1, name: "ServicesCycle" },
    { id: 2, name: "Store" },
    { id: 3, name: "Ui" }
  ];
  const keyToComponent = new Map([
    ["services/agent", components[0]],
    ["services/tools", components[0]],
    ["store", components[1]],
    ["ui", components[2]]
  ]);

  const dependencies = buildObservedDependencies(root, candidateEdges, keyToComponent, components);

  assert.deepEqual(dependencies.map((dependency) => ({
    fromModule: dependency.fromModule,
    toModule: dependency.toModule,
    count: dependency.count,
    samples: dependency.samples.length
  })), [
    { fromModule: "ServicesCycle", toModule: "Store", count: 7, samples: 2 },
    { fromModule: "Store", toModule: "Ui", count: 1, samples: 1 }
  ]);
  assert.deepEqual(dependencies[0]?.samples[0], {
    filePath: "src/services/agent.ts",
    line: 1,
    specifier: "../store/state",
    resolvedPath: "src/store/state.ts"
  });
});

function record(
  filePath: string,
  specifier: string,
  resolvedPath: string,
  line: number
): ImportRecord {
  return {
    filePath,
    line,
    kind: "import",
    specifier,
    resolvedPath
  };
}

function edge(
  from: string,
  to: string,
  count: number,
  filePath: string,
  specifier: string,
  resolvedPath: string
): CandidateEdge {
  return {
    from,
    to,
    count,
    samples: [
      {
        filePath,
        line: 1,
        specifier,
        resolvedPath
      }
    ]
  };
}
