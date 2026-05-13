import assert from "node:assert/strict";
import test from "node:test";
import { parseAxiomText } from "./parser.js";

test("parses module path dependencies and forbidden modules", () => {
  const result = parseAxiomText(
    "main.axi",
    `
module Simulation
path "src/simulation/**"
path "packages/simulation/src/**"
layer Core
depends on Physics
exposes "src/simulation/index.ts"
hides "src/simulation/internal/**"
forbids module Rendering
purpose "deterministic physics simulation"
`
  );

  assert.deepEqual(result.violations, []);
  assert.equal(result.modules.length, 1);

  const simulation = result.modules[0];
  assert.equal(simulation?.name, "Simulation");
  assert.deepEqual(simulation?.paths, ["src/simulation/**", "packages/simulation/src/**"]);
  assert.equal(simulation?.layer, "Core");
  assert.equal(simulation?.depends[0]?.name, "Physics");
  assert.equal(simulation?.exposes[0]?.pattern, "src/simulation/index.ts");
  assert.equal(simulation?.hides[0]?.pattern, "src/simulation/internal/**");
  assert.equal(simulation?.forbidsModules[0]?.name, "Rendering");
  assert.equal(simulation?.purpose, "deterministic physics simulation");
});

test("parses legacy planned suppressions with expiration and reason", () => {
  const result = parseAxiomText(
    "main.axi",
    `
module Simulation
path "src/simulation/**"
suppresses forbidden_dependency to Rendering until 2099-01-01 because "legacy renderer migration"
`
  );

  assert.deepEqual(result.violations, []);
  assert.deepEqual(result.modules[0]?.suppressions[0], {
    code: "forbidden_dependency",
    target: {
      name: "Rendering",
      location: {
        filePath: "main.axi",
        line: 4
      }
    },
    expiresOn: "2099-01-01",
    reason: "legacy renderer migration",
    location: {
      filePath: "main.axi",
      line: 4
    }
  });
});

test("parses intentional violation accepts syntax", () => {
  const result = parseAxiomText(
    "main.axi",
    `
module Simulation
path "src/simulation/**"
accepts forbidden_dependency to Rendering until 2099-01-01 because "legacy renderer migration"
`
  );

  assert.deepEqual(result.violations, []);
  assert.equal(result.modules[0]?.suppressions[0]?.code, "forbidden_dependency");
  assert.equal(result.modules[0]?.suppressions[0]?.target.name, "Rendering");
  assert.equal(result.modules[0]?.suppressions[0]?.expiresOn, "2099-01-01");
  assert.equal(result.modules[0]?.suppressions[0]?.reason, "legacy renderer migration");
});

test("parses path-scoped intentional violation accepts syntax", () => {
  const result = parseAxiomText(
    "main.axi",
    `
module Services
path "src/services/**"
accepts hidden_reexport to Services at "src/services/index.ts" until 2099-01-01 because "legacy public barrel cleanup"
`
  );

  assert.deepEqual(result.violations, []);
  assert.deepEqual(result.modules[0]?.suppressions[0]?.pathScope, {
    pattern: "src/services/index.ts",
    location: {
      filePath: "main.axi",
      line: 4
    }
  });
});

test("parses layer order", () => {
  const result = parseAxiomText(
    "main.axi",
    `
layers Core -> UI

module Simulation
path "src/simulation/**"
layer Core
`
  );

  assert.deepEqual(result.violations, []);
  assert.deepEqual(result.layerOrders[0]?.layers.map((layer) => layer.name), ["Core", "UI"]);
});

test("reports invalid statements", () => {
  const result = parseAxiomText(
    "broken.axi",
    `
path "src/missing-module/**"
`
  );

  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0]?.code, "parse_error");
});
