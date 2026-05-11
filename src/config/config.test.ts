import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { defaultSpecPatterns, loadConfig } from "./config.js";

test("loadConfig returns defaults when no config file exists", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "axi-config-default-"));

  try {
    assert.deepEqual(loadConfig(root), {
      include: [],
      exclude: [],
      specs: defaultSpecPatterns
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
        intentionalViolationExpiryWarningDays: 14
      })
    );

    const config = loadConfig(root);

    assert.deepEqual(config.include, ["src/**"]);
    assert.deepEqual(config.exclude, ["src/generated/**"]);
    assert.deepEqual(config.specs, ["architecture/**/*.axi"]);
    assert.equal(config.tsconfig, "tsconfig.app.json");
    assert.equal(config.intentionalViolationExpiryWarningDays, 14);
    assert.equal(config.filePath, path.join(root, "axiom.config.json"));
  } finally {
    fs.rmSync(root, { force: true, recursive: true });
  }
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
