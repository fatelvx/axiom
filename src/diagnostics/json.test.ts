import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { checkJsonSchemaVersion, toCheckJson } from "./json.js";
import { runCheck } from "../validator/check.js";

const repoRoot = process.cwd();

test("check JSON uses the stable v4 top-level shape", () => {
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
    "intentionalViolations",
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
    intentionalViolations: 0,
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
    purpose: "deterministic physics simulation",
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

test("check JSON exposes accepted intentional violations", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/suppressed-dependency") });
  const payload = toCheckJson(result);

  assert.equal(payload.ok, true);
  assert.equal(payload.summary.violations, 0);
  assert.equal(payload.summary.intentionalViolations, 1);
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
  assert.deepEqual(payload.intentionalViolations[0], {
    code: "forbidden_dependency",
    kind: "intentional_violation",
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
    contract: {
      fromModule: "Simulation",
      toModule: "Rendering",
      code: "forbidden_dependency",
      acceptedUntil: "2099-01-01",
      reason: "legacy renderer migration",
      location: {
        filePath: "axiom/main.axi",
        line: 7
      }
    }
  });
});

test("check JSON exposes path-scoped intentional violation contracts", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/accepted-hidden-reexport-scoped") });
  const payload = toCheckJson(result);

  assert.equal(payload.summary.violations, 1);
  assert.equal(payload.summary.intentionalViolations, 1);
  assert.deepEqual(payload.modules[0]?.suppressions[0], {
    code: "hidden_reexport",
    toModule: "Services",
    pathScope: "src/services/index.ts",
    expiresOn: "2099-01-01",
    reason: "legacy index barrel cleanup",
    location: {
      filePath: "axiom/main.axi",
      line: 6
    }
  });
  assert.equal(payload.intentionalViolations[0]?.contract.pathScope, "src/services/index.ts");
});

test("check JSON exposes expiring intentional violations as warnings", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/suppressed-dependency"), today: "2098-12-15" });
  const payload = toCheckJson(result);

  assert.equal(payload.ok, true);
  assert.equal(payload.summary.violations, 0);
  assert.equal(payload.summary.intentionalViolations, 1);
  assert.equal(payload.summary.warnings, 1);
  assert.deepEqual(payload.warnings[0], {
    code: "expiring_suppression",
    message: "Simulation has an intentional violation to Rendering that expires in 17 days.",
    location: {
      filePath: "axiom/main.axi",
      line: 7
    },
    details: {
      module: "Simulation",
      target: "Rendering",
      suppressedCode: "forbidden_dependency",
      expiresOn: "2099-01-01",
      daysUntilExpiration: 17,
      reason: "legacy renderer migration",
      rule: "Simulation accepts forbidden_dependency to Rendering until 2099-01-01",
      ruleLocation: {
        filePath: "axiom/main.axi",
        line: 7
      },
      suggestion:
        "Review this intentional violation before it expires; remove it if the debt is fixed, or extend it with a fresh reason if the debt remains."
    }
  });
});

test("check JSON exposes unused suppressions as warnings", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/unused-suppression") });
  const payload = toCheckJson(result);

  assert.equal(payload.ok, true);
  assert.equal(payload.summary.violations, 0);
  assert.equal(payload.summary.warnings, 1);
  assert.deepEqual(payload.warnings[0], {
    code: "unused_suppression",
    message: "Simulation has an unused intentional violation for Rendering.",
    location: {
      filePath: "axiom/main.axi",
      line: 7
    },
    details: {
      module: "Simulation",
      target: "Rendering",
      suppressedCode: "forbidden_dependency",
      expiresOn: "2099-01-01",
      reason: "legacy renderer migration",
      rule: "Simulation accepts forbidden_dependency to Rendering until 2099-01-01",
      ruleLocation: {
        filePath: "axiom/main.axi",
        line: 7
      },
      suggestion:
        "Remove the intentional violation if the architecture debt is gone, or keep it only while a matching violation is expected."
    }
  });
});
