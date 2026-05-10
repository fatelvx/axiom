import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { checkJsonSchemaVersion, toCheckJson } from "./json.js";
import { runCheck } from "../validator/check.js";

const repoRoot = process.cwd();

test("check JSON uses the stable v3 top-level shape", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/basic-ts-valid") });
  const payload = toCheckJson(result);

  assert.deepEqual(Object.keys(payload), [
    "schemaVersion",
    "ok",
    "root",
    "summary",
    "specFiles",
    "sourceFiles",
    "modules",
    "observedDependencies",
    "violations",
    "suppressedViolations",
    "warnings"
  ]);
  assert.equal(payload.schemaVersion, checkJsonSchemaVersion);
  assert.equal(payload.ok, true);
  assert.deepEqual(payload.summary, {
    modules: 3,
    specFiles: 1,
    sourceFiles: 3,
    importsScanned: 1,
    observedDependencies: 1,
    violations: 0,
    suppressedViolations: 0,
    warnings: 0
  });
  assert.deepEqual(payload.specFiles, ["axiom/main.axi"]);
  assert.deepEqual(payload.sourceFiles, [
    "src/physics/math.ts",
    "src/rendering/draw.ts",
    "src/simulation/step.ts"
  ]);
  assert.deepEqual(payload.modules[2], {
    name: "Simulation",
    paths: ["src/simulation/**"],
    layer: "Core",
    depends: ["Physics"],
    exposes: [],
    hides: [],
    forbidsModules: ["Rendering"],
    suppressions: [],
    location: {
      filePath: "axiom/main.axi",
      line: 9
    }
  });
  assert.deepEqual(payload.observedDependencies[0], {
    fromModule: "Simulation",
    toModule: "Physics",
    import: {
      filePath: "src/simulation/step.ts",
      line: 1,
      specifier: "../physics/math",
      resolvedPath: "src/physics/math.ts"
    }
  });
});

test("check JSON normalizes violations and nested locations", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/layer-breach") });
  const payload = toCheckJson(result);

  assert.equal(payload.ok, false);
  assert.equal(payload.summary.violations, 1);
  assert.deepEqual(payload.violations[0], {
    code: "layer_breach",
    message: "Simulation in layer Core imports Rendering in outer layer UI.",
    location: {
      filePath: "src/simulation/step.ts",
      line: 1
    },
    details: {
      fromModule: "Simulation",
      toModule: "Rendering",
      fromLayer: "Core",
      toLayer: "UI",
      specifier: "../rendering/draw",
      observed: "Simulation -> Rendering",
      rule: "layers Core -> UI",
      ruleLocation: {
        filePath: "axiom/main.axi",
        line: 1
      },
      suggestion: "Move the dependency inward, invert the dependency, or change the layer declarations."
    }
  });
});

test("check JSON exposes planned suppressions and suppressed violations", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/suppressed-dependency") });
  const payload = toCheckJson(result);

  assert.equal(payload.ok, true);
  assert.equal(payload.summary.violations, 0);
  assert.equal(payload.summary.suppressedViolations, 1);
  assert.deepEqual(payload.modules[1]?.suppressions, [
    {
      code: "forbidden_dependency",
      toModule: "Rendering",
      expiresOn: "2099-01-01",
      reason: "legacy renderer migration",
      location: {
        filePath: "axiom/main.axi",
        line: 7
      }
    }
  ]);
  assert.deepEqual(payload.suppressedViolations[0], {
    code: "forbidden_dependency",
    message: "Simulation imports forbidden module Rendering.",
    location: {
      filePath: "src/simulation/step.ts",
      line: 1
    },
    details: {
      fromModule: "Simulation",
      toModule: "Rendering",
      specifier: "../rendering/draw",
      observed: "Simulation -> Rendering",
      rule: "Simulation forbids module Rendering",
      ruleLocation: {
        filePath: "axiom/main.axi",
        line: 6
      },
      suggestion:
        "Remove the import, move the shared code to an allowed module, or change the forbidden rule only if this dependency is intentional."
    },
    suppression: {
      fromModule: "Simulation",
      toModule: "Rendering",
      code: "forbidden_dependency",
      expiresOn: "2099-01-01",
      reason: "legacy renderer migration",
      location: {
        filePath: "axiom/main.axi",
        line: 7
      }
    }
  });
});
