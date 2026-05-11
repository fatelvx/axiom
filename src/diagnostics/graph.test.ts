import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { formatGraphMarkdown, formatGraphResult, graphJsonSchemaVersion, toGraphJson } from "./graph.js";
import { runCheck } from "../validator/check.js";

const repoRoot = process.cwd();

test("graph JSON exposes declared, forbidden, visibility, and observed edges", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/visibility-rules") });
  const payload = toGraphJson(result);

  assert.deepEqual(Object.keys(payload), [
    "schemaVersion",
    "root",
    "filters",
    "summary",
    "modules",
    "declaredDependencies",
    "forbiddenDependencies",
    "exposedPaths",
    "hiddenPaths",
    "observedDependencies",
    "violations",
    "warnings"
  ]);
  assert.equal(payload.schemaVersion, graphJsonSchemaVersion);
  assert.deepEqual(payload.filters, { violationsOnly: false, attention: false });
  assert.deepEqual(payload.summary, {
    modules: 2,
    declaredDependencies: 1,
    forbiddenDependencies: 0,
    exposedPaths: 1,
    hiddenPaths: 1,
    observedDependencies: 3,
    shownObservedDependencies: 3,
    violations: 2,
    intentionalViolations: 0,
    warnings: 0
  });
  assert.deepEqual(payload.declaredDependencies, [
    {
      fromModule: "UI",
      toModule: "Services",
      ruleLocation: {
        filePath: "axiom/main.axi",
        line: 3
      }
    }
  ]);
  assert.deepEqual(payload.exposedPaths, [
    {
      module: "Services",
      pattern: "src/services/index.ts",
      ruleLocation: {
        filePath: "axiom/main.axi",
        line: 7
      }
    }
  ]);
  assert.deepEqual(payload.hiddenPaths, [
    {
      module: "Services",
      pattern: "src/services/internal/**",
      ruleLocation: {
        filePath: "axiom/main.axi",
        line: 8
      }
    }
  ]);
  assert.deepEqual(
    payload.observedDependencies.map((edge) => `${edge.fromModule}->${edge.toModule}:${edge.import.line}`),
    ["UI->Services:1", "UI->Services:2", "UI->Services:3"]
  );
  assert.deepEqual(payload.observedDependencies.map((edge) => edge.violations.map((violation) => violation.code)), [
    [],
    ["unexposed_import"],
    ["hidden_import"]
  ]);
  assert.deepEqual(payload.observedDependencies.map((edge) => edge.intentionalViolations), [[], [], []]);
});

test("human graph output includes readable sections", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/basic-ts-invalid") });
  const payload = toGraphJson(result);
  const output = formatGraphResult(result);

  assert.equal(payload.modules.find((module) => module.name === "Simulation")?.purpose, "deterministic physics simulation");
  assert.match(output, /Axiom graph\./);
  assert.match(output, /modules:\n  Physics layer Core\n  Rendering layer UI\n  Simulation layer Core - deterministic physics simulation/);
  assert.match(output, /declared dependencies:\n  Simulation -> Physics \(axiom\/main\.axi:12\)/);
  assert.match(output, /forbidden dependencies:\n  Simulation -X-> Rendering \(axiom\/main\.axi:13\)/);
  assert.match(output, /observed dependencies:/);
  assert.match(output, /Simulation -> Physics via src\/simulation\/step\.ts:1 "\.\.\/physics\/math"/);
  assert.match(output, /Simulation -> Rendering via src\/simulation\/step\.ts:2 "\.\.\/rendering\/draw"/);
});

test("violations-only graph output focuses observed edges with diagnostics", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/visibility-rules") });
  const output = formatGraphResult(result, { violationsOnly: true });

  assert.match(output, /Axiom graph \(violations only\)\./);
  assert.match(output, /observed dependencies: 2 of 3/);
  assert.doesNotMatch(output, /src\/ui\/view\.ts:1 "\.\.\/services"/);
  assert.match(output, /src\/ui\/view\.ts:2 "\.\.\/services\/feature"/);
  assert.match(output, /unexposed_import: UI imports a non-exposed path from Services\./);
  assert.match(output, /fix: Import an exposed entry point from Services, or add an exposes rule for this public API\./);
  assert.match(output, /src\/ui\/view\.ts:3 "\.\.\/services\/internal\/secret"/);
  assert.match(output, /hidden_import: UI imports hidden path from Services\./);
  assert.match(output, /other violations:\n  none/);
  assert.match(output, /warnings:\n  none/);
});

test("attention graph output uses awareness-oriented heading", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/visibility-rules") });
  const output = formatGraphResult(result, { violationsOnly: true, attention: true });

  assert.match(output, /Axiom graph \(attention\)\./);
  assert.match(output, /observed dependencies: 2 of 3/);
});

test("violations-only graph JSON filters observed dependencies but keeps total counts", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/visibility-rules") });
  const payload = toGraphJson(result, { violationsOnly: true });

  assert.deepEqual(payload.filters, { violationsOnly: true, attention: false });
  assert.equal(payload.summary.observedDependencies, 3);
  assert.equal(payload.summary.shownObservedDependencies, 2);
  assert.deepEqual(
    payload.observedDependencies.map((edge) => `${edge.import.line}:${edge.violations[0]?.code}`),
    ["2:unexposed_import", "3:hidden_import"]
  );
});

test("attention graph JSON marks the attention filter", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/visibility-rules") });
  const payload = toGraphJson(result, { violationsOnly: true, attention: true });

  assert.deepEqual(payload.filters, { violationsOnly: true, attention: true });
  assert.equal(payload.summary.shownObservedDependencies, 2);
});

test("graph JSON exposes baseline-aware observed edge drift", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/basic-ts-invalid") });
  const payload = toGraphJson(result, {
    violationsOnly: true,
    attention: true,
    baseline: {
      path: "fixtures/baseline-drift/basic-valid.graph.json",
      schemaVersion: "axiom.graph.v7",
      observedDependencies: [
        {
          fromModule: "Rendering",
          toModule: "Physics",
          import: {
            filePath: "src/rendering/draw.ts",
            line: 1,
            specifier: "../physics/math",
            resolvedPath: "src/physics/math.ts"
          }
        },
        {
          fromModule: "Simulation",
          toModule: "Physics",
          import: {
            filePath: "src/simulation/step.ts",
            line: 1,
            specifier: "../physics/math",
            resolvedPath: "src/physics/math.ts"
          }
        }
      ]
    }
  });

  assert.equal(payload.drift?.kind, "advisory_observed_edge_drift");
  assert.equal(payload.drift?.baseline.observedDependencies, 2);
  assert.deepEqual(
    payload.drift?.newObservedEdges.map((edge) => `${edge.fromModule}->${edge.toModule}`),
    ["Simulation->Rendering"]
  );
  assert.deepEqual(payload.drift?.newObservedEdges[0]?.violations.map((violation) => violation.code), [
    "forbidden_dependency"
  ]);
  assert.deepEqual(payload.drift?.newObservedEdges[0]?.imports[0], {
    filePath: "src/simulation/step.ts",
    line: 2,
    specifier: "../rendering/draw",
    resolvedPath: "src/rendering/draw.ts"
  });
  assert.deepEqual(
    payload.drift?.removedObservedEdges.map((edge) => `${edge.fromModule}->${edge.toModule}`),
    ["Rendering->Physics"]
  );
});

test("attention graph output includes baseline drift", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/basic-ts-invalid") });
  const output = formatGraphResult(result, {
    violationsOnly: true,
    attention: true,
    baseline: {
      path: "fixtures/baseline-drift/basic-valid.graph.json",
      schemaVersion: "axiom.graph.v7",
      observedDependencies: [
        {
          fromModule: "Simulation",
          toModule: "Physics",
          import: {
            filePath: "src/simulation/step.ts",
            line: 1,
            specifier: "../physics/math",
            resolvedPath: "src/physics/math.ts"
          }
        }
      ]
    }
  });

  assert.match(output, /drift: 1 new observed edge, 0 removed observed edges/);
  assert.match(output, /architecture drift \(advisory\):/);
  assert.match(output, /baseline: fixtures\/baseline-drift\/basic-valid\.graph\.json \(1 observed dependencies, axiom\.graph\.v7\)/);
  assert.match(output, /new observed edges:\n    Simulation -> Rendering \[forbidden_dependency\]/);
  assert.match(output, /via src\/simulation\/step\.ts:2 "\.\.\/rendering\/draw"/);
  assert.match(output, /forbidden_dependency: Simulation imports forbidden module Rendering\./);
  assert.match(output, /removed observed edges:\n    none/);
});

test("markdown graph output summarizes reviewable architecture signals", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/basic-ts-invalid") });
  const output = formatGraphMarkdown(result, {
    violationsOnly: true,
    attention: true,
    observe: true,
    baseline: {
      path: "fixtures/baseline-drift/basic-valid.graph.json",
      schemaVersion: "axiom.graph.v7",
      observedDependencies: [
        {
          fromModule: "Simulation",
          toModule: "Physics",
          import: {
            filePath: "src/simulation/step.ts",
            line: 1,
            specifier: "../physics/math",
            resolvedPath: "src/physics/math.ts"
          }
        }
      ]
    }
  });

  assert.match(output, /## Axiom Architecture Review/);
  assert.match(output, /Status: failing contract/);
  assert.match(output, /Review mode: observe \(advisory\)/);
  assert.match(output, /- Observed dependencies: 1 of 2/);
  assert.match(output, /### Hard Violations/);
  assert.match(output, /`Simulation -> Rendering` via `src\/simulation\/step\.ts:2` importing `\.\.\/rendering\/draw`/);
  assert.match(output, /`forbidden_dependency`: Simulation imports forbidden module Rendering\./);
  assert.match(output, /### Visible Intentional Debt/);
  assert.match(output, /- None/);
  assert.match(output, /### Architecture Drift \(Advisory\)/);
  assert.match(output, /`advisory_observed_edge_drift`/);
  assert.match(output, /- New observed edges:\n  - `Simulation -> Rendering` \(`forbidden_dependency`\)/);
});

test("violations-only graph output includes intentional dependency debt", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/suppressed-dependency") });
  const output = formatGraphResult(result, { violationsOnly: true });

  assert.match(output, /violations: 0/);
  assert.match(output, /intentional violations: 1/);
  assert.match(output, /Simulation -> Rendering via src\/simulation\/step\.ts:1 "\.\.\/rendering\/draw"/);
  assert.match(output, /intentional violation forbidden_dependency: Simulation imports forbidden module Rendering\./);
  assert.match(output, /contract: accepted until 2099-01-01 \(axiom\/main\.axi:7\)/);
  assert.match(output, /reason: legacy renderer migration/);
});

test("violations-only graph output includes warning guardrails", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/unused-suppression") });
  const output = formatGraphResult(result, { violationsOnly: true });

  assert.match(output, /violations: 0/);
  assert.match(output, /warnings: 1/);
  assert.match(output, /violating dependencies:\n  none/);
  assert.match(output, /warnings:\n  unused_suppression axiom\/main\.axi:7: Simulation has an unused intentional violation for Rendering\./);
  assert.match(output, /rule: Simulation accepts forbidden_dependency to Rendering until 2099-01-01 \(axiom\/main\.axi:7\)/);
  assert.match(output, /expires: 2099-01-01/);
  assert.match(output, /reason: legacy renderer migration/);
  assert.match(output, /fix: Remove the intentional violation if the architecture debt is gone/);
});

test("attention graph output explains coupling concentration warnings", () => {
  const result = runCheck({
    root: path.join(repoRoot, "fixtures/coupling-concentration"),
    warnCouplingConcentration: true
  });
  const output = formatGraphResult(result, { violationsOnly: true, attention: true });

  assert.match(output, /warnings: 1/);
  assert.match(output, /coupling_concentration: Hub has concentrated fan-in from 4 modules\./);
  assert.match(output, /observed: Hub fan-in from 4 modules/);
  assert.match(output, /threshold: fan-in >= 4 or fan-out >= 4/);
  assert.match(output, /fan-in modules: FeatureA, FeatureB, FeatureC, FeatureD/);
});

test("violations-only graph output includes non-edge surface violations", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/hidden-reexport") });
  const output = formatGraphResult(result, { violationsOnly: true });

  assert.match(output, /violating dependencies:\n  none/);
  assert.match(output, /other violations:\n  hidden_reexport src\/services\/index\.ts:1/);
  assert.match(output, /Services re-exports a hidden path through an exposed file\./);
});

test("graph JSON exposes warning details for agent review", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/unused-suppression") });
  const payload = toGraphJson(result, { violationsOnly: true });

  assert.equal(payload.schemaVersion, graphJsonSchemaVersion);
  assert.deepEqual(payload.warnings[0]?.details, {
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
  });
});
