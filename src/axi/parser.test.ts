import assert from "node:assert/strict";
import test from "node:test";
import { parseAxiomText } from "./parser.js";

test("parses module path dependencies and forbidden modules", () => {
  const result = parseAxiomText(
    "main.axi",
    `
module Simulation
path "src/simulation/**"
layer Core
depends Physics
forbids module Rendering
purpose "deterministic physics simulation"
`
  );

  assert.deepEqual(result.violations, []);
  assert.equal(result.modules.length, 1);

  const simulation = result.modules[0];
  assert.equal(simulation?.name, "Simulation");
  assert.deepEqual(simulation?.paths, ["src/simulation/**"]);
  assert.equal(simulation?.layer, "Core");
  assert.equal(simulation?.depends[0]?.name, "Physics");
  assert.equal(simulation?.forbidsModules[0]?.name, "Rendering");
  assert.equal(simulation?.purpose, "deterministic physics simulation");
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
