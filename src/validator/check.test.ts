import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { runCheck } from "./check.js";

const repoRoot = process.cwd();

test("valid fixture passes", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/basic-ts-valid") });

  assert.deepEqual(result.violations, []);
  assert.equal(result.spec.modules.length, 3);
  assert.equal(result.observedDependencies.length, 1);
});

test("invalid fixture reports forbidden dependency", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/basic-ts-invalid") });
  const codes = result.violations.map((violation) => violation.code);

  assert.ok(codes.includes("forbidden_dependency"));
});

test("undeclared fixture reports undeclared dependency", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/basic-ts-undeclared") });
  const codes = result.violations.map((violation) => violation.code);

  assert.ok(codes.includes("undeclared_dependency"));
});

test("cycle fixture reports declared dependency cycle", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/cycle") });
  const codes = result.violations.map((violation) => violation.code);

  assert.ok(codes.includes("cycle_dependency"));
});

test("unknown module fixture reports unknown module references", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/unknown-module") });
  const codes = result.violations.map((violation) => violation.code);

  assert.ok(codes.includes("unknown_module"));
});

test("duplicate module fixture reports duplicate module declarations", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/duplicate-module") });
  const codes = result.violations.map((violation) => violation.code);

  assert.ok(codes.includes("duplicate_module"));
});

test("missing path fixture reports missing module path", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/missing-path") });
  const codes = result.violations.map((violation) => violation.code);

  assert.ok(codes.includes("missing_module_path"));
});

test("no-spec first runs surface likely scan scope noise", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axiom-no-spec-scope-"));

  try {
    fs.mkdirSync(path.join(root, ".agent-runtime/profile"), { recursive: true });
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.writeFileSync(path.join(root, ".agent-runtime/profile/runtime_background.js"), "export const runtimeState = 1;\n");
    fs.writeFileSync(path.join(root, "src/main.ts"), "export const app = 1;\n");

    const result = runCheck({ root });
    const noSpecViolation = result.violations.find((violation) => violation.code === "no_spec_files");
    const scopeHints = noSpecViolation?.details?.scopeHints as Array<Record<string, unknown>> | undefined;
    const inferredModuleCandidates = noSpecViolation?.details?.inferredModuleCandidates as
      | Array<Record<string, unknown>>
      | undefined;

    assert.equal(noSpecViolation?.code, "no_spec_files");
    assert.ok(
      inferredModuleCandidates?.some(
        (candidate) =>
          candidate.name === "AppEntry" &&
          candidate.path === "src/*" &&
          candidate.fileCount === 1
      )
    );
    assert.deepEqual(scopeHints?.[0]?.matchedFolders, [".agent-runtime"]);
    assert.deepEqual(scopeHints?.[0]?.samplePaths, [".agent-runtime/profile/runtime_background.js"]);
    assert.match(String(scopeHints?.[0]?.suggestion), /--include "src\/\*\*"/);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("layer valid fixture permits dependencies toward inner layers", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/layer-valid") });

  assert.deepEqual(result.violations, []);
});

test("layer breach fixture reports outward dependency", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/layer-breach") });
  const codes = result.violations.map((violation) => violation.code);

  assert.ok(codes.includes("layer_breach"));
});

test("unknown layer fixture reports unknown layer", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/unknown-layer") });
  const codes = result.violations.map((violation) => violation.code);

  assert.ok(codes.includes("unknown_layer"));
});

test("ambiguous owner fixture reports ambiguous module owner", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/ambiguous-owner") });
  const codes = result.violations.map((violation) => violation.code);

  assert.ok(codes.includes("ambiguous_module_owner"));
});

test("visibility fixture reports hidden and unexposed imports", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/visibility-rules") });
  const codes = result.violations.map((violation) => violation.code);

  assert.deepEqual(codes, ["unexposed_import", "hidden_import"]);
});

test("hidden re-export fixture reports exposed barrel leaks", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/hidden-reexport") });

  assert.deepEqual(result.observedDependencies, []);
  assert.equal(result.violations.length, 1);
  assert.deepEqual(result.violations[0], {
    code: "hidden_reexport",
    message: "Services re-exports a hidden path through an exposed file.",
    location: {
      filePath: path.join(repoRoot, "fixtures/hidden-reexport/src/services/index.ts"),
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
        filePath: path.join(repoRoot, "fixtures/hidden-reexport/axiom/main.axi"),
        line: 4
      },
      suggestion: "Remove this re-export from the exposed surface, or move the exported API out of the hidden path."
    }
  });
});

test("hidden local re-export fixture reports import-then-export leaks", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/hidden-reexport-local") });

  assert.deepEqual(result.observedDependencies, []);
  assert.equal(result.violations.length, 1);
  assert.deepEqual(result.violations[0], {
    code: "hidden_reexport",
    message: "Services re-exports a hidden import through an exposed file.",
    location: {
      filePath: path.join(repoRoot, "fixtures/hidden-reexport-local/src/services/index.ts"),
      line: 3
    },
    details: {
      fromModule: "Services",
      toModule: "Services",
      specifier: "./internal/token",
      exportedName: "issueServiceToken",
      exportedPath: "src/services/internal/token.ts",
      exportKind: "named",
      importLocation: {
        filePath: path.join(repoRoot, "fixtures/hidden-reexport-local/src/services/index.ts"),
        line: 1
      },
      observed: "Services exposes hidden path",
      rule: "Services hides src/services/internal/**",
      ruleLocation: {
        filePath: path.join(repoRoot, "fixtures/hidden-reexport-local/axiom/main.axi"),
        line: 4
      },
      suggestion: "Remove this re-export from the exposed surface, or move the exported API out of the hidden path."
    }
  });
});

test("hidden implementation imports can back a public wrapper without leaking hidden symbols", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/hidden-wrapper-ok") });

  assert.deepEqual(result.violations, []);
  assert.deepEqual(result.suppressedViolations, []);
});

test("public API surface warnings are opt-in advisory diagnostics", () => {
  const root = path.join(repoRoot, "fixtures/public-api-surface");
  const quietResult = runCheck({ root });

  assert.deepEqual(quietResult.violations, []);
  assert.deepEqual(quietResult.warnings, []);

  const result = runCheck({ root, warnPublicApiSurface: true });

  assert.deepEqual(result.violations, []);
  assert.equal(result.warnings.length, 1);
  assert.deepEqual(result.warnings[0], {
    code: "broad_public_surface",
    message: "Services exposes a broad public API surface through export *.",
    location: {
      filePath: path.join(root, "src/services/index.ts"),
      line: 1
    },
    details: {
      module: "Services",
      specifier: "./feature",
      exposedPath: "src/services/index.ts",
      exportKind: "star",
      isTypeOnly: false,
      observed: "Services broad public surface",
      rule: "Services exposes src/services/index.ts",
      ruleLocation: {
        filePath: path.join(root, "axiom/main.axi"),
        line: 3
      },
      suggestion:
        "Review whether this barrel is intentionally broad; prefer explicit exports or split the public surface when coupling starts to hide behind one entry point."
    }
  });
});

test("public API surface warnings catch entry points that mask internal coupling", () => {
  const root = path.join(repoRoot, "fixtures/public-entrypoint-coupling");
  const quietResult = runCheck({ root });

  assert.deepEqual(quietResult.violations, []);
  assert.deepEqual(quietResult.warnings, []);

  const result = runCheck({ root, warnPublicApiSurface: true });

  assert.deepEqual(result.violations, []);
  assert.equal(result.warnings.length, 1);
  assert.deepEqual(result.warnings[0], {
    code: "public_entrypoint_coupling",
    message: "Services public entry point reaches 4 internal files.",
    location: {
      filePath: path.join(root, "src/services/index.ts"),
      line: 1
    },
    details: {
      module: "Services",
      exposedPath: "src/services/index.ts",
      internalTargetCount: 4,
      internalImportSites: 4,
      typeOnlyImportSites: 0,
      internalTargets: [
        "src/services/a.ts",
        "src/services/b.ts",
        "src/services/c.ts",
        "src/services/d.ts"
      ],
      importKinds: ["export"],
      threshold: {
        internalTargets: 4
      },
      observed: "Services public entry point depends on 4 internal files",
      rule: "Services exposes src/services/index.ts",
      ruleLocation: {
        filePath: path.join(root, "axiom/main.axi"),
        line: 3
      },
      suggestion:
        "Review whether this entry point is masking internal coupling; prefer narrower named exports, split the public surface, or make the facade boundary explicit."
    }
  });
});

test("coupling concentration warnings are opt-in advisory diagnostics", () => {
  const root = path.join(repoRoot, "fixtures/coupling-concentration");
  const quietResult = runCheck({ root });

  assert.deepEqual(quietResult.violations, []);
  assert.deepEqual(quietResult.warnings, []);

  const result = runCheck({ root, warnCouplingConcentration: true });

  assert.deepEqual(result.violations, []);
  assert.equal(result.warnings.length, 1);
  assert.deepEqual(result.warnings[0], {
    code: "coupling_concentration",
    message: "Hub has concentrated fan-in from 4 modules.",
    details: {
      module: "Hub",
      direction: "fan_in",
      fanInModules: 4,
      fanOutModules: 0,
      incomingModules: ["FeatureA", "FeatureB", "FeatureC", "FeatureD"],
      outgoingModules: [],
      incomingImportSites: 4,
      outgoingImportSites: 0,
      threshold: {
        fanInModules: 4,
        fanOutModules: 4
      },
      observed: "Hub fan-in from 4 modules",
      suggestion:
        "Review whether this module is becoming a coordination hub; split responsibilities, narrow public surfaces, or make the boundary explicit before considering enforcement."
    }
  });
});

test("coupling concentration labels likely composition root fan-out without suppressing it", () => {
  const root = path.join(repoRoot, "fixtures/composition-root-fan-out");
  const result = runCheck({ root, warnCouplingConcentration: true });

  assert.deepEqual(result.violations, []);
  assert.equal(result.warnings.length, 1);
  assert.deepEqual(result.warnings[0], {
    code: "coupling_concentration",
    message: "AppEntry composition root imports 4 modules.",
    details: {
      module: "AppEntry",
      direction: "fan_out",
      fanInModules: 0,
      fanOutModules: 4,
      incomingModules: [],
      outgoingModules: ["Engine", "Phases", "Render", "Ui"],
      incomingImportSites: 0,
      outgoingImportSites: 4,
      threshold: {
        fanInModules: 4,
        fanOutModules: 4
      },
      observed: "AppEntry composition root imports 4 modules",
      reviewKind: "composition_root_pressure",
      roleHint: "composition_root",
      entryFiles: ["src/main.ts"],
      entryFileFanOutModules: 4,
      entryFileImportSites: 4,
      note:
        "This may be legitimate app or package bootstrap wiring when the entry file only composes modules; review whether it is also accumulating product logic.",
      suggestion:
        "Review whether the entry file is only wiring dependencies together. If yes, keep this as visible composition-root pressure; if it owns behavior too, split bootstrap from product logic or make the boundary explicit."
    }
  });
});

test("composition root fan-out includes type-only imports in the entry file", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-composition-root-type-import-"));

  try {
    fs.mkdirSync(path.join(root, "axiom"), { recursive: true });
    fs.mkdirSync(path.join(root, "src/engine"), { recursive: true });
    fs.mkdirSync(path.join(root, "src/phases"), { recursive: true });
    fs.mkdirSync(path.join(root, "src/render"), { recursive: true });
    fs.mkdirSync(path.join(root, "src/ui"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "axiom/main.axi"),
      [
        "module AppEntry",
        'path "src/*"',
        "depends Engine",
        "depends Phases",
        "depends Render",
        "depends Ui",
        "",
        "module Engine",
        'path "src/engine/**"',
        "",
        "module Phases",
        'path "src/phases/**"',
        "",
        "module Render",
        'path "src/render/**"',
        "",
        "module Ui",
        'path "src/ui/**"',
        ""
      ].join("\n")
    );
    fs.writeFileSync(
      path.join(root, "src/main.ts"),
      [
        'import type { EngineConfig } from "./engine/types";',
        'import { phaseModules } from "./phases/registry";',
        'import { CanvasRenderer } from "./render/CanvasRenderer";',
        'import { Controller } from "./ui/createController";',
        "export const app = { phaseModules, CanvasRenderer, Controller };"
      ].join("\n")
    );
    fs.writeFileSync(path.join(root, "src/engine/types.ts"), "export interface EngineConfig { seed: string }\n");
    fs.writeFileSync(path.join(root, "src/phases/registry.ts"), "export const phaseModules = [];\n");
    fs.writeFileSync(path.join(root, "src/render/CanvasRenderer.ts"), "export class CanvasRenderer {}\n");
    fs.writeFileSync(path.join(root, "src/ui/createController.ts"), "export class Controller {}\n");

    const result = runCheck({ root, warnCouplingConcentration: true });

    assert.equal(result.warnings.length, 1);
    assert.equal(result.warnings[0]?.details?.reviewKind, "composition_root_pressure");
    assert.equal(result.warnings[0]?.details?.entryFileFanOutModules, 4);
    assert.equal(result.warnings[0]?.details?.entryFileImportSites, 4);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("large file warnings are opt-in advisory diagnostics", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-large-file-"));

  try {
    fs.mkdirSync(path.join(root, "axiom"), { recursive: true });
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.writeFileSync(path.join(root, "axiom/main.axi"), ['module App', 'path "src/**"', ""].join("\n"));
    fs.writeFileSync(
      path.join(root, "src/main.ts"),
      Array.from({ length: 805 }, (_, index) => `export const value${index} = ${index};`).join("\n")
    );

    const quietResult = runCheck({ root });

    assert.deepEqual(quietResult.violations, []);
    assert.deepEqual(quietResult.warnings, []);
    assert.equal(quietResult.sourceFileMetrics[0]?.lineCount, 805);

    const result = runCheck({ root, warnLargeFiles: true });

    assert.deepEqual(result.violations, []);
    assert.equal(result.warnings.length, 1);
    assert.deepEqual(result.warnings[0], {
      code: "large_module_file",
      message: "Source file is large enough that architecture pressure may be hidden inside the file.",
      location: {
        filePath: path.join(root, "src/main.ts"),
        line: 1
      },
      details: {
        filePath: "src/main.ts",
        lineCount: 805,
        threshold: {
          lines: 800
        },
        importsScanned: 0,
        exportsScanned: 0,
        functionLikeCount: 0,
        classCount: 0,
        observed: "src/main.ts has 805 lines",
        scope: "intra_file_responsibility_pressure",
        suggestion:
          "Use this as a refactor/review prompt; split only after identifying real responsibilities. This warning does not mean the import graph is unhealthy."
      }
    });
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("large file warnings include declaration-name clusters when several themes repeat", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-large-file-clusters-"));

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

    assert.deepEqual(result.violations, []);
    assert.equal(result.warnings.length, 1);
    assert.equal(result.warnings[0]?.code, "large_module_file");
    assert.deepEqual(result.warnings[0]?.details?.nameTokenClusters, [
      {
        token: "physics",
        count: 3,
        samples: ["physicsStep", "physicsBody", "physicsCollision"]
      },
      {
        token: "render",
        count: 3,
        samples: ["renderScene", "renderSprite", "renderHud"]
      }
    ]);
    assert.match(String(result.warnings[0]?.details?.responsibilityHint), /lexical review hints/);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("deep internal import warnings are opt-in advisory diagnostics", () => {
  const root = path.join(repoRoot, "fixtures/deep-internal-import");
  const quietResult = runCheck({ root });

  assert.deepEqual(quietResult.violations, []);
  assert.deepEqual(quietResult.warnings, []);

  const result = runCheck({ root, warnDeepInternalImports: true });

  assert.deepEqual(result.violations, []);
  assert.equal(result.observedDependencies.length, 2);
  assert.equal(result.warnings.length, 1);
  assert.deepEqual(result.warnings[0], {
    code: "deep_internal_import",
    message: "App imports Lib through a deep relative path instead of a likely source-group entry point.",
    location: {
      filePath: path.join(root, "src/app/deep.ts"),
      line: 1
    },
    details: {
      fromModule: "App",
      toModule: "Lib",
      specifier: "../lib/internal/secret",
      importedPath: "src/lib/internal/secret.ts",
      deepImportGroup: "src/lib/internal/*",
      sourceGroup: "src/lib",
      publicEntrypoints: ["src/lib/index.ts"],
      publicEntrypointCount: 1,
      publicEntrypointsTruncated: false,
      moduleEntrypoints: [],
      moduleEntrypointCount: 0,
      moduleEntrypointsTruncated: false,
      entrypointConfidence: "single_likely_entrypoint",
      entrypointReason: "single_same_source_group_entrypoint",
      importKind: "import",
      observed: "App -> Lib deep internal import",
      scope: "relative_cross_module_non_entrypoint",
      suggestion:
        "Import the source-group entry point from Lib, or declare explicit exposes/hides rules if this deep path is intentional."
    }
  });
});

test("deep internal import warnings soften entrypoint advice for broad inferred modules", () => {
  const root = path.join(repoRoot, "fixtures/deep-internal-ambiguous-entrypoint");
  const result = runCheck({ root, warnDeepInternalImports: true });

  assert.deepEqual(result.violations, []);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0]?.code, "deep_internal_import");
  assert.equal(
    result.warnings[0]?.message,
    "App imports ServicesCycle through a deep relative path with no clear source-group entry point."
  );
  assert.deepEqual(result.warnings[0]?.details, {
    fromModule: "App",
    toModule: "ServicesCycle",
    specifier: "../services/tools/internal/tool",
    importedPath: "src/services/tools/internal/tool.ts",
    deepImportGroup: "src/services/tools/*",
    sourceGroup: "src/services",
    publicEntrypoints: ["src/services/index.ts", "src/services/tools/index.ts"],
    publicEntrypointCount: 2,
    publicEntrypointsTruncated: false,
    moduleEntrypoints: ["src/store/index.ts"],
    moduleEntrypointCount: 1,
    moduleEntrypointsTruncated: false,
    entrypointConfidence: "ambiguous_entrypoints",
    entrypointReason: "multiple_same_source_group_entrypoints",
    importKind: "import",
    observed: "App -> ServicesCycle deep internal import",
    scope: "relative_cross_module_non_entrypoint",
    suggestion:
      "Review the src/services/tools/* source group for ServicesCycle; this module may be too broad or missing a public entry point, so declare explicit exposes/hides rules or split the module before treating another source group's index file as the public boundary."
  });
});

test("deep internal import warnings do not recommend entrypoints from another source group", () => {
  const root = path.join(repoRoot, "fixtures/deep-internal-cross-group-entrypoint");
  const result = runCheck({ root, warnDeepInternalImports: true });

  assert.deepEqual(result.violations, []);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0]?.code, "deep_internal_import");
  assert.deepEqual(result.warnings[0]?.details, {
    fromModule: "App",
    toModule: "ServicesCycle",
    specifier: "../store/chatStore",
    importedPath: "src/store/chatStore.ts",
    deepImportGroup: "src/store/*",
    sourceGroup: "src/store",
    publicEntrypoints: [],
    publicEntrypointCount: 0,
    publicEntrypointsTruncated: false,
    moduleEntrypoints: ["src/services/sandbox/index.ts"],
    moduleEntrypointCount: 1,
    moduleEntrypointsTruncated: false,
    entrypointConfidence: "ambiguous_entrypoints",
    entrypointReason: "no_same_source_group_entrypoint",
    importKind: "import",
    observed: "App -> ServicesCycle deep internal import",
    scope: "relative_cross_module_non_entrypoint",
    suggestion:
      "Review the src/store/* source group for ServicesCycle; this module may be too broad or missing a public entry point, so declare explicit exposes/hides rules or split the module before treating another source group's index file as the public boundary."
  });
});

test("unresolved import warnings are opt-in advisory diagnostics", () => {
  const root = path.join(repoRoot, "fixtures/unresolved-import");
  const quietResult = runCheck({ root });

  assert.deepEqual(quietResult.violations, []);
  assert.deepEqual(quietResult.warnings, []);

  const result = runCheck({ root, warnUnresolvedImports: true });

  assert.deepEqual(result.violations, []);
  assert.equal(result.importCount, 2);
  assert.equal(result.warnings.length, 1);
  assert.deepEqual(result.warnings[0], {
    code: "unresolved_import",
    message: "App has an import that Axiom could not resolve into the observed graph.",
    location: {
      filePath: path.join(root, "src/app/index.ts"),
      line: 1
    },
    details: {
      module: "App",
      specifier: "./generated/runtime-token",
      importKind: "import",
      observed: "App unresolved import",
      resolution: "unresolved",
      scope: "relative_or_package_imports",
      suggestion:
        "Axiom could not map this static import to a source file, so the observed graph may be incomplete. Add the missing file, configure tsconfig/package imports, or exclude generated/runtime paths intentionally."
    }
  });
});

test("dynamic import warnings are opt-in graph-completeness diagnostics", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-dynamic-imports-"));

  try {
    fs.mkdirSync(path.join(root, "axiom"), { recursive: true });
    fs.mkdirSync(path.join(root, "src"), { recursive: true });
    fs.writeFileSync(path.join(root, "axiom/main.axi"), ['module App', 'path "src/**"', ""].join("\n"));
    fs.writeFileSync(
      path.join(root, "src/app.ts"),
      [
        "const routeName = 'settings';",
        "export const lazy = () => import(`./routes/${routeName}`);",
        "export const legacy = () => require(routeName);",
        "export const literal = () => import('./literal');"
      ].join("\n")
    );
    fs.writeFileSync(path.join(root, "src/literal.ts"), "export const literal = true;\n");

    const quietResult = runCheck({ root });

    assert.deepEqual(quietResult.violations, []);
    assert.deepEqual(quietResult.warnings, []);
    assert.equal(quietResult.importCount, 1);

    const result = runCheck({ root, warnDynamicImports: true });

    assert.deepEqual(result.violations, []);
    assert.equal(result.importCount, 1);
    assert.deepEqual(result.warnings, [
      {
        code: "dynamic_dependency_expression",
        message: "App has a non-literal import() expression that Axiom cannot resolve into the observed graph.",
        location: {
          filePath: path.join(root, "src/app.ts"),
          line: 2
        },
        details: {
          module: "App",
          dependencyKind: "import()",
          expressionKind: "TemplateExpression",
          expressionPreview: "`./routes/${routeName}`",
          observed: "App dynamic dependency expression",
          resolution: "not_statically_resolved",
          scope: "dynamic_dependency_expression",
          note:
            "Literal dynamic imports are scanned as observed dependencies; non-literal dependency expressions are graph-incompleteness evidence.",
          suggestion:
            "Prefer literal imports or a visible registry when the dependency is architectural, or document it as runtime wiring outside Axiom's static graph."
        }
      },
      {
        code: "dynamic_dependency_expression",
        message: "App has a non-literal require() expression that Axiom cannot resolve into the observed graph.",
        location: {
          filePath: path.join(root, "src/app.ts"),
          line: 3
        },
        details: {
          module: "App",
          dependencyKind: "require()",
          expressionKind: "Identifier",
          expressionPreview: "routeName",
          observed: "App dynamic dependency expression",
          resolution: "not_statically_resolved",
          scope: "dynamic_dependency_expression",
          note:
            "Literal dynamic imports are scanned as observed dependencies; non-literal dependency expressions are graph-incompleteness evidence.",
          suggestion:
            "Prefer literal imports or a visible registry when the dependency is architectural, or document it as runtime wiring outside Axiom's static graph."
        }
      }
    ]);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("module.require participates in observed graph and dynamic warning evidence", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-module-require-"));

  try {
    fs.mkdirSync(path.join(root, "axiom"), { recursive: true });
    fs.mkdirSync(path.join(root, "src/legacy"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "axiom/main.axi"),
      [
        "module App",
        'path "src/app.ts"',
        "depends Legacy",
        "",
        "module Legacy",
        'path "src/legacy/**"',
        ""
      ].join("\n")
    );
    fs.writeFileSync(
      path.join(root, "src/app.ts"),
      [
        'export const direct = () => module.require("./legacy/direct");',
        "const routeName = './legacy/runtime';",
        "export const lazy = () => module.require(routeName);"
      ].join("\n")
    );
    fs.writeFileSync(path.join(root, "src/legacy/direct.js"), "exports.direct = true;\n");

    const result = runCheck({ root, warnDynamicImports: true });

    assert.deepEqual(result.violations, []);
    assert.deepEqual(
      result.observedDependencies.map((dependency) => ({
        fromModule: dependency.fromModule,
        toModule: dependency.toModule,
        kind: dependency.importRecord.kind,
        specifier: dependency.importRecord.specifier
      })),
      [
        {
          fromModule: "App",
          toModule: "Legacy",
          kind: "require",
          specifier: "./legacy/direct"
        }
      ]
    );
    assert.deepEqual(result.warnings, [
      {
        code: "dynamic_dependency_expression",
        message: "App has a non-literal require() expression that Axiom cannot resolve into the observed graph.",
        location: {
          filePath: path.join(root, "src/app.ts"),
          line: 3
        },
        details: {
          module: "App",
          dependencyKind: "require()",
          expressionKind: "Identifier",
          expressionPreview: "routeName",
          observed: "App dynamic dependency expression",
          resolution: "not_statically_resolved",
          scope: "dynamic_dependency_expression",
          note:
            "Literal dynamic imports are scanned as observed dependencies; non-literal dependency expressions are graph-incompleteness evidence.",
          suggestion:
            "Prefer literal imports or a visible registry when the dependency is architectural, or document it as runtime wiring outside Axiom's static graph."
        }
      }
    ]);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("Python dynamic imports participate in observed graph and advisory evidence", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-python-dynamic-imports-"));

  try {
    fs.mkdirSync(path.join(root, "axiom"), { recursive: true });
    fs.mkdirSync(path.join(root, "bot"), { recursive: true });
    fs.mkdirSync(path.join(root, "plugins"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "axiom/main.axi"),
      [
        "module Bot",
        'path "bot/**"',
        "depends Plugins",
        "",
        "module Plugins",
        'path "plugins/**"',
        ""
      ].join("\n")
    );
    fs.writeFileSync(
      path.join(root, "bot/main.py"),
      [
        "import importlib",
        "plugin_name = 'plugins.runtime'",
        "literal = importlib.import_module('plugins.safe')",
        "runtime = importlib.import_module(plugin_name)",
        "fallback = __import__(plugin_name)"
      ].join("\n")
    );
    fs.writeFileSync(path.join(root, "plugins/__init__.py"), "");
    fs.writeFileSync(path.join(root, "plugins/safe.py"), "enabled = True\n");

    const quietResult = runCheck({ root });

    assert.deepEqual(quietResult.violations, []);
    assert.deepEqual(quietResult.warnings, []);
    assert.deepEqual(
      quietResult.observedDependencies.map((dependency) => ({
        fromModule: dependency.fromModule,
        toModule: dependency.toModule,
        kind: dependency.importRecord.kind,
        specifier: dependency.importRecord.specifier
      })),
      [
        {
          fromModule: "Bot",
          toModule: "Plugins",
          kind: "dynamic_import",
          specifier: "plugins.safe"
        }
      ]
    );

    const result = runCheck({ root, warnDynamicImports: true });

    assert.deepEqual(result.violations, []);
    assert.deepEqual(result.warnings, [
      {
        code: "dynamic_dependency_expression",
        message:
          "Bot has a non-literal importlib.import_module() expression that Axiom cannot resolve into the observed graph.",
        location: {
          filePath: path.join(root, "bot/main.py"),
          line: 4
        },
        details: {
          module: "Bot",
          dependencyKind: "importlib.import_module()",
          expressionKind: "importlib.import_module",
          expressionPreview: "plugin_name",
          observed: "Bot dynamic dependency expression",
          resolution: "not_statically_resolved",
          scope: "dynamic_dependency_expression",
          note:
            "Literal dynamic imports are scanned as observed dependencies; non-literal dependency expressions are graph-incompleteness evidence.",
          suggestion:
            "Prefer literal imports or a visible registry when the dependency is architectural, or document it as runtime wiring outside Axiom's static graph."
        }
      },
      {
        code: "dynamic_dependency_expression",
        message: "Bot has a non-literal __import__() expression that Axiom cannot resolve into the observed graph.",
        location: {
          filePath: path.join(root, "bot/main.py"),
          line: 5
        },
        details: {
          module: "Bot",
          dependencyKind: "__import__()",
          expressionKind: "__import__",
          expressionPreview: "plugin_name",
          observed: "Bot dynamic dependency expression",
          resolution: "not_statically_resolved",
          scope: "dynamic_dependency_expression",
          note:
            "Literal dynamic imports are scanned as observed dependencies; non-literal dependency expressions are graph-incompleteness evidence.",
          suggestion:
            "Prefer literal imports or a visible registry when the dependency is architectural, or document it as runtime wiring outside Axiom's static graph."
        }
      }
    ]);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("python imports participate in observed dependency validation", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-python-check-"));

  try {
    fs.mkdirSync(path.join(root, "axiom"), { recursive: true });
    fs.mkdirSync(path.join(root, "bot"), { recursive: true });
    fs.mkdirSync(path.join(root, "services"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "axiom/main.axi"),
      [
        "module Bot",
        'path "bot/**"',
        "",
        "module Services",
        'path "services/**"',
        ""
      ].join("\n")
    );
    fs.writeFileSync(path.join(root, "bot/main.py"), "from services.runner import run\nrun()\n");
    fs.writeFileSync(path.join(root, "services/__init__.py"), "");
    fs.writeFileSync(path.join(root, "services/runner.py"), "def run(): pass\n");

    const result = runCheck({ root });

    assert.deepEqual(
      result.observedDependencies.map((dependency) => ({
        fromModule: dependency.fromModule,
        toModule: dependency.toModule,
        kind: dependency.importRecord.kind,
        specifier: dependency.importRecord.specifier
      })),
      [
        {
          fromModule: "Bot",
          toModule: "Services",
          kind: "import",
          specifier: "services.runner"
        }
      ]
    );
    assert.equal(result.violations[0]?.code, "undeclared_dependency");
    assert.equal(result.importCount, 1);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("check uses configured Python import roots", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-python-config-roots-"));

  try {
    fs.mkdirSync(path.join(root, "axiom"), { recursive: true });
    fs.mkdirSync(path.join(root, "cogs"), { recursive: true });
    fs.mkdirSync(path.join(root, "src/common"), { recursive: true });
    fs.mkdirSync(path.join(root, "src/ui"), { recursive: true });
    fs.writeFileSync(
      path.join(root, "axiom.config.json"),
      JSON.stringify({
        pythonImportRoots: ["src/common", "src/ui"]
      })
    );
    fs.writeFileSync(
      path.join(root, "axiom/main.axi"),
      [
        "module Cogs",
        'path "cogs/**"',
        "",
        "module Common",
        'path "src/common/**"',
        "",
        "module Ui",
        'path "src/ui/**"',
        ""
      ].join("\n")
    );
    fs.writeFileSync(path.join(root, "cogs/main.py"), "from utils import load\n");
    fs.writeFileSync(path.join(root, "src/common/utils.py"), "def load(): pass\n");
    fs.writeFileSync(path.join(root, "src/ui/utils.py"), "def draw(): pass\n");

    const result = runCheck({ root });

    assert.deepEqual(
      result.observedDependencies.map((dependency) => ({
        fromModule: dependency.fromModule,
        toModule: dependency.toModule,
        specifier: dependency.importRecord.specifier,
        resolvedPath: normalize(root, dependency.importRecord.resolvedPath)
      })),
      [
        {
          fromModule: "Cogs",
          toModule: "Common",
          specifier: "utils",
          resolvedPath: "src/common/utils.py"
        }
      ]
    );
    assert.equal(result.violations[0]?.code, "undeclared_dependency");
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("check uses axiom.config.json discovery settings", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/config-filter") });

  assert.deepEqual(result.violations, []);
  assert.deepEqual(result.specFiles.map((filePath) => path.relative(result.root, filePath).replace(/\\/g, "/")), [
    "architecture/main.axi"
  ]);
  assert.deepEqual(result.sourceFiles.map((filePath) => path.relative(result.root, filePath).replace(/\\/g, "/")), [
    "src/app.ts"
  ]);
});

test("check can use an explicit external spec file without writing into the target root", () => {
  const result = runCheck({
    root: path.join(repoRoot, "fixtures/basic-ts-valid"),
    specPaths: [path.join(repoRoot, "fixtures/external-contracts/basic-main.axi")]
  });

  assert.deepEqual(result.violations, []);
  assert.deepEqual(result.specFiles, [path.join(repoRoot, "fixtures/external-contracts/basic-main.axi")]);
  assert.equal(result.spec.modules.find((module) => module.name === "Simulation")?.purpose, "external pilot contract");
});

test("check resolves TypeScript path aliases from tsconfig", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/tsconfig-paths") });

  assert.deepEqual(result.violations, []);
  assert.deepEqual(
    result.observedDependencies.map((dependency) => ({
      fromModule: dependency.fromModule,
      toModule: dependency.toModule,
      specifier: dependency.importRecord.specifier,
      resolvedPath: path.relative(result.root, dependency.importRecord.resolvedPath ?? "").replace(/\\/g, "/")
    })),
    [
      {
        fromModule: "App",
        toModule: "Shared",
        specifier: "@shared",
        resolvedPath: "src/shared/index.ts"
      }
    ]
  );
});

test("check resolves workspace package exports", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/package-exports") });

  assert.deepEqual(result.violations, []);
  assert.deepEqual(
    result.observedDependencies.map((dependency) => ({
      fromModule: dependency.fromModule,
      toModule: dependency.toModule,
      specifier: dependency.importRecord.specifier,
      resolvedPath: path.relative(result.root, dependency.importRecord.resolvedPath ?? "").replace(/\\/g, "/")
    })),
    [
      {
        fromModule: "App",
        toModule: "Shared",
        specifier: "@fixture/shared/feature",
        resolvedPath: "packages/shared/src/feature.ts"
      }
    ]
  );
});

test("check discovers common monorepo package specs by default", () => {
  const result = runCheck({ root: path.join(repoRoot, "examples/monorepo-workspace") });

  assert.deepEqual(result.specFiles.map((filePath) => path.relative(result.root, filePath).replace(/\\/g, "/")), [
    "apps/web/axiom/main.axi",
    "packages/shared/.axi"
  ]);
  assert.deepEqual(result.violations.map((violation) => violation.code), ["hidden_import"]);
  assert.deepEqual(
    result.observedDependencies.map((dependency) => ({
      fromModule: dependency.fromModule,
      toModule: dependency.toModule,
      specifier: dependency.importRecord.specifier,
      resolvedPath: path.relative(result.root, dependency.importRecord.resolvedPath ?? "").replace(/\\/g, "/")
    })),
    [
      {
        fromModule: "Web",
        toModule: "Shared",
        specifier: "@example/shared",
        resolvedPath: "packages/shared/src/index.ts"
      },
      {
        fromModule: "Web",
        toModule: "Shared",
        specifier: "@example/shared/internal/normalize",
        resolvedPath: "packages/shared/src/internal/normalize.ts"
      }
    ]
  );
});

test("unowned source files are ignored by default for partial adoption", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/unowned-source") });

  assert.deepEqual(result.violations, []);
  assert.deepEqual(result.warnings, []);
});

test("warn-unowned mode reports unowned source files without failing", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/unowned-source"), adoptionMode: "warn-unowned" });

  assert.deepEqual(result.violations, []);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0]?.code, "unowned_source_file");
  assert.equal(path.relative(result.root, result.warnings[0]?.location?.filePath ?? "").replace(/\\/g, "/"), "src/loose/helper.ts");
});

test("strict mode reports unowned source files as violations", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/unowned-source"), adoptionMode: "strict" });

  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0]?.code, "unowned_source_file");
  assert.deepEqual(result.warnings, []);
});

test("active intentional violations keep matching observed violations from failing check", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/suppressed-dependency") });

  assert.deepEqual(result.violations, []);
  assert.equal(result.suppressedViolations.length, 1);
  assert.equal(result.suppressedViolations[0]?.violation.code, "forbidden_dependency");
  assert.deepEqual(result.suppressedViolations[0]?.suppression, {
    fromModule: "Simulation",
    toModule: "Rendering",
    code: "forbidden_dependency",
    expiresOn: "2099-01-01",
    reason: "legacy renderer migration",
    location: {
      filePath: path.join(repoRoot, "fixtures/suppressed-dependency/axiom/main.axi"),
      line: 7
    }
  });
});

test("intentional violations can accept exposed hidden re-exports", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/accepted-hidden-reexport") });

  assert.deepEqual(result.violations, []);
  assert.equal(result.suppressedViolations.length, 1);
  assert.equal(result.suppressedViolations[0]?.violation.code, "hidden_reexport");
  assert.deepEqual(result.suppressedViolations[0]?.suppression, {
    fromModule: "Services",
    toModule: "Services",
    code: "hidden_reexport",
    expiresOn: "2099-01-01",
    reason: "legacy public barrel cleanup",
    location: {
      filePath: path.join(repoRoot, "fixtures/accepted-hidden-reexport/axiom/main.axi"),
      line: 5
    }
  });
});

test("path-scoped intentional violations only accept matching violation locations", () => {
  const root = path.join(repoRoot, "fixtures/accepted-hidden-reexport-scoped");
  const result = runCheck({ root });

  assert.equal(result.suppressedViolations.length, 1);
  assert.equal(result.suppressedViolations[0]?.violation.code, "hidden_reexport");
  assert.equal(
    path.relative(root, result.suppressedViolations[0]?.violation.location?.filePath ?? "").replace(/\\/g, "/"),
    "src/services/index.ts"
  );
  assert.deepEqual(result.suppressedViolations[0]?.suppression, {
    fromModule: "Services",
    toModule: "Services",
    code: "hidden_reexport",
    pathScope: "src/services/index.ts",
    expiresOn: "2099-01-01",
    reason: "legacy index barrel cleanup",
    location: {
      filePath: path.join(root, "axiom/main.axi"),
      line: 6
    }
  });

  assert.equal(result.violations.length, 1);
  assert.equal(result.violations[0]?.code, "hidden_reexport");
  assert.equal(path.relative(root, result.violations[0]?.location?.filePath ?? "").replace(/\\/g, "/"), "src/services/public.ts");
});

test("active intentional violations near expiration are reported as warnings", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/suppressed-dependency"), today: "2098-12-15" });

  assert.deepEqual(result.violations, []);
  assert.equal(result.suppressedViolations.length, 1);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0]?.code, "expiring_suppression");
  assert.equal(
    result.warnings[0]?.message,
    "Simulation has an intentional violation to Rendering that expires in 17 days."
  );
});

test("intentional violation expiration warning window can be configured", () => {
  const configRoot = fs.mkdtempSync(path.join(os.tmpdir(), "axi-expiry-window-config-"));
  const configPath = path.join(configRoot, "axiom.config.json");

  try {
    fs.writeFileSync(configPath, JSON.stringify({ intentionalViolationExpiryWarningDays: 10 }));

    const result = runCheck({
      root: path.join(repoRoot, "fixtures/suppressed-dependency"),
      configPath,
      today: "2098-12-15"
    });

    assert.deepEqual(result.violations, []);
    assert.equal(result.suppressedViolations.length, 1);
    assert.deepEqual(result.warnings, []);
  } finally {
    fs.rmSync(configRoot, { force: true, recursive: true });
  }
});

test("intentional violation expiration warning window can be overridden per check", () => {
  const result = runCheck({
    root: path.join(repoRoot, "fixtures/suppressed-dependency"),
    today: "2098-12-15",
    intentionalViolationExpiryWarningDays: 10
  });

  assert.deepEqual(result.violations, []);
  assert.equal(result.suppressedViolations.length, 1);
  assert.deepEqual(result.warnings, []);
});

test("expired intentional violations fail and leave the original violation visible", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/expired-suppression") });
  const codes = result.violations.map((violation) => violation.code);

  assert.deepEqual(codes, ["expired_suppression", "forbidden_dependency"]);
  assert.deepEqual(result.suppressedViolations, []);
});

test("invalid intentional violations fail before they can hide violations", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/invalid-suppression") });

  assert.deepEqual(result.violations.map((violation) => violation.code), [
    "invalid_suppression",
    "invalid_suppression"
  ]);
});

test("unused intentional violations are reported as warnings", () => {
  const result = runCheck({ root: path.join(repoRoot, "fixtures/unused-suppression") });

  assert.deepEqual(result.violations, []);
  assert.deepEqual(result.suppressedViolations, []);
  assert.equal(result.warnings.length, 1);
  assert.equal(result.warnings[0]?.code, "unused_suppression");
  assert.equal(result.warnings[0]?.message, "Simulation has an unused intentional violation for Rendering.");
});

function normalize(root: string, filePath: string | undefined): string | undefined {
  return filePath ? path.relative(root, filePath).replace(/\\/g, "/") : undefined;
}
