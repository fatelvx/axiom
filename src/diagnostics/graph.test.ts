import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { formatGraphMarkdown, formatGraphMermaid, formatGraphResult, graphJsonSchemaVersion, toGraphJson } from "./graph.js";
import { runCheck } from "../validator/check.js";

const repoRoot = process.cwd();

test("graph JSON exposes declared, forbidden, visibility, and observed edges", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/visibility-rules") });
  const payload = toGraphJson(result);

  assert.deepEqual(Object.keys(payload), [
    "schemaVersion",
    "root",
    "filters",
    "architectureSummary",
    "summary",
    "modules",
    "declaredDependencies",
    "forbiddenDependencies",
    "exposedPaths",
    "hiddenPaths",
    "allObservedDependencies",
    "shownObservedDependencies",
    "observedDependencies",
    "violations",
    "intentionalDebt",
    "warnings"
  ]);
  assert.equal(payload.schemaVersion, graphJsonSchemaVersion);
  assert.deepEqual(payload.filters, { violationsOnly: false, attention: false });
  assert.deepEqual(payload.architectureSummary, {
    model: "declared_intent_vs_observed_imports",
    mode: "graph",
    status: "failing_contract",
    gate: {
      command: "axi check",
      currentCommandIsGate: false,
      hardViolationsFailCheck: true
    },
    reviewFocus: "Full declared and observed module graph.",
    interpretation: {
      headline:
        "Contract is failing: 2 hard violations should be repaired or explicitly accepted before treating the graph as stable.",
      quickRead: [
        "Contract: 2 hard violations.",
        "Graph center: Services (3 import sites, fan-in 1, fan-out 0), UI (3 import sites, fan-in 0, fan-out 1).",
        "Review pressure: no visible debt or advisory signals."
      ],
      lookFirst: [
        "Hard signals: read `violations[]`, `intentionalDebt[]`, and advisory `warnings[]` before judging the diagram.",
        "Graph center: inspect Services; it carries the strongest observed coupling in this scan.",
        "Shape fit: compare central modules, deep imports, drift, and any intra-file pressure signals with the architecture you expected for this repository."
      ],
      centralModules: [
        {
          module: "Services",
          role: "fan_in_hub",
          incomingModules: 1,
          outgoingModules: 0,
          incomingImportSites: 3,
          outgoingImportSites: 0,
          totalImportSites: 3
        },
        {
          module: "UI",
          role: "fan_out_hub",
          incomingModules: 0,
          outgoingModules: 1,
          incomingImportSites: 0,
          outgoingImportSites: 3,
          totalImportSites: 3
        }
      ],
      caveat:
        "This is a graph interpretation over static imports, not proof of semantic architecture health. Compare it with the architecture you intended."
    },
    reviewStory: {
      summary:
        "The contract is failing. Treat the listed hard violations as the first repair target before using this graph as a baseline.",
      setup:
        "Scanned 2 declared modules and 3 observed import edges. This report is advisory unless you run `axi check` as the gate.",
      pressures: [
        {
          kind: "hard_violation",
          title: "Hard contract failures",
          description: "2 hard violations should be fixed or explicitly accepted before treating this graph as stable.",
          severity: "gate",
          count: 2
        }
      ],
      nextStep:
        "Fix hard violations first, or add visible temporary `accepts ... [at \"path\"] until ... because ...` debt only after review.",
      caveat:
        "This story is a review aid over static imports. It points to likely pressure, not proof that the architecture is good or bad; a quiet import graph can still hide intra-file responsibility concentration."
    },
    topSignals: [
      {
        kind: "hard_violation",
        code: "unexposed_import",
        message: "UI imports a non-exposed path from Services.",
        location: {
          filePath: "src/ui/view.ts",
          line: 2
        },
        edge: {
          fromModule: "UI",
          toModule: "Services"
        }
      },
      {
        kind: "hard_violation",
        code: "hidden_import",
        message: "UI imports hidden path from Services.",
        location: {
          filePath: "src/ui/view.ts",
          line: 3
        },
        edge: {
          fromModule: "UI",
          toModule: "Services"
        }
      }
    ],
    suggestedNextActions: [
      "Use `axi check --json` as the hard gate and repair the listed `violations[]` first.",
      "If a violation is truly temporary, propose a visible `.axi` `accepts ... [at \"path\"] until ... because ...` entry for review."
    ]
  });
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
  assert.deepEqual(payload.shownObservedDependencies, payload.observedDependencies);
  assert.deepEqual(payload.allObservedDependencies, payload.observedDependencies);
  assert.deepEqual(payload.observedDependencies.map((edge) => edge.violations.map((violation) => violation.code)), [
    [],
    ["unexposed_import"],
    ["hidden_import"]
  ]);
  assert.deepEqual(payload.observedDependencies.map((edge) => edge.intentionalViolations), [[], [], []]);
  assert.deepEqual(payload.intentionalDebt, []);
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
  assert.match(output, /advisory signal scope: warning counts include only checks enabled for this command or config/);
  assert.match(output, /Simulation -> Physics via src\/simulation\/step\.ts:1 "\.\.\/physics\/math"/);
  assert.match(output, /Simulation -> Rendering via src\/simulation\/step\.ts:2 "\.\.\/rendering\/draw"/);
});

test("graph output preserves observed import kind evidence", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axiom-graph-import-kind-"));

  try {
    fs.mkdirSync(path.join(root, "axiom"), { recursive: true });
    fs.mkdirSync(path.join(root, "src/routes"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "axiom/main.axi"),
      [
        "module App",
        'path "src/app.ts"',
        "",
        "module Routes",
        'path "src/routes/**"',
        ""
      ].join("\n")
    );
    fs.writeFileSync(
      path.join(root, "src/app.ts"),
      [
        'export const lazySettings = () => import("./routes/settings");',
        'export const legacyRoute = () => require("./routes/legacy");'
      ].join("\n")
    );
    fs.writeFileSync(path.join(root, "src/routes/settings.ts"), "export const settings = true;\n");
    fs.writeFileSync(path.join(root, "src/routes/legacy.ts"), "export const legacy = true;\n");

    const result = runCheck({ root });
    const payload = toGraphJson(result);
    const human = formatGraphResult(result);
    const markdown = formatGraphMarkdown(result, {
      violationsOnly: true,
      attention: true,
      observe: true
    });

    assert.deepEqual(
      payload.observedDependencies.map((dependency) => ({
        kind: dependency.import.kind,
        specifier: dependency.import.specifier
      })),
      [
        { kind: "dynamic_import", specifier: "./routes/settings" },
        { kind: "require", specifier: "./routes/legacy" }
      ]
    );
    assert.match(human, /App -> Routes via dynamic import src\/app\.ts:1 "\.\/routes\/settings"/);
    assert.match(human, /App -> Routes via require src\/app\.ts:2 "\.\/routes\/legacy"/);
    assert.match(markdown, /`src\/app\.ts:1` dynamic importing `\.\/routes\/settings`/);
    assert.match(markdown, /`src\/app\.ts:2` requiring `\.\/routes\/legacy`/);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("quiet graph interpretation still gives a next review step", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/basic-ts-valid") });
  const payload = toGraphJson(result);
  const output = formatGraphResult(result);

  assert.equal(payload.architectureSummary.status, "clear");
  assert.match(payload.architectureSummary.interpretation.headline, /This scoped import graph is quiet/);
  assert.match(payload.architectureSummary.interpretation.headline, /compare that center with your intended architecture/);
  assert.match(payload.architectureSummary.interpretation.headline, /saving a baseline/);
  assert.match(output, /interpretation: This scoped import graph is quiet/);
  assert.match(output, /look first:/);
});

test("observe output reports enabled advisory signal checks with no findings", () => {
  const result = runCheck({
    root: path.join(repoRoot, "fixtures/basic-ts-valid"),
    warnUnresolvedImports: true,
    warnDynamicImports: true
  });
  const payload = toGraphJson(result, { violationsOnly: true, attention: true, observe: true });
  const output = formatGraphResult(result, { violationsOnly: true, attention: true, observe: true });
  const markdown = formatGraphMarkdown(result, { violationsOnly: true, attention: true, observe: true });

  assert.equal(payload.summary.warnings, 0);
  assert.deepEqual(
    payload.architectureSummary.advisorySignalCoverage?.enabledFamilies.map((entry) => ({
      family: entry.family,
      findings: entry.findings,
      status: entry.status
    })),
    [
      { family: "unresolvedImports", findings: 0, status: "checked_no_findings" },
      { family: "dynamicImports", findings: 0, status: "checked_no_findings" }
    ]
  );
  assert.match(output, /checked with no findings: unresolved static imports, non-literal dynamic dependency expressions/);
  assert.match(markdown, /Checked with no findings: unresolved static imports, non-literal dynamic dependency expressions/);
  assert.match(markdown, /not proof of semantic architecture health or runtime dependency completeness/);
});

test("advisory signal coverage does not claim ownership-based checks ran without a contract", () => {
  const result = runCheck({
    root: path.join(repoRoot, "fixtures/infer-cycle"),
    warnUnresolvedImports: true,
    warnDynamicImports: true
  });
  const payload = toGraphJson(result, { violationsOnly: true, attention: true, observe: true });
  const output = formatGraphResult(result, { violationsOnly: true, attention: true, observe: true });

  assert.equal(payload.architectureSummary.status, "needs_contract");
  assert.deepEqual(
    payload.architectureSummary.advisorySignalCoverage?.enabledFamilies.map((entry) => ({
      family: entry.family,
      findings: entry.findings,
      status: entry.status
    })),
    [
      { family: "unresolvedImports", findings: 0, status: "not_evaluated_needs_contract" },
      { family: "dynamicImports", findings: 0, status: "not_evaluated_needs_contract" }
    ]
  );
  assert.match(output, /not evaluated: unresolved static imports/);
  assert.doesNotMatch(output, /checked with no findings: unresolved static imports/);
});

test("violations-only graph output focuses observed edges with diagnostics", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/visibility-rules") });
  const output = formatGraphResult(result, { violationsOnly: true });

  assert.match(output, /Axiom graph \(violations only\)\./);
  assert.match(output, /review mode: violations-only graph \(presentation filter\)/);
  assert.match(output, /model: declared \.axi intent vs observed source imports/);
  assert.match(output, /shown dependency edges: 2/);
  assert.match(output, /full observed dependencies: 3/);
  assert.match(output, /focus: showing 2 of 3 observed dependency edges with hard violations or accepted debt; clean edges omitted/);
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
  assert.match(output, /review mode: graph attention \(advisory\)/);
  assert.match(output, /shown dependency edges: 2/);
  assert.match(output, /full observed dependencies: 3/);
});

test("violations-only graph JSON filters observed dependencies but keeps total counts", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/visibility-rules") });
  const payload = toGraphJson(result, { violationsOnly: true });

  assert.deepEqual(payload.filters, { violationsOnly: true, attention: false });
  assert.equal(payload.summary.observedDependencies, 3);
  assert.equal(payload.summary.shownObservedDependencies, 2);
  assert.equal(payload.allObservedDependencies.length, 3);
  assert.equal(payload.shownObservedDependencies.length, 2);
  assert.deepEqual(payload.observedDependencies, payload.shownObservedDependencies);
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
    kind: "import",
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
  assert.match(output, /- Shown dependency edges: 1/);
  assert.match(output, /- Full observed dependencies: 2/);
  assert.match(output, /Advisory signals are review pressure, not a cleanup checklist or failure state/);
  assert.match(output, /do not refactor solely to reduce signal counts/);
  assert.match(output, /Before acting on advisory signals, state the architecture hypothesis/);
  assert.match(output, /Axiom does not auto-accept debt/);
  assert.match(output, /Expired or invalid intentional violations are hard contract failures in `axi check`/);
  assert.match(output, /### Hard Violations/);
  assert.match(output, /`Simulation -> Rendering` via `src\/simulation\/step\.ts:2` importing `\.\.\/rendering\/draw`/);
  assert.match(output, /`forbidden_dependency`: Simulation imports forbidden module Rendering\./);
  assert.match(output, /### Visible Intentional Debt/);
  assert.match(output, /- None/);
  assert.match(output, /### Architecture Drift \(Advisory\)/);
  assert.match(output, /`advisory_observed_edge_drift`/);
  assert.match(output, /- New observed edges:\n  - `Simulation -> Rendering` \(`forbidden_dependency`\)/);
});

test("markdown observe treats missing contracts as setup issues", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/infer-cycle") });
  const payload = toGraphJson(result, { violationsOnly: true, attention: true, observe: true });
  const output = formatGraphMarkdown(result, { violationsOnly: true, attention: true, observe: true });

  assert.equal(payload.architectureSummary.status, "needs_contract");
  assert.equal(payload.architectureSummary.reviewStory.pressures[0]?.kind, "setup_issue");
  assert.match(output, /Status: needs contract/);
  assert.match(output, /- Setup issues: 1/);
  assert.match(output, /- Hard violations: 0/);
  assert.match(output, /### Setup Issues/);
  assert.match(output, /`no_spec_files`: No \.axi files found/);
  assert.match(output, /### Hard Violations\n- None/);
  assert.doesNotMatch(output, /Status: failing contract/);
});

test("markdown observe treats empty explicit source scopes as setup issues", () => {
  const result = runCheck({
    root: path.join(repoRoot, "fixtures/basic-ts-valid"),
    include: ["src/**/*.{mts,mtsx}"]
  });
  const payload = toGraphJson(result, { violationsOnly: true, attention: true, observe: true });
  const output = formatGraphMarkdown(result, { violationsOnly: true, attention: true, observe: true });

  assert.equal(payload.architectureSummary.status, "needs_review");
  assert.equal(payload.architectureSummary.reviewStory.pressures[0]?.kind, "setup_issue");
  assert.equal(payload.architectureSummary.reviewStory.pressures[0]?.code, "no_source_files");
  assert.equal(result.sourceFiles.length, 0);
  assert.equal(payload.summary.violations, 1);
  assert.equal(payload.observedDependencies.length, 0);
  assert.match(output, /Status: needs review/);
  assert.match(output, /- Setup issues: 1/);
  assert.match(output, /- Hard violations: 0/);
  assert.match(output, /### Setup Issues/);
  assert.match(output, /`no_source_files`: No source files matched Axiom source discovery/);
  assert.match(output, /### Hard Violations\n- None/);
  assert.doesNotMatch(output, /Status: failing contract/);
});

test("markdown warnings include large-file function counts", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axiom-markdown-large-file-"));

  try {
    fs.mkdirSync(path.join(root, "axiom"), { recursive: true });
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.writeFileSync(path.join(root, "axiom/main.axi"), ['module App', 'path "src/**"', ""].join("\n"));
    fs.writeFileSync(
      path.join(root, "src/main.ts"),
      Array.from({ length: 805 }, (_, index) => `export function value${index}() { return ${index}; }`).join("\n")
    );

    const result = runCheck({ root, warnLargeFiles: true });
    const output = formatGraphMarkdown(result, { violationsOnly: true, attention: true, observe: true });

    assert.match(output, /These are review-pressure signals, not a cleanup checklist/);
    assert.match(output, /first name the architecture hypothesis and verification plan/);
    assert.match(output, /`large_module_file` at `src\/main\.ts:1`/);
    assert.match(output, /Line count: 805/);
    assert.match(output, /Threshold: lines >= 800/);
    assert.match(output, /File shape: .*805 functions/);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("markdown warnings include large-file declaration-name clusters", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axiom-markdown-large-file-clusters-"));

  try {
    fs.mkdirSync(path.join(root, "axiom"), { recursive: true });
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.writeFileSync(path.join(root, "axiom/main.axi"), ['module App', 'path "src/**"', ""].join("\n"));
    fs.writeFileSync(
      path.join(root, "src/main.ts"),
      [
        "export function renderScene() { return true; }",
        "export function renderSprite() { return true; }",
        "export function renderHud() { return true; }",
        "export function physicsStep() { return true; }",
        "export function physicsBody() { return true; }",
        "export function physicsCollision() { return true; }",
        ...Array.from({ length: 799 }, (_, index) => `// filler ${index}`)
      ].join("\n")
    );

    const result = runCheck({ root, warnLargeFiles: true });
    const output = formatGraphMarkdown(result, { violationsOnly: true, attention: true, observe: true });

    assert.match(output, /Name clusters: .*`physics` \(3: `physicsStep`, `physicsBody`, `physicsCollision`\)/);
    assert.match(output, /Name clusters: .*`render` \(3: `renderScene`, `renderSprite`, `renderHud`\)/);
    assert.match(output, /Responsibility hint: Identifier token clusters are lexical review hints/);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("mermaid graph output visualizes observed module dependencies", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/basic-ts-invalid") });
  const output = formatGraphMermaid(result);

  assert.match(output, /%% Generated by axi graph --mermaid\./);
  assert.match(output, /flowchart TB/);
  assert.match(output, /subgraph axiom_legend\["Axiom graph legend"\]/);
  assert.match(output, /axiom_legend_scope\["Full observed view: 2 observed dependency edges shown<br\/>Clean and debt edges are both shown"\]/);
  assert.match(output, /axiom_legend_nodes\["Nodes: declared \.axi modules<br\/>Grouped by declared layer when present"\]/);
  assert.match(output, /axiom_legend_edges\["Edges: observed imports<br\/>Labels show import counts and drift\/debt codes"\]/);
  assert.match(output, /subgraph layer_Core\["layer Core"\]/);
  assert.match(output, /module_Simulation\["Simulation<br\/>deterministic physics simulation"\]/);
  assert.match(output, /module_Simulation -->\|1 import\| module_Physics/);
  assert.match(output, /module_Simulation -->\|1 import; forbidden_dependency\| module_Rendering/);
});

test("attention mermaid graph respects the focused observed edge filter", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/visibility-rules") });
  const output = formatGraphMermaid(result, { violationsOnly: true, attention: true });

  assert.match(output, /shownDependencyEdges=2, fullObservedDependencies=3/);
  assert.match(output, /FILTERED graph view: 2 of 3 observed dependency edges shown<br\/>Clean observed dependencies are omitted/);
  assert.match(output, /module_UI -->\|2 imports; hidden_import, unexposed_import\| module_Services/);
  assert.doesNotMatch(output, /3 imports/);
});

test("violations-only graph output includes intentional dependency debt", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/suppressed-dependency") });
  const output = formatGraphResult(result, { violationsOnly: true });

  assert.match(output, /violations: 0/);
  assert.match(output, /intentional violations: 1/);
  assert.match(output, /violating dependencies:\n  none/);
  assert.match(output, /visible intentional debt:\n  forbidden_dependency src\/simulation\/step\.ts:1: Simulation imports forbidden module Rendering\./);
  assert.match(output, /edge: Simulation -> Rendering/);
  assert.match(output, /observed: Simulation -> Rendering/);
  assert.match(output, /specifier: "\.\.\/rendering\/draw"/);
  assert.match(output, /rule: Simulation forbids module Rendering \(axiom\/main\.axi:6\)/);
  assert.match(output, /contract: accepted until 2099-01-01 \(axiom\/main\.axi:7\)/);
  assert.match(output, /reason: legacy renderer migration/);
});

test("attention output includes intentional debt without an observed dependency edge", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/accepted-hidden-reexport") });
  const output = formatGraphResult(result, { violationsOnly: true, attention: true });

  assert.match(output, /shown dependency edges: 0/);
  assert.match(output, /full observed dependencies: 0/);
  assert.match(output, /intentional violations: 1/);
  assert.match(output, /violating dependencies:\n  none/);
  assert.match(output, /visible intentional debt:\n  hidden_reexport src\/services\/index\.ts:1: Services re-exports a hidden path through an exposed file\./);
  assert.match(output, /edge: Services -> Services/);
  assert.match(output, /observed: Services exposes hidden path/);
  assert.match(output, /specifier: "\.\/internal\/token"/);
  assert.match(output, /rule: Services hides src\/services\/internal\/\*\* \(axiom\/main\.axi:4\)/);
  assert.match(output, /contract: accepted until 2099-01-01 \(axiom\/main\.axi:5\)/);
  assert.match(output, /reason: legacy public barrel cleanup/);
});

test("markdown review includes non-edge intentional debt", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/accepted-hidden-reexport") });
  const output = formatGraphMarkdown(result, { violationsOnly: true, attention: true, observe: true });

  assert.match(output, /Status: needs review/);
  assert.match(output, /### Visible Intentional Debt/);
  assert.match(output, /`hidden_reexport` at `src\/services\/index\.ts:1`: Services re-exports a hidden path through an exposed file\./);
  assert.match(output, /Edge: `Services -> Services`/);
  assert.match(output, /Observed: Services exposes hidden path/);
  assert.match(output, /Accepted until: `2099-01-01`/);
  assert.match(output, /Contract: `axiom\/main\.axi:5`/);
  assert.match(output, /Reason: legacy public barrel cleanup/);
});

test("review output shows path-scoped intentional debt", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/accepted-hidden-reexport-scoped") });
  const human = formatGraphResult(result, { violationsOnly: true, attention: true });
  const markdown = formatGraphMarkdown(result, { violationsOnly: true, attention: true, observe: true });
  const payload = toGraphJson(result, { violationsOnly: true, attention: true });

  assert.match(human, /scope: src\/services\/index\.ts/);
  assert.match(markdown, /Scope: `src\/services\/index\.ts`/);
  assert.equal(payload.intentionalDebt[0]?.pathScope, "src/services/index.ts");
  assert.equal(payload.summary.violations, 1);
  assert.equal(payload.summary.intentionalViolations, 1);
});

test("violations-only graph output includes warning guardrails", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/unused-suppression") });
  const output = formatGraphResult(result, { violationsOnly: true });

  assert.match(output, /violations: 0/);
  assert.match(output, /warnings: 1/);
  assert.match(output, /violating dependencies:\n  none/);
  assert.match(output, /note: advisory signals are review pressure, not a cleanup checklist or failure state/);
  assert.match(output, /note: do not refactor solely to reduce advisory signal counts; first name the architecture hypothesis/);
  assert.match(output, /unused_suppression axiom\/main\.axi:7: Simulation has an unused intentional violation for Rendering\./);
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

test("attention graph output labels composition root fan-out as review pressure", () => {
  const result = runCheck({
    root: path.join(repoRoot, "fixtures/composition-root-fan-out"),
    warnCouplingConcentration: true
  });
  const output = formatGraphResult(result, { violationsOnly: true, attention: true });
  const payload = toGraphJson(result, { violationsOnly: true, attention: true });

  assert.match(output, /composition_root_pressure: AppEntry composition root imports 4 modules\./);
  assert.doesNotMatch(output, /coupling_concentration: AppEntry/);
  assert.match(output, /review kind: composition_root_pressure/);
  assert.match(output, /role hint: composition_root/);
  assert.match(output, /entry files: src\/main\.ts/);
  assert.equal(payload.architectureSummary.reviewStory.pressures[0]?.title, "Composition root pressure in AppEntry");

  const markdown = formatGraphMarkdown(result, { violationsOnly: true, attention: true, observe: true });
  assert.match(markdown, /`composition_root_pressure`: AppEntry composition root imports 4 modules\./);
  assert.doesNotMatch(markdown, /`coupling_concentration`: AppEntry/);
});

test("attention graph output explains deep internal import warnings", () => {
  const result = runCheck({
    root: path.join(repoRoot, "fixtures/deep-internal-import"),
    warnDeepInternalImports: true
  });
  const output = formatGraphResult(result, { violationsOnly: true, attention: true });

  assert.match(output, /warnings: 1/);
  assert.match(output, /deep_internal_import src\/app\/deep\.ts:1: App imports Lib through a deep relative path instead of a likely source-group entry point\./);
  assert.match(output, /observed: App -> Lib deep internal import/);
  assert.match(output, /imported path: src\/lib\/internal\/secret\.ts/);
  assert.match(output, /deep import group: src\/lib\/internal\/\*/);
  assert.match(output, /likely entry points: src\/lib\/index\.ts/);
  assert.match(output, /entrypoint confidence: single_likely_entrypoint/);
  assert.match(output, /entrypoint reason: single_same_source_group_entrypoint/);
});

test("attention graph output clusters repeated warning root causes", () => {
  const result = runCheck({
    root: path.join(repoRoot, "fixtures/deep-internal-warning-clusters"),
    warnDeepInternalImports: true
  });
  const payload = toGraphJson(result, { violationsOnly: true, attention: true });
  const output = formatGraphResult(result, { violationsOnly: true, attention: true });

  assert.match(output, /warnings: 2/);
  assert.equal(payload.architectureSummary.reviewStory.pressures[0]?.title, "Public-entry bypass in Lib");
  assert.match(
    payload.architectureSummary.reviewStory.summary,
    /Start review with Public-entry bypass in Lib/
  );
  assert.match(output, /likely roots:\n    deep_internal_import Lib public-entry bypass: src\/lib\/internal\/\*: 2 warnings/);
  assert.match(output, /review story:\n  - Public-entry bypass in Lib:/);
  assert.match(output, /deep_internal_import src\/app\/a\.ts:1/);
  assert.match(output, /deep_internal_import src\/app\/b\.ts:1/);
});

test("attention graph output avoids cross-group entrypoint advice", () => {
  const result = runCheck({
    root: path.join(repoRoot, "fixtures/deep-internal-cross-group-entrypoint"),
    warnDeepInternalImports: true
  });
  const output = formatGraphResult(result, { violationsOnly: true, attention: true });

  assert.match(output, /warnings: 1/);
  assert.match(output, /deep_internal_import src\/app\/use-store\.ts:1: App imports ServicesCycle through a deep relative path with no clear source-group entry point\./);
  assert.match(output, /imported path: src\/store\/chatStore\.ts/);
  assert.match(output, /other module entry points: src\/services\/sandbox\/index\.ts/);
  assert.match(output, /entrypoint confidence: ambiguous_entrypoints/);
  assert.match(output, /entrypoint reason: no_same_source_group_entrypoint/);
  assert.doesNotMatch(output, /likely entry points: src\/services\/sandbox\/index\.ts/);
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

test("graph JSON exposes a top-level intentional debt ledger", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/accepted-hidden-reexport") });
  const payload = toGraphJson(result, { violationsOnly: true, attention: true });

  assert.equal(payload.summary.intentionalViolations, 1);
  assert.equal(payload.observedDependencies.length, 0);
  assert.deepEqual(payload.intentionalDebt, [
    {
      kind: "intentional_violation",
      code: "hidden_reexport",
      message: "Services re-exports a hidden path through an exposed file.",
      fromModule: "Services",
      toModule: "Services",
      acceptedUntil: "2099-01-01",
      reason: "legacy public barrel cleanup",
      contractLocation: {
        filePath: "axiom/main.axi",
        line: 5
      },
      location: {
        filePath: "src/services/index.ts",
        line: 1
      },
      details: {
        fromModule: "Services",
        toModule: "Services",
        specifier: "./internal/token",
        exportedPath: "src/services/internal/token.ts",
        observed: "Services exposes hidden path",
        rule: "Services hides src/services/internal/**",
        ruleLocation: {
          filePath: "axiom/main.axi",
          line: 4
        },
        suggestion: "Remove this re-export from the exposed surface, or move the exported API out of the hidden path."
      },
      suggestion: "Remove this re-export from the exposed surface, or move the exported API out of the hidden path."
    }
  ]);
});
