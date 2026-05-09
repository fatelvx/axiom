import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import type { AxiomModule } from "../axi/types.js";
import { createOwnershipIndex } from "./ownership.js";

const root = path.resolve("repo");

test("ownership matches files inside a module path", () => {
  const simulation = moduleOf("Simulation", ["src/simulation/**"]);
  const ownership = createOwnershipIndex(root, [simulation]);

  assert.equal(ownership.findModule(path.join(root, "src/simulation/step.ts"))?.name, "Simulation");
  assert.equal(ownership.findModule(path.join(root, "src/simulation/nested/step.ts"))?.name, "Simulation");
});

test("ownership does not match sibling path prefixes", () => {
  const simulation = moduleOf("Simulation", ["src/simulation/**"]);
  const ownership = createOwnershipIndex(root, [simulation]);

  assert.equal(ownership.findModule(path.join(root, "src/simulationx/step.ts")), undefined);
});

test("ownership returns undefined for unowned files", () => {
  const simulation = moduleOf("Simulation", ["src/simulation/**"]);
  const ownership = createOwnershipIndex(root, [simulation]);

  assert.equal(ownership.findModule(path.join(root, "src/tools/build.ts")), undefined);
});

test("ownership findModule returns undefined for ambiguous overlapping module paths", () => {
  const app = moduleOf("App", ["src/**"]);
  const simulation = moduleOf("Simulation", ["src/simulation/**"]);
  const ownership = createOwnershipIndex(root, [app, simulation]);

  assert.equal(ownership.findModule(path.join(root, "src/simulation/step.ts")), undefined);
});

test("ownership findModules returns all owners for ambiguous overlapping module paths", () => {
  const app = moduleOf("App", ["src/**"]);
  const simulation = moduleOf("Simulation", ["src/simulation/**"]);
  const ownership = createOwnershipIndex(root, [app, simulation]);
  const owners = ownership.findModules(path.join(root, "src/simulation/step.ts"));

  assert.deepEqual(owners.map((owner) => owner.name), ["App", "Simulation"]);
});

test("ownership supports multiple paths for one module", () => {
  const shared = moduleOf("Shared", ["src/shared/**", "packages/shared/**"]);
  const ownership = createOwnershipIndex(root, [shared]);

  assert.equal(ownership.findModule(path.join(root, "src/shared/id.ts"))?.name, "Shared");
  assert.equal(ownership.findModule(path.join(root, "packages/shared/id.ts"))?.name, "Shared");
});

function moduleOf(name: string, paths: string[]): AxiomModule {
  return {
    name,
    location: { filePath: "axiom/main.axi", line: 1 },
    paths,
    pathLocations: paths.map((_, index) => ({ filePath: "axiom/main.axi", line: index + 2 })),
    depends: [],
    forbidsModules: [],
    exposes: [],
    hides: [],
    forbidsCapabilities: [],
    requires: []
  };
}
