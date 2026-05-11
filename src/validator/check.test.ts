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
