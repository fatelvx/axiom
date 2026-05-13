import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const repoRoot = process.cwd();
const helperPath = path.join(repoRoot, "examples/github-actions/annotate-check.mjs");

test("GitHub annotation helper annotates hard Axiom violations only", () => {
  const payload = {
    schemaVersion: "axiom.check.v4",
    ok: false,
    summary: {
      modules: 2,
      sourceFiles: 2,
      importsScanned: 1,
      violations: 1,
      intentionalViolations: 1,
      warnings: 1
    },
    violations: [
      {
        code: "hidden_import",
        message: "UI imports hidden path from Services.",
        location: {
          filePath: "src/ui/view.ts",
          line: 3
        },
        details: {
          observed: "UI -> Services",
          rule: "Services hides src/services/internal/**",
          suggestion: "Import an exposed entry point from Services."
        }
      }
    ],
    intentionalViolations: [
      {
        code: "undeclared_dependency",
        message: "Accepted debt should not become an error annotation."
      }
    ],
    warnings: [
      {
        code: "broad_public_surface",
        message: "Advisory warnings should not become error annotations."
      }
    ]
  };

  const result = runHelper(payload);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /^::error file=src\/ui\/view\.ts,line=3::hidden_import/u);
  assert.match(result.stdout, /observed: UI -> Services/u);
  assert.match(result.stdout, /rule: Services hides src\/services\/internal\/\*\*/u);
  assert.match(result.stdout, /fix: Import an exposed entry point from Services\./u);
  assert.doesNotMatch(result.stdout, /broad_public_surface/u);
  assert.doesNotMatch(result.stdout, /undeclared_dependency/u);
});

test("GitHub annotation helper emits a notice for passing checks", () => {
  const payload = {
    schemaVersion: "axiom.check.v4",
    ok: true,
    summary: {
      modules: 3,
      sourceFiles: 3,
      importsScanned: 1,
      violations: 0,
      intentionalViolations: 0,
      warnings: 0
    },
    violations: []
  };

  const result = runHelper(payload);

  assert.equal(result.status, 0);
  assert.match(result.stdout, /^::notice::Axiom check passed: 3 modules, 3 files, 1 imports scanned\./u);
});

test("GitHub annotation helper accepts PowerShell UTF-16LE redirected JSON", () => {
  const payload = {
    schemaVersion: "axiom.check.v4",
    ok: false,
    summary: {
      modules: 1,
      sourceFiles: 1,
      importsScanned: 1,
      violations: 1
    },
    violations: [
      {
        code: "forbidden_dependency",
        message: "Core imports UI.",
        location: {
          filePath: "src/core/app.ts",
          line: 7
        },
        details: {
          observed: "Core -> UI"
        }
      }
    ]
  };

  const result = runHelperWithEncodedText(JSON.stringify(payload), "utf16le");

  assert.equal(result.status, 0);
  assert.match(result.stdout, /^::error file=src\/core\/app\.ts,line=7::forbidden_dependency/u);
});

test("GitHub annotation helper rejects non-check JSON payloads", () => {
  const payload = {
    schemaVersion: "axiom.graph.v11",
    summary: {},
    violations: []
  };

  const result = runHelper(payload);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /Expected an axiom\.check\.\* JSON payload/u);
});

function runHelper(payload: unknown) {
  return runHelperWithEncodedText(JSON.stringify(payload), "utf8");
}

function runHelperWithEncodedText(text: string, encoding: "utf8" | "utf16le") {
  const directory = mkdtempSync(path.join(tmpdir(), "axiom-annotation-test-"));
  const inputPath = path.join(directory, "axiom-check.json");

  try {
    if (encoding === "utf16le") {
      writeFileSync(inputPath, Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(text, "utf16le")]));
    } else {
      writeFileSync(inputPath, text, "utf8");
    }

    return spawnSync(process.execPath, [helperPath, inputPath], {
      cwd: repoRoot,
      encoding: "utf8"
    });
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}
