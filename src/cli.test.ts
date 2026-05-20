import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const cliPath = path.join(repoRoot, "dist/cli.js");

const commandHelpExpectations: Array<[string, RegExp, RegExp]> = [
  ["check", /Usage:\n  axi check /, /Validate source dependencies against \.axi architecture specs/],
  ["graph", /Usage:\n  axi graph /, /Print declared and observed architecture graphs/],
  ["observe", /Usage:\n  axi observe /, /architecture attention surface/],
  ["diff", /Usage:\n  axi diff <baseline-json> /, /Compare current observed module edges/],
  ["infer", /Usage:\n  axi infer /, /starter \.axi contract inferred from current imports/]
];

for (const [command, usagePattern, purposePattern] of commandHelpExpectations) {
  test(`cli ${command} --help prints command help`, () => {
    const result = spawnSync(process.execPath, [cliPath, command, "--help"], {
      cwd: repoRoot,
      encoding: "utf8"
    });

    assert.equal(result.status, 0);
    assert.equal(result.stderr, "");
    assert.match(result.stdout, usagePattern);
    assert.match(result.stdout, purposePattern);
    assert.doesNotMatch(result.stdout, /Unknown option/);
  });
}

test("cli infer -h prints command help", () => {
  const result = spawnSync(process.execPath, [cliPath, "infer", "-h"], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Usage:\n  axi infer /);
  assert.doesNotMatch(result.stdout, /Unknown option/);
});

test("cli --json returns parseable success output", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "check", "--root", "fixtures/basic-ts-valid", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, "axiom.check.v4");
  assert.equal(payload.ok, true);
  assert.equal(payload.summary.violations, 0);
  assert.equal(payload.summary.warnings, 0);
  assert.equal(payload.summary.modules, 3);
  assert.equal(payload.violations.length, 0);
  assert.equal(payload.warnings.length, 0);
  assert.equal(payload.spec, undefined);
});

test("cli --json returns parseable violation output with non-zero exit", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "check", "--root", "fixtures/basic-ts-invalid", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 1);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, "axiom.check.v4");
  assert.equal(payload.ok, false);
  assert.equal(payload.summary.violations, 1);
  assert.equal(payload.violations[0].code, "forbidden_dependency");
  assert.equal(payload.violations[0].details.rule, "Simulation forbids module Rendering");
  assert.deepEqual(payload.violations[0].location, {
    filePath: "src/simulation/step.ts",
    line: 2
  });
});

test("cli check --warn-unowned reports warnings without failing", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "check", "--root", "fixtures/unowned-source", "--warn-unowned", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.summary.violations, 0);
  assert.equal(payload.summary.warnings, 1);
  assert.equal(payload.warnings[0].code, "unowned_source_file");
  assert.deepEqual(payload.warnings[0].location, {
    filePath: "src/loose/helper.ts",
    line: 1
  });
});

test("cli check --strict reports unowned source files as violations", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "check", "--root", "fixtures/unowned-source", "--strict", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 1);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, false);
  assert.equal(payload.summary.violations, 1);
  assert.equal(payload.violations[0].code, "unowned_source_file");
});

test("cli check --warn-public-api-surface reports advisory broad surface warnings", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "check", "--root", "fixtures/public-api-surface", "--warn-public-api-surface", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.summary.violations, 0);
  assert.equal(payload.summary.warnings, 1);
  assert.equal(payload.warnings[0].code, "broad_public_surface");
  assert.equal(payload.warnings[0].details.exportKind, "star");
});

test("cli observe --warn-coupling-concentration reports advisory coupling warnings", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "observe", "--root", "fixtures/coupling-concentration", "--warn-coupling-concentration", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, "axiom.graph.v12");
  assert.deepEqual(payload.filters, { violationsOnly: true, attention: true });
  assert.equal(payload.summary.violations, 0);
  assert.equal(payload.summary.warnings, 1);
  assert.equal(payload.warnings[0].code, "coupling_concentration");
  assert.equal(payload.warnings[0].details.module, "Hub");
  assert.equal(payload.warnings[0].details.fanInModules, 4);
  assert.deepEqual(payload.warnings[0].details.incomingModules, ["FeatureA", "FeatureB", "FeatureC", "FeatureD"]);
});

test("cli observe --warn-deep-internal-imports reports advisory deep import warnings", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "observe", "--root", "fixtures/deep-internal-import", "--warn-deep-internal-imports", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, "axiom.graph.v12");
  assert.equal(payload.summary.violations, 0);
  assert.equal(payload.summary.warnings, 1);
  assert.equal(payload.warnings[0].code, "deep_internal_import");
  assert.equal(payload.warnings[0].details.importedPath, "src/lib/internal/secret.ts");
  assert.deepEqual(payload.warnings[0].details.publicEntrypoints, ["src/lib/index.ts"]);
});

test("cli observe --warn-unresolved-imports reports advisory unresolved import warnings", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "observe", "--root", "fixtures/unresolved-import", "--warn-unresolved-imports", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, "axiom.graph.v12");
  assert.equal(payload.summary.violations, 0);
  assert.equal(payload.summary.warnings, 1);
  assert.equal(payload.warnings[0].code, "unresolved_import");
  assert.equal(payload.warnings[0].details.specifier, "./generated/runtime-token");
});

test("cli observe --warn-dynamic-imports reports advisory non-literal dependency expressions", () => {
  const root = mkdtempSync(path.join(tmpdir(), "axi-cli-dynamic-imports-"));

  try {
    mkdirSync(path.join(root, "axiom"), { recursive: true });
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(path.join(root, "axiom/main.axi"), ['module App', 'path "src/**"', ""].join("\n"));
    writeFileSync(
      path.join(root, "src/main.ts"),
      ["const route = 'settings';", "export const lazy = () => import(`./routes/${route}`);"].join("\n")
    );

    const result = spawnSync(process.execPath, [cliPath, "observe", "--root", root, "--warn-dynamic-imports", "--json"], {
      cwd: repoRoot,
      encoding: "utf8"
    });

    assert.equal(result.status, 0);

    const payload = JSON.parse(result.stdout);
    assert.equal(payload.schemaVersion, "axiom.graph.v12");
    assert.equal(payload.summary.violations, 0);
    assert.equal(payload.summary.warnings, 1);
    assert.equal(payload.warnings[0].code, "dynamic_dependency_expression");
    assert.equal(payload.warnings[0].details.dependencyKind, "import()");
    assert.equal(payload.warnings[0].details.expressionKind, "TemplateExpression");
    assert.equal(payload.warnings[0].details.expressionPreview, "`./routes/${route}`");

    const humanResult = spawnSync(process.execPath, [cliPath, "observe", "--root", root, "--warn-dynamic-imports"], {
      cwd: repoRoot,
      encoding: "utf8"
    });

    assert.equal(humanResult.status, 0);
    assert.match(humanResult.stdout, /dependency expression: import\(\) \(TemplateExpression\)/);
    assert.match(humanResult.stdout, /expression: `\.\/routes\/\$\{route\}`/);
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("cli observe --warn-large-files reports advisory intra-file pressure warnings", () => {
  const root = mkdtempSync(path.join(tmpdir(), "axi-cli-large-file-"));

  try {
    mkdirSync(path.join(root, "axiom"), { recursive: true });
    mkdirSync(path.join(root, "src"), { recursive: true });
    writeFileSync(path.join(root, "axiom/main.axi"), ['module App', 'path "src/**"', ""].join("\n"));
    writeFileSync(
      path.join(root, "src/main.ts"),
      Array.from({ length: 805 }, (_, index) => `export const value${index} = ${index};`).join("\n")
    );

    const result = spawnSync(process.execPath, [cliPath, "observe", "--root", root, "--warn-large-files", "--json"], {
      cwd: repoRoot,
      encoding: "utf8"
    });

    assert.equal(result.status, 0);

    const payload = JSON.parse(result.stdout);
    assert.equal(payload.schemaVersion, "axiom.graph.v12");
    assert.equal(payload.summary.violations, 0);
    assert.equal(payload.summary.warnings, 1);
    assert.equal(payload.warnings[0].code, "large_module_file");
    assert.equal(payload.warnings[0].details.lineCount, 805);
    assert.equal(payload.architectureSummary.reviewStory.pressures[0].title, "Intra-file responsibility pressure");
  } finally {
    rmSync(root, { force: true, recursive: true });
  }
});

test("cli graph returns graph output without acting as a validation gate", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "graph", "--root", "fixtures/visibility-rules"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Axiom graph\./);
  assert.match(result.stdout, /violations: 2/);
  assert.match(result.stdout, /UI -> Services via src\/ui\/view\.ts:1 "\.\.\/services"/);
});

test("cli graph --json returns parseable graph output", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "graph", "--root", "fixtures/visibility-rules", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, "axiom.graph.v12");
  assert.equal(payload.summary.observedDependencies, 3);
  assert.equal(payload.summary.shownObservedDependencies, 3);
  assert.equal(payload.violations[0].code, "unexposed_import");
});

test("cli graph --json --portable emits a shareable graph baseline", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "axiom-portable-baseline-"));
  const baselinePath = path.join(directory, "current.graph.json");

  try {
    const graph = spawnSync(
      process.execPath,
      [cliPath, "graph", "--root", "fixtures/basic-ts-valid", "--json", "--portable"],
      { cwd: repoRoot, encoding: "utf8" }
    );

    assert.equal(graph.status, 0, graph.stderr);
    const payload = JSON.parse(graph.stdout);
    assert.equal(payload.schemaVersion, "axiom.graph.v12");
    assert.equal(payload.root, ".");
    assert.deepEqual(payload.artifact, { kind: "graph_baseline", pathMode: "portable" });
    assert.equal(graph.stdout.includes(path.join(repoRoot, "fixtures/basic-ts-valid").replace(/\\/g, "/")), false);

    writeFileSync(baselinePath, graph.stdout, "utf8");

    const observe = spawnSync(
      process.execPath,
      [cliPath, "observe", "--root", "fixtures/basic-ts-valid", "--baseline", baselinePath, "--json"],
      { cwd: repoRoot, encoding: "utf8" }
    );
    assert.equal(observe.status, 0, observe.stderr);
    const observePayload = JSON.parse(observe.stdout);
    assert.equal(
      (observePayload.drift?.newObservedEdges?.length ?? 0) + (observePayload.drift?.removedObservedEdges?.length ?? 0),
      0
    );

    const diff = spawnSync(
      process.execPath,
      [cliPath, "diff", baselinePath, "--root", "fixtures/basic-ts-valid", "--json"],
      { cwd: repoRoot, encoding: "utf8" }
    );
    assert.equal(diff.status, 0, diff.stderr);
    const diffPayload = JSON.parse(diff.stdout);
    assert.equal((diffPayload.drift?.newObservedEdges?.length ?? 0) + (diffPayload.drift?.removedObservedEdges?.length ?? 0), 0);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("cli graph --violations-only filters observed dependency output", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "graph", "--root", "fixtures/visibility-rules", "--violations-only"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Axiom graph \(violations only\)\./);
  assert.match(result.stdout, /review mode: violations-only graph \(presentation filter\)/);
  assert.match(result.stdout, /shown dependency edges: 2/);
  assert.match(result.stdout, /full observed dependencies: 3/);
  assert.doesNotMatch(result.stdout, /src\/ui\/view\.ts:1 "\.\.\/services"/);
  assert.match(result.stdout, /src\/ui\/view\.ts:2 "\.\.\/services\/feature"/);
  assert.match(result.stdout, /src\/ui\/view\.ts:3 "\.\.\/services\/internal\/secret"/);
});

test("cli graph --attention aliases the focused architecture attention view", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "graph", "--root", "fixtures/visibility-rules", "--attention"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Axiom graph \(attention\)\./);
  assert.match(result.stdout, /model: declared \.axi intent vs observed source imports/);
  assert.match(result.stdout, /shown dependency edges: 2/);
  assert.match(result.stdout, /full observed dependencies: 3/);
  assert.doesNotMatch(result.stdout, /src\/ui\/view\.ts:1 "\.\.\/services"/);
});

test("cli graph --mermaid returns a visual observed dependency graph", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "graph", "--root", "fixtures/basic-ts-invalid", "--mermaid"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /%% Generated by axi graph --mermaid\./);
  assert.match(result.stdout, /flowchart TB/);
  assert.match(result.stdout, /Axiom graph legend/);
  assert.match(result.stdout, /module_Simulation -->\|1 import; forbidden_dependency\| module_Rendering/);
});

test("cli observe --mermaid keeps the attention filter", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "observe", "--root", "fixtures/visibility-rules", "--mermaid"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /%% Generated by axi observe --mermaid\./);
  assert.match(result.stdout, /shownDependencyEdges=2, fullObservedDependencies=3/);
  assert.match(result.stdout, /FILTERED observe view: 2 of 3 observed dependency edges shown<br\/>Clean observed dependencies are omitted/);
  assert.match(result.stdout, /module_UI -->\|2 imports; hidden_import, unexposed_import\| module_Services/);
});

test("cli observe shows the architecture attention surface", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "observe", "--root", "fixtures/visibility-rules"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Axiom observe\./);
  assert.match(result.stdout, /review mode: architecture attention \(advisory, exits 0\)/);
  assert.match(result.stdout, /gate: use axi check for CI failures; observe is for review and drift visibility/);
  assert.match(result.stdout, /shown dependency edges: 2/);
  assert.match(result.stdout, /full observed dependencies: 3/);
  assert.match(result.stdout, /violating dependencies:/);
  assert.doesNotMatch(result.stdout, /src\/ui\/view\.ts:1 "\.\.\/services"/);
});

test("cli graph --violations-only --json returns filtered graph output", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "graph", "--root", "fixtures/visibility-rules", "--violations-only", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, "axiom.graph.v12");
  assert.deepEqual(payload.filters, { violationsOnly: true, attention: false });
  assert.equal(payload.summary.observedDependencies, 3);
  assert.equal(payload.summary.shownObservedDependencies, 2);
  assert.equal(payload.allObservedDependencies.length, 3);
  assert.equal(payload.shownObservedDependencies.length, 2);
  assert.deepEqual(payload.observedDependencies, payload.shownObservedDependencies);
  assert.deepEqual(
    payload.observedDependencies.map((edge: { violations: Array<{ code: string }> }) => edge.violations[0]?.code),
    ["unexposed_import", "hidden_import"]
  );
});

test("cli graph --attention --json marks the attention filter", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "graph", "--root", "fixtures/visibility-rules", "--attention", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, "axiom.graph.v12");
  assert.deepEqual(payload.filters, { violationsOnly: true, attention: true });
  assert.equal(payload.summary.shownObservedDependencies, 2);
  assert.equal(payload.allObservedDependencies.length, 3);
  assert.equal(payload.shownObservedDependencies.length, 2);
});

test("cli observe --json marks the attention filter", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "observe", "--root", "fixtures/visibility-rules", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, "axiom.graph.v12");
  assert.deepEqual(payload.filters, { violationsOnly: true, attention: true });
  assert.equal(payload.summary.shownObservedDependencies, 2);
});

test("cli observe --baseline reports observed edge drift without failing", () => {
  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "observe",
      "--root",
      "fixtures/basic-ts-invalid",
      "--baseline",
      "fixtures/baseline-drift/basic-valid.graph.json",
      "--json"
    ],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, "axiom.graph.v12");
  assert.equal(payload.drift.kind, "advisory_observed_edge_drift");
  assert.deepEqual(
    payload.drift.newObservedEdges.map((edge: { fromModule: string; toModule: string }) => `${edge.fromModule}->${edge.toModule}`),
    ["Simulation->Rendering"]
  );
  assert.deepEqual(
    payload.drift.removedObservedEdges.map((edge: { fromModule: string; toModule: string }) => `${edge.fromModule}->${edge.toModule}`),
    ["Rendering->Physics"]
  );
  assert.deepEqual(payload.drift.newObservedEdges[0].violations.map((violation: { code: string }) => violation.code), [
    "forbidden_dependency"
  ]);
});

test("cli observe --baseline --markdown prints a PR-friendly review without failing", () => {
  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "observe",
      "--root",
      "fixtures/basic-ts-invalid",
      "--baseline",
      "fixtures/baseline-drift/basic-valid.graph.json",
      "--markdown"
    ],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /## Axiom Architecture Review/);
  assert.match(result.stdout, /Status: failing contract/);
  assert.match(result.stdout, /Review mode: observe \(advisory\)/);
  assert.match(result.stdout, /### Hard Violations/);
  assert.match(result.stdout, /`Simulation -> Rendering` via `src\/simulation\/step\.ts:2` importing `\.\.\/rendering\/draw`/);
  assert.match(result.stdout, /### Architecture Drift \(Advisory\)/);
  assert.match(result.stdout, /`advisory_observed_edge_drift`/);
});

test("cli diff reports observed edge drift without acting as a gate", () => {
  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "diff",
      "fixtures/baseline-drift/basic-valid.graph.json",
      "--root",
      "fixtures/basic-ts-invalid"
    ],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Axiom diff\./);
  assert.match(result.stdout, /review mode: baseline drift \(advisory, exits 0\)/);
  assert.match(result.stdout, /drift: 1 new observed edge, 1 removed observed edge/);
  assert.match(result.stdout, /new observed edges:\n    Simulation -> Rendering \[forbidden_dependency\]/);
  assert.match(result.stdout, /removed observed edges:\n    Rendering -> Physics/);
  assert.match(result.stdout, /use axi check when you want a CI gate/);
});

test("cli diff --json exposes the same advisory drift payload as graph JSON", () => {
  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "diff",
      "--root",
      "fixtures/basic-ts-invalid",
      "--baseline",
      "fixtures/baseline-drift/basic-valid.graph.json",
      "--json"
    ],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, "axiom.graph.v12");
  assert.equal(payload.drift.kind, "advisory_observed_edge_drift");
  assert.deepEqual(
    payload.drift.newObservedEdges.map((edge: { fromModule: string; toModule: string }) => `${edge.fromModule}->${edge.toModule}`),
    ["Simulation->Rendering"]
  );
});

test("cli diff supports brace source include scope", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "axiom-diff-brace-baseline-"));
  const baselinePath = path.join(directory, "current.graph.json");

  try {
    const graph = spawnSync(
      process.execPath,
      [
        cliPath,
        "graph",
        "--root",
        "fixtures/basic-ts-valid",
        "--include",
        "src/**/*.{ts,tsx}",
        "--json",
        "--portable"
      ],
      { cwd: repoRoot, encoding: "utf8" }
    );

    assert.equal(graph.status, 0, graph.stderr);
    writeFileSync(baselinePath, graph.stdout, "utf8");

    const result = spawnSync(
      process.execPath,
      [
        cliPath,
        "diff",
        baselinePath,
        "--root",
        "fixtures/basic-ts-valid",
        "--include",
        "src/**/*.{ts,tsx}",
        "--json"
      ],
      { cwd: repoRoot, encoding: "utf8" }
    );

    assert.equal(result.status, 0, result.stderr);

    const payload = JSON.parse(result.stdout);
    assert.equal(payload.schemaVersion, "axiom.graph.v12");
    assert.equal(payload.summary.observedDependencies, 1);
    assert.equal(payload.allObservedDependencies.length, 1);
    assert.equal(
      (payload.drift?.newObservedEdges?.length ?? 0) + (payload.drift?.removedObservedEdges?.length ?? 0),
      0
    );
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("cli diff accepts PowerShell UTF-16LE redirected graph baselines", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "axiom-diff-baseline-"));
  const baselinePath = path.join(directory, "axiom-baseline.json");

  try {
    const baselineText = readFileSync(path.join(repoRoot, "fixtures/baseline-drift/basic-valid.graph.json"), "utf8");
    writeFileSync(baselinePath, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(baselineText, "utf16le")]));

    const result = spawnSync(
      process.execPath,
      [
        cliPath,
        "diff",
        baselinePath,
        "--root",
        "fixtures/basic-ts-invalid"
      ],
      { cwd: repoRoot, encoding: "utf8" }
    );

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /Axiom diff\./);
    assert.match(result.stdout, /drift: 1 new observed edge, 1 removed observed edge/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("cli diff --markdown prints a drift-focused review artifact", () => {
  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "diff",
      "fixtures/baseline-drift/basic-valid.graph.json",
      "--root",
      "fixtures/basic-ts-invalid",
      "--markdown"
    ],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /## Axiom Architecture Diff/);
  assert.match(result.stdout, /Status: drift detected/);
  assert.match(result.stdout, /Review mode: baseline drift \(advisory\)/);
  assert.match(result.stdout, /### Architecture Drift \(Advisory\)/);
  assert.match(result.stdout, /`Simulation -> Rendering` \(`forbidden_dependency`\)/);
  assert.doesNotMatch(result.stdout, /### Hard Violations/);
});

test("cli diff --mermaid renders a drift-focused diagram", () => {
  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "diff",
      "fixtures/baseline-drift/basic-valid.graph.json",
      "--root",
      "fixtures/basic-ts-invalid",
      "--mermaid"
    ],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /%% Generated by axi diff --mermaid\./);
  assert.match(result.stdout, /Diff view: 1 new, 1 removed observed module edges/);
  assert.match(result.stdout, /Only baseline drift edges are shown; unchanged edges are omitted/);
  assert.match(result.stdout, /module_Simulation -->\|1 import; new edge; forbidden_dependency\| module_Rendering/);
  assert.match(result.stdout, /module_Rendering -->\|1 import; removed edge\| module_Physics/);
});

test("cli diff requires a baseline graph", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "diff", "--root", "fixtures/basic-ts-invalid"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /axi diff requires a baseline graph JSON/);
});

test("cli observe --baseline rejects filtered graph baselines", () => {
  const result = spawnSync(
    process.execPath,
    [
      cliPath,
      "observe",
      "--root",
      "fixtures/basic-ts-invalid",
      "--baseline",
      "fixtures/baseline-drift/filtered.graph.json",
      "--json"
    ],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Baseline graph must be unfiltered/);
});

test("cli graph rejects markdown and json together", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "graph", "--root", "fixtures/basic-ts-valid", "--json", "--markdown"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Use only one of --json, --markdown, or --mermaid/);
});

test("cli graph rejects mermaid and json together", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "graph", "--root", "fixtures/basic-ts-valid", "--json", "--mermaid"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Use only one of --json, --markdown, or --mermaid/);
});

test("cli graph --portable requires json output", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "graph", "--root", "fixtures/basic-ts-valid", "--portable"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /--portable requires axi graph --json/);
});

test("cli observe rejects portable output", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "observe", "--root", "fixtures/basic-ts-valid", "--json", "--portable"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /--portable is only supported by graph JSON output/);
});

test("cli check rejects markdown output", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "check", "--root", "fixtures/basic-ts-valid", "--markdown"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /--markdown is only supported by graph, observe, and diff/);
});

test("cli check rejects mermaid output", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "check", "--root", "fixtures/basic-ts-valid", "--mermaid"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /--mermaid is only supported by graph, observe, and diff/);
});

test("cli infer prints a starter .axi contract", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "infer", "--root", "fixtures/basic-ts-valid"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);
  assert.match(result.stdout, /Generated by axi infer/);
  assert.match(result.stdout, /not a recommended architecture/);
  assert.match(result.stdout, /# inference review story:/);
  assert.match(result.stdout, /# pressure: Review inferred dependencies/);
  assert.match(result.stdout, /module Simulation/);
  assert.match(result.stdout, /# evidence: 1 import site observed for Simulation -> Physics/);
  assert.match(result.stdout, /depends on Physics/);
});

test("cli infer --json returns parseable inferred output", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "infer", "--root", "fixtures/basic-ts-valid", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.schemaVersion, "axiom.infer.v8");
  assert.equal(payload.starterContract.kind, "current_graph_snapshot");
  assert.match(payload.reviewStory.summary, /Starter contract inferred 3 modules/);
  assert.match(payload.starterContract.notice.join("\n"), /not a recommended architecture/);
  assert.match(payload.starterContract.reviewPass.join("\n"), /desired architecture/);
  assert.match(payload.starterContract.authoringChecklist.join("\n"), /do not blanket-accept first-run problems/);
  assert.equal(payload.summary.modules, 3);
  assert.equal(payload.summary.observedDependencies, 1);
  assert.equal(payload.summary.observedModuleEdges, 1);
  assert.equal(payload.summary.observedImportSites, 1);
  assert.equal(payload.summary.architecturePressureNotes, 0);
  assert.deepEqual(
    payload.modules.find((module: { name: string }) => module.name === "Simulation")?.dependencyEvidence?.map(
      (dependency: { toModule: string; count: number }) => ({
        toModule: dependency.toModule,
        count: dependency.count
      })
    ),
    [{ toModule: "Physics", count: 1 }]
  );
  assert.match(payload.axi, /not a recommended architecture/);
  assert.match(payload.axi, /# evidence: 1 import site observed for Simulation -> Physics/);
  assert.match(payload.axi, /module Physics/);
});

test("cli infer supports group depth", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "infer", "--root", "fixtures/infer-group-depth", "--group-depth", "2", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.deepEqual(
    payload.modules.map((module: { name: string }) => module.name),
    ["ServicesAgent", "ServicesTools", "Ui"]
  );
});

test("cli infer supports workspace grouping", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "infer", "--root", "fixtures/package-exports", "--group-by", "workspace", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.deepEqual(
    payload.modules.map((module: { name: string }) => module.name),
    ["Shared", "Web"]
  );
  assert.deepEqual(payload.modules.find((module: { name: string }) => module.name === "Web")?.depends, ["Shared"]);
});

test("cli check uses project config discovery settings", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "check", "--root", "fixtures/config-filter", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.summary.specFiles, 1);
  assert.equal(payload.summary.sourceFiles, 1);
  assert.deepEqual(payload.specFiles, ["architecture/main.axi"]);
  assert.deepEqual(payload.sourceFiles, ["src/app.ts"]);
});

test("cli check supports inline source include scope", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "check", "--root", "fixtures/basic-ts-valid", "--include", "src/simulation/**,src/physics/**", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.deepEqual(payload.sourceFiles, ["src/physics/math.ts", "src/simulation/step.ts"]);
  assert.equal(payload.summary.sourceFiles, 2);
});

test("cli check supports brace source include scope", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "check", "--root", "fixtures/basic-ts-valid", "--include", "src/**/*.{ts,tsx}", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.deepEqual(payload.sourceFiles, ["src/physics/math.ts", "src/rendering/draw.ts", "src/simulation/step.ts"]);
  assert.equal(payload.summary.sourceFiles, 3);
});

test("cli infer supports brace source include scope", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "infer", "--root", "fixtures/basic-ts-valid", "--include", "src/**/*.{ts,tsx}", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.summary.sourceFiles, 3);
  assert.equal(payload.summary.observedImportSites, 1);
  assert.deepEqual(
    payload.modules.map((module: { name: string }) => module.name),
    ["Physics", "Rendering", "Simulation"]
  );
});

test("cli check reports explicit source scope that matches no files", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "check", "--root", "fixtures/basic-ts-valid", "--include", "src/**/*.{mts,mtsx}", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 1);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.summary.sourceFiles, 0);
  assert.equal(payload.violations[0]?.code, "no_source_files");
});

test("cli check supports inline source exclude scope", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "check", "--root", "fixtures/basic-ts-invalid", "--exclude", "src/simulation/**", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.ok, true);
  assert.equal(payload.summary.violations, 0);
  assert.deepEqual(payload.sourceFiles, ["src/physics/math.ts", "src/rendering/draw.ts"]);
});

test("cli infer supports inline source exclude scope", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "infer", "--root", "fixtures/basic-ts-valid", "--exclude", "src/simulation/**", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.deepEqual(
    payload.modules.map((module: { name: string }) => module.name),
    ["Physics", "Rendering"]
  );
});

test("cli check --spec uses an external contract file instead of root discovery", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "check", "--root", "fixtures/basic-ts-valid", "--spec", "fixtures/external-contracts/basic-main.axi", "--json"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 0);

  const payload = JSON.parse(result.stdout);
  assert.equal(payload.summary.specFiles, 1);
  assert.deepEqual(payload.specFiles, ["../external-contracts/basic-main.axi"]);
  assert.equal(
    payload.modules.find((module: { name: string }) => module.name === "Simulation")?.purpose,
    "external pilot contract"
  );
});

test("cli check --spec accepts PowerShell UTF-16LE redirected .axi contracts", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "axiom-spec-encoding-"));
  const specPath = path.join(directory, "main.axi");

  try {
    const specText = readFileSync(path.join(repoRoot, "fixtures/external-contracts/basic-main.axi"), "utf8");
    writeFileSync(specPath, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(specText, "utf16le")]));

    const result = spawnSync(
      process.execPath,
      [cliPath, "check", "--root", "fixtures/basic-ts-valid", "--spec", specPath, "--json"],
      { cwd: repoRoot, encoding: "utf8" }
    );

    assert.equal(result.status, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.ok, true);
    assert.equal(payload.summary.modules, 3);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("cli infer rejects --spec because inference stays read-only and spec-free", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "infer", "--root", "fixtures/basic-ts-valid", "--spec", "fixtures/external-contracts/basic-main.axi"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /--spec is only supported by check, graph, observe, and diff/);
});

test("cli rejects invalid intentional violation warning day windows", () => {
  const result = spawnSync(
    process.execPath,
    [cliPath, "check", "--root", "fixtures/basic-ts-valid", "--intentional-violation-warning-days", "soon"],
    { cwd: repoRoot, encoding: "utf8" }
  );

  assert.equal(result.status, 1);
  assert.match(result.stderr, /--intentional-violation-warning-days must be a non-negative integer/);
});
