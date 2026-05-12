import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const repoRoot = process.cwd();
const cliPath = path.join(repoRoot, "dist/cli.js");
const annotationHelperPath = path.join(repoRoot, "examples/github-actions/annotate-check.mjs");
const tempDirectory = mkdtempSync(path.join(tmpdir(), "axiom-github-actions-smoke-"));

try {
  const failingCheck = runNode([cliPath, "check", "--root", "examples/basic-app", "--json"], 1);
  const failingPayload = parseJson(failingCheck.stdout, "failing check output");

  assertEqual(failingPayload.schemaVersion, "axiom.check.v4", "failing check schema version");
  assertEqual(failingPayload.summary?.violations, 2, "failing check violation count");

  const failingJsonPath = path.join(tempDirectory, "basic-app.check.json");
  writeFileSync(failingJsonPath, failingCheck.stdout, "utf8");

  const annotations = runNode([annotationHelperPath, failingJsonPath], 0);
  assertIncludes(annotations.stdout, "::error file=src/ui/view.ts,line=2::unexposed_import", "unexposed import annotation");
  assertIncludes(annotations.stdout, "::error file=src/ui/view.ts,line=3::hidden_import", "hidden import annotation");

  const passingCheck = runNode([cliPath, "check", "--root", "fixtures/basic-ts-valid", "--json"], 0);
  const passingJsonPath = path.join(tempDirectory, "valid.check.json");
  writeFileSync(passingJsonPath, passingCheck.stdout, "utf8");

  const notice = runNode([annotationHelperPath, passingJsonPath], 0);
  assertIncludes(notice.stdout, "::notice::Axiom check passed:", "passing check notice");

  const markdownSummary = runNode([
    cliPath,
    "observe",
    "--root",
    "examples/basic-app",
    "--markdown",
    "--warn-public-api-surface",
    "--warn-unresolved-imports",
    "--warn-coupling-concentration"
  ], 0);

  assertIncludes(markdownSummary.stdout, "## Axiom Architecture Review", "Markdown architecture heading");
  assertIncludes(markdownSummary.stdout, "Status: failing contract", "Markdown failing contract status");
  assertIncludes(markdownSummary.stdout, "Review mode: observe (advisory)", "Markdown advisory review mode");
  assertIncludes(markdownSummary.stdout, "### Hard Violations", "Markdown hard violations section");

  console.log("GitHub Actions smoke passed.");
  console.log("- basic-app hard violations became GitHub error annotations");
  console.log("- passing check became a GitHub notice");
  console.log("- observe markdown produced PR review context without changing the gate");
} finally {
  rmSync(tempDirectory, { recursive: true, force: true });
}

function runNode(args, expectedStatus) {
  const result = spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: "utf8"
  });

  if (result.status !== expectedStatus) {
    throw new Error([
      `Expected command to exit ${expectedStatus}, got ${result.status}.`,
      `command: ${process.execPath} ${args.join(" ")}`,
      result.stdout ? `stdout:\n${result.stdout}` : undefined,
      result.stderr ? `stderr:\n${result.stderr}` : undefined
    ].filter(Boolean).join("\n"));
  }

  return result;
}

function parseJson(text, label) {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Failed to parse ${label}: ${error.message}`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`Expected ${label} to be ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
  }
}

function assertIncludes(text, pattern, label) {
  if (!text.includes(pattern)) {
    throw new Error(`Expected ${label} to include ${JSON.stringify(pattern)}.\nActual output:\n${text}`);
  }
}
