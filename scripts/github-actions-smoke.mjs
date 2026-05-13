import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const repoRoot = process.cwd();
const cliPath = path.join(repoRoot, "dist/cli.js");
const annotationHelperPath = path.join(repoRoot, "examples/github-actions/annotate-check.mjs");
const summaryHelperPath = path.join(repoRoot, "examples/github-actions/summarize-observe.mjs");
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

  const observeJson = runNode([
    cliPath,
    "observe",
    "--root",
    "examples/basic-app",
    "--json",
    "--warn-unresolved-imports",
    "--warn-coupling-concentration",
    "--warn-deep-internal-imports"
  ], 0);
  const observePayload = parseJson(observeJson.stdout, "observe JSON output");
  assertEqual(observePayload.schemaVersion, "axiom.graph.v11", "observe graph schema version");
  assertEqual(observePayload.architectureSummary?.status, "failing_contract", "observe architecture status");

  const observeJsonPath = path.join(tempDirectory, "basic-app.observe.json");
  writeFileSync(observeJsonPath, observeJson.stdout, "utf8");

  const stepSummary = runNode([summaryHelperPath, observeJsonPath], 0);
  assertIncludes(stepSummary.stdout, "## Axiom Architecture Summary", "step summary heading");
  assertIncludes(stepSummary.stdout, "Status: failing contract", "step summary failing status");
  assertIncludes(stepSummary.stdout, "### Interpretation", "step summary interpretation");
  assertIncludes(stepSummary.stdout, "Hard violation `unexposed_import`", "step summary hard violation");
  assertIncludes(stepSummary.stdout, "use `axi check` for CI failures", "step summary gate note");

  console.log("GitHub Actions smoke passed.");
  console.log("- basic-app hard violations became GitHub error annotations");
  console.log("- passing check became a GitHub notice");
  console.log("- observe JSON architectureSummary produced PR review context without changing the gate");
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
