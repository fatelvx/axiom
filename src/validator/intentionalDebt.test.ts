import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import type { AxiomModule, AxiomSpec, SourceLocation, SuppressionRule, Violation } from "../axi/types.js";
import {
  applySuppressions,
  findExpiringSuppressions,
  findUnusedSuppressions,
  validateSuppressionRules
} from "./intentionalDebt.js";

test("intentional debt applies only to matching path-scoped violation locations", () => {
  const root = path.join("repo");
  const spec = specWithSuppressions(root, [
    suppression(root, "hidden_reexport", "Services", 4, {
      pathScope: "src/services/index.ts",
      reason: "legacy index barrel cleanup"
    })
  ]);
  const indexLeak = hiddenReexportViolation(root, "src/services/index.ts", 1);
  const publicLeak = hiddenReexportViolation(root, "src/services/public.ts", 1);

  const result = applySuppressions(spec, [indexLeak, publicLeak], { root, today: "2026-01-01" });

  assert.deepEqual(result.violations, [publicLeak]);
  assert.deepEqual(result.suppressedViolations, [
    {
      violation: indexLeak,
      suppression: {
        fromModule: "Services",
        toModule: "Services",
        code: "hidden_reexport",
        pathScope: "src/services/index.ts",
        expiresOn: "2099-01-01",
        reason: "legacy index barrel cleanup",
        location: loc(root, "axiom/main.axi", 4)
      }
    }
  ]);
});

test("intentional debt validation reports unsupported, unknown, invalid, and expired entries", () => {
  const root = path.join("repo");
  const spec = specWithSuppressions(root, [
    suppression(root, "dynamic_dependency_expression", "Services", 4),
    suppression(root, "hidden_reexport", "Missing", 5),
    suppression(root, "hidden_reexport", "Services", 6, { expiresOn: "not-a-date", reason: "" }),
    suppression(root, "hidden_reexport", "Services", 7, { expiresOn: "2020-01-01" })
  ]);

  const violations = validateSuppressionRules(spec, { today: "2026-01-01" });

  assert.deepEqual(
    violations.map((violation) => violation.code),
    ["invalid_suppression", "unknown_module", "invalid_suppression", "expired_suppression"]
  );
  assert.deepEqual(violations[0]?.details?.suppressibleCodes, [
    "forbidden_dependency",
    "hidden_import",
    "hidden_reexport",
    "layer_breach",
    "undeclared_dependency",
    "unexposed_import"
  ]);
});

test("expired intentional debt does not hide the current hard violation", () => {
  const root = path.join("repo");
  const spec = specWithSuppressions(root, [
    suppression(root, "hidden_reexport", "Services", 4, { expiresOn: "2020-01-01" })
  ]);
  const violation = hiddenReexportViolation(root, "src/services/index.ts", 1);

  assert.deepEqual(applySuppressions(spec, [violation], { root, today: "2026-01-01" }), {
    violations: [violation],
    suppressedViolations: []
  });
});

test("intentional debt reports expiring and unused entries as visible warnings", () => {
  const root = path.join("repo");
  const spec = specWithSuppressions(root, [
    suppression(root, "forbidden_dependency", "Rendering", 4, {
      expiresOn: "2099-01-01",
      reason: "legacy renderer migration"
    })
  ], "Simulation");
  const violation: Violation = {
    code: "forbidden_dependency",
    message: "Simulation imports forbidden module Rendering.",
    location: loc(root, "src/simulation/step.ts", 1),
    details: {
      fromModule: "Simulation",
      toModule: "Rendering"
    }
  };
  const applied = applySuppressions(spec, [violation], { root, today: "2098-12-15" });

  assert.equal(
    findExpiringSuppressions(applied.suppressedViolations, { today: "2098-12-15" })[0]?.message,
    "Simulation has an intentional violation to Rendering that expires in 17 days."
  );
  assert.deepEqual(findUnusedSuppressions(spec, [], { today: "2026-01-01" }), [
    {
      code: "unused_suppression",
      message: "Simulation has an unused intentional violation for Rendering.",
      location: loc(root, "axiom/main.axi", 4),
      details: {
        module: "Simulation",
        target: "Rendering",
        suppressedCode: "forbidden_dependency",
        expiresOn: "2099-01-01",
        reason: "legacy renderer migration",
        rule: "Simulation accepts forbidden_dependency to Rendering until 2099-01-01",
        ruleLocation: loc(root, "axiom/main.axi", 4),
        suggestion:
          "Remove the intentional violation if the architecture debt is gone, or keep it only while a matching violation is expected."
      }
    }
  ]);
});

function specWithSuppressions(
  root: string,
  suppressions: SuppressionRule[],
  owner: "Services" | "Simulation" = "Services"
): AxiomSpec {
  return {
    modules: [
      moduleRef(root, "Services", ["src/services/**"], 1, owner === "Services" ? suppressions : []),
      moduleRef(root, "Simulation", ["src/simulation/**"], 10, owner === "Simulation" ? suppressions : []),
      moduleRef(root, "Rendering", ["src/rendering/**"], 20)
    ],
    layerOrders: []
  };
}

function moduleRef(
  root: string,
  name: string,
  paths: string[],
  line: number,
  suppressions: SuppressionRule[] = []
): AxiomModule {
  return {
    name,
    location: loc(root, "axiom/main.axi", line),
    paths,
    pathLocations: paths.map((_, index) => loc(root, "axiom/main.axi", line + index + 1)),
    depends: [],
    forbidsModules: [],
    exposes: [],
    hides: [],
    suppressions,
    forbidsCapabilities: [],
    requires: []
  };
}

function suppression(
  root: string,
  code: string,
  target: string,
  line: number,
  options: {
    pathScope?: string;
    expiresOn?: string;
    reason?: string;
  } = {}
): SuppressionRule {
  return {
    code,
    target: {
      name: target,
      location: loc(root, "axiom/main.axi", line)
    },
    ...(options.pathScope
      ? {
          pathScope: {
            pattern: options.pathScope,
            location: loc(root, "axiom/main.axi", line)
          }
        }
      : {}),
    expiresOn: options.expiresOn ?? "2099-01-01",
    reason: options.reason ?? "legacy migration",
    location: loc(root, "axiom/main.axi", line)
  };
}

function hiddenReexportViolation(root: string, relativeFilePath: string, line: number): Violation {
  return {
    code: "hidden_reexport",
    message: "Services re-exports a hidden path through an exposed file.",
    location: loc(root, relativeFilePath, line),
    details: {
      fromModule: "Services",
      toModule: "Services"
    }
  };
}

function loc(root: string, relativeFilePath: string, line: number): SourceLocation {
  return {
    filePath: path.join(root, relativeFilePath),
    line
  };
}
