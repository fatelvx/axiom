import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { applyDiscoveryOverrides, defaultSpecPatterns, loadConfig } from "./config.js";

test("loadConfig returns defaults when no config file exists", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-config-default-"));

  try {
    assert.deepEqual(loadConfig(root), {
      include: [],
      exclude: [],
      specs: defaultSpecPatterns,
      pythonImportRoots: [],
      warnUnresolvedImports: false,
      warnDynamicImports: false,
      warnPublicApiSurface: false,
      warnCouplingConcentration: false,
      warnDeepInternalImports: false,
      warnLargeFiles: false
    });
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("loadConfig reads axiom.config.json from the project root", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-config-root-"));

  try {
    fs.writeFileSync(
      path.join(root, "axiom.config.json"),
      JSON.stringify({
        include: ["src/**"],
        exclude: ["src/generated/**"],
        specs: ["architecture/**/*.axi"],
        tsconfig: "tsconfig.app.json",
        pythonImportRoots: ["src/common", "src/ui"],
        intentionalViolationExpiryWarningDays: 14,
        warnUnresolvedImports: true,
        warnDynamicImports: true,
        warnPublicApiSurface: true,
        warnCouplingConcentration: true,
        warnDeepInternalImports: true,
        warnLargeFiles: true
      })
    );

    const config = loadConfig(root);

    assert.deepEqual(config.include, ["src/**"]);
    assert.deepEqual(config.exclude, ["src/generated/**"]);
    assert.deepEqual(config.specs, ["architecture/**/*.axi"]);
    assert.equal(config.tsconfig, "tsconfig.app.json");
    assert.deepEqual(config.pythonImportRoots, ["src/common", "src/ui"]);
    assert.equal(config.intentionalViolationExpiryWarningDays, 14);
    assert.equal(config.warnUnresolvedImports, true);
    assert.equal(config.warnDynamicImports, true);
    assert.equal(config.warnPublicApiSurface, true);
    assert.equal(config.warnCouplingConcentration, true);
    assert.equal(config.warnDeepInternalImports, true);
    assert.equal(config.warnLargeFiles, true);
    assert.equal(config.filePath, path.join(root, "axiom.config.json"));
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("loadConfig accepts UTF-8 BOM config files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-config-bom-"));

  try {
    fs.writeFileSync(path.join(root, "axiom.config.json"), `\uFEFF${JSON.stringify({ include: ["src/**"] })}`);

    const config = loadConfig(root);

    assert.deepEqual(config.include, ["src/**"]);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("applyDiscoveryOverrides appends CLI source scope patterns", () => {
  const config = {
    include: ["src/**"],
    exclude: ["src/generated/**"],
    specs: defaultSpecPatterns,
    pythonImportRoots: [],
    warnUnresolvedImports: false,
    warnDynamicImports: false,
    warnPublicApiSurface: false,
    warnCouplingConcentration: false,
    warnDeepInternalImports: false,
    warnLargeFiles: false
  };

  assert.deepEqual(
    applyDiscoveryOverrides(config, {
      include: ["packages/*/src/**"],
      exclude: ["src/**/*.test.ts"]
    }),
    {
      ...config,
      include: ["src/**", "packages/*/src/**"],
      exclude: ["src/generated/**", "src/**/*.test.ts"]
    }
  );
});

test("loadConfig rejects non-string pattern arrays", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-config-invalid-"));

  try {
    fs.writeFileSync(path.join(root, "axiom.config.json"), JSON.stringify({ include: ["src/**", 42] }));

    assert.throws(() => loadConfig(root), /include/);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("loadConfig rejects invalid intentional violation warning windows", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-config-invalid-warning-days-"));

  try {
    fs.writeFileSync(path.join(root, "axiom.config.json"), JSON.stringify({ intentionalViolationExpiryWarningDays: -1 }));

    assert.throws(() => loadConfig(root), /intentionalViolationExpiryWarningDays/);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("loadConfig rejects invalid Python import roots", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-config-invalid-python-roots-"));

  try {
    fs.writeFileSync(path.join(root, "axiom.config.json"), JSON.stringify({ pythonImportRoots: ["src", 42] }));

    assert.throws(() => loadConfig(root), /pythonImportRoots/);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("loadConfig rejects invalid public API surface warning setting", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-config-invalid-public-surface-"));

  try {
    fs.writeFileSync(path.join(root, "axiom.config.json"), JSON.stringify({ warnPublicApiSurface: "yes" }));

    assert.throws(() => loadConfig(root), /warnPublicApiSurface/);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("loadConfig rejects invalid unresolved import warning setting", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-config-invalid-unresolved-imports-"));

  try {
    fs.writeFileSync(path.join(root, "axiom.config.json"), JSON.stringify({ warnUnresolvedImports: "yes" }));

    assert.throws(() => loadConfig(root), /warnUnresolvedImports/);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("loadConfig rejects invalid dynamic import warning setting", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-config-invalid-dynamic-imports-"));

  try {
    fs.writeFileSync(path.join(root, "axiom.config.json"), JSON.stringify({ warnDynamicImports: "yes" }));

    assert.throws(() => loadConfig(root), /warnDynamicImports/);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("loadConfig rejects invalid coupling concentration warning setting", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-config-invalid-coupling-concentration-"));

  try {
    fs.writeFileSync(path.join(root, "axiom.config.json"), JSON.stringify({ warnCouplingConcentration: "yes" }));

    assert.throws(() => loadConfig(root), /warnCouplingConcentration/);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("loadConfig rejects invalid deep internal import warning setting", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-config-invalid-deep-internal-imports-"));

  try {
    fs.writeFileSync(path.join(root, "axiom.config.json"), JSON.stringify({ warnDeepInternalImports: "yes" }));

    assert.throws(() => loadConfig(root), /warnDeepInternalImports/);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});

test("loadConfig rejects invalid large file warning setting", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-config-invalid-large-files-"));

  try {
    fs.writeFileSync(path.join(root, "axiom.config.json"), JSON.stringify({ warnLargeFiles: "yes" }));

    assert.throws(() => loadConfig(root), /warnLargeFiles/);
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
});
