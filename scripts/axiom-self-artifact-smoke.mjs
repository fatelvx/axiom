import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const repoRoot = process.cwd();
const cliPath = path.join(repoRoot, "dist/cli.js");
const warningArgs = ["--warn-large-files", "--warn-coupling-concentration"];

if (!existsSync(cliPath)) {
  console.error("dist/cli.js was not found. Run npm run build before Axiom self artifact smoke.");
  process.exit(1);
}

const tempDirectory = mkdtempSync(path.join(tmpdir(), "axiom-self-artifact-smoke-"));

try {
  const gate = runAxi(["check", "--root", ".", "--strict", "--json"], 0);
  const gatePayload = parseJson(gate.stdout, "self check output");
  assertEqual(gatePayload.ok, true, "self check ok");
  assertEqual(gatePayload.summary?.violations, 0, "self check hard violation count");
  assertEqual(
    gatePayload.summary?.intentionalViolations,
    gatePayload.intentionalViolations?.length ?? 0,
    "self check visible debt ledger count"
  );

  const baseline = createBaseline();
  assertEqual(baseline.payload.root, ".", "self baseline uses portable root metadata");
  assertEqual(baseline.payload.artifact?.kind, "graph_baseline", "self baseline artifact kind");
  assertEqual(baseline.payload.artifact?.pathMode, "portable", "self baseline artifact path mode");
  assertTextExcludes(baseline.text, normalizePath(repoRoot), "self portable baseline does not include the local repository root");
  assertEqual(baseline.payload.filters?.violationsOnly, false, "self baseline is unfiltered");
  assertEqual(baseline.payload.filters?.attention, false, "self baseline is not attention-filtered");
  assertEqual(baseline.payload.architectureSummary?.gate?.currentCommandIsGate, false, "self baseline graph is not a gate");
  assertEqual(baseline.payload.summary?.violations, 0, "self baseline hard violation count");
  assertEqual(baseline.payload.summary?.intentionalViolations, gatePayload.summary?.intentionalViolations, "self baseline debt count");
  assertEqual(readDriftCount(baseline.payload), 0, "self baseline drift count");
  assertNonEmptyText(baseline.payload.architectureSummary?.reviewStory?.summary, "self baseline review story");

  const observe = runAxi(
    ["observe", "--root", ".", "--strict", "--baseline", baseline.path, "--json", ...warningArgs],
    0
  );
  const observePayload = parseJson(observe.stdout, "self observe output");
  assertEqual(observePayload.architectureSummary?.gate?.currentCommandIsGate, false, "self observe is not a gate");
  assertEqual(observePayload.summary?.violations, 0, "self observe hard violation count");
  assertEqual(observePayload.summary?.intentionalViolations, gatePayload.summary?.intentionalViolations, "self observe debt count");
  assertEqual(readDriftCount(observePayload), 0, "self observe drift count");
  assertNonEmptyText(observePayload.architectureSummary?.reviewStory?.summary, "self observe review story");
  assertEqual(hashFile(baseline.path), baseline.hash, "self baseline is not rewritten by observe");

  const observeMarkdown = runAxi(
    ["observe", "--root", ".", "--strict", "--baseline", baseline.path, "--markdown", ...warningArgs],
    0
  );
  assertTextIncludes(observeMarkdown.stdout, "Review mode: observe (advisory)", "self observe markdown advisory mode");
  assertTextIncludes(observeMarkdown.stdout, "### Review Story", "self observe markdown review story");
  assertTextIncludes(observeMarkdown.stdout, "### Advisory Signals", "self observe markdown advisory signals section");
  assertTextIncludes(
    observeMarkdown.stdout,
    "do not refactor solely to reduce signal counts",
    "self observe markdown advisory guardrail"
  );

  const diff = runAxi(["diff", baseline.path, "--root", ".", "--strict", "--json", ...warningArgs], 0);
  const diffPayload = parseJson(diff.stdout, "self diff output");
  assertEqual(diffPayload.architectureSummary?.gate?.currentCommandIsGate, false, "self diff is not a gate");
  assertEqual(diffPayload.summary?.violations, 0, "self diff hard violation count");
  assertEqual(readDriftCount(diffPayload), 0, "self diff drift count");
  assertEqual(hashFile(baseline.path), baseline.hash, "self baseline is not rewritten by diff");

  console.log("Axiom self artifact smoke passed.");
  console.log("- self-contract passed as the hard gate");
  console.log("- saved a portable unfiltered graph baseline in a temp directory");
  console.log("- observe and diff stayed advisory and reported zero baseline drift");
  console.log("- observe markdown preserved reviewStory and advisory-signal guardrails");
  console.log("- review commands did not rewrite the saved baseline");
} finally {
  rmSync(tempDirectory, { force: true, recursive: true });
}

function createBaseline() {
  const baselinePath = path.join(tempDirectory, "axiom-self.graph.json");
  mkdirSync(path.dirname(baselinePath), { recursive: true });

  const graph = runAxi(["graph", "--root", ".", "--strict", "--json", "--portable", ...warningArgs], 0);
  const payload = parseJson(graph.stdout, "self graph baseline output");
  writeFileSync(baselinePath, graph.stdout, "utf8");

  return {
    hash: hashFile(baselinePath),
    path: baselinePath,
    payload,
    text: graph.stdout
  };
}

function runAxi(args, expectedStatus) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  if (result.status !== expectedStatus) {
    throw new Error(
      [
        `Expected command to exit ${expectedStatus}, got ${result.status}.`,
        `command: ${process.execPath} ${[cliPath, ...args].join(" ")}`,
        result.stdout ? `stdout:\n${result.stdout}` : undefined,
        result.stderr ? `stderr:\n${result.stderr}` : undefined
      ]
        .filter(Boolean)
        .join("\n")
    );
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

function assertNonEmptyText(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Expected ${label} to be non-empty text.`);
  }
}

function assertTextIncludes(text, expected, label) {
  if (!text.includes(expected)) {
    throw new Error(`Expected ${label} to include ${JSON.stringify(expected)}.\nActual output:\n${text}`);
  }
}

function assertTextExcludes(text, unexpected, label) {
  if (text.includes(unexpected)) {
    throw new Error(`Expected ${label} to exclude ${JSON.stringify(unexpected)}.\nActual output:\n${text}`);
  }
}

function hashFile(filePath) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function readDriftCount(payload) {
  return (payload.drift?.newObservedEdges?.length ?? 0) + (payload.drift?.removedObservedEdges?.length ?? 0);
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/");
}
