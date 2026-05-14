import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const repoRoot = process.cwd();
const cliPath = path.join(repoRoot, "dist/cli.js");
const exampleRoot = path.join(repoRoot, "examples/spec-first-pilot");

if (!existsSync(cliPath)) {
  console.error("dist/cli.js was not found. Run npm run build before spec-first smoke.");
  process.exit(1);
}

const tempDirectory = mkdtempSync(path.join(tmpdir(), "axiom-spec-first-smoke-"));

try {
  const cleanRoot = copyExample("clean");
  const cleanCheck = runAxi(["check", "--root", cleanRoot, "--json"], 0);
  const cleanPayload = parseJson(cleanCheck.stdout, "clean check output");
  assertEqual(cleanPayload.schemaVersion, "axiom.check.v4", "clean check schema version");
  assertEqual(cleanPayload.summary?.violations, 0, "clean hard violation count");

  const cleanGraph = runAxi(["graph", "--root", cleanRoot, "--json"], 0);
  const cleanGraphPayload = parseJson(cleanGraph.stdout, "clean graph output");
  assertEqual(cleanGraphPayload.architectureSummary?.status, "clear", "clean graph status");
  assertEqual(cleanGraphPayload.summary?.violations, 0, "clean graph hard violation count");

  runDriftScenario({
    name: "hidden-internal-bypass",
    filePath: "src/ui/debugPanel.ts",
    contents: [
      'import { readUserRecord } from "../application/internal/persistence";',
      "",
      "export function renderDebugPanel(): string {",
      "  return readUserRecord().id;",
      "}",
      ""
    ].join("\n"),
    expectedCodes: ["hidden_import"]
  });

  runDriftScenario({
    name: "domain-ui-layer-breach",
    filePath: "src/domain/renderLeak.ts",
    contents: [
      'import { renderDashboard } from "../ui/view";',
      "",
      "export const leakedRenderer = renderDashboard;",
      ""
    ].join("\n"),
    expectedCodes: ["layer_breach"]
  });

  console.log("Spec-first validator smoke passed.");
  console.log("- reviewed example contract passed axi check");
  console.log("- hidden internal bypass failed as a hard visibility violation");
  console.log("- outward domain-to-UI import failed as a hard layer violation");
} finally {
  rmSync(tempDirectory, { recursive: true, force: true });
}

function runDriftScenario(scenario) {
  const scenarioRoot = copyExample(scenario.name);
  const absoluteDriftPath = path.join(scenarioRoot, scenario.filePath);
  mkdirSync(path.dirname(absoluteDriftPath), { recursive: true });
  writeFileSync(absoluteDriftPath, scenario.contents, "utf8");

  const failedCheck = runAxi(["check", "--root", scenarioRoot, "--json"], 1);
  const payload = parseJson(failedCheck.stdout, `${scenario.name} check output`);
  const codes = new Set((payload.violations ?? []).map((violation) => violation.code));

  for (const code of scenario.expectedCodes) {
    assertIncludes(codes, code, `${scenario.name} expected hard violation ${code}`);
  }

  const locations = new Set(
    (payload.violations ?? [])
      .filter((violation) => scenario.expectedCodes.includes(violation.code))
      .map((violation) => violation.location?.filePath)
      .filter(Boolean)
  );
  assertIncludes(locations, scenario.filePath.replaceAll("\\", "/"), `${scenario.name} violation location`);

  const review = runAxi(["observe", "--root", scenarioRoot, "--markdown"], 0);
  assertTextIncludes(review.stdout, "Status: failing contract", `${scenario.name} observe status`);

  for (const code of scenario.expectedCodes) {
    assertTextIncludes(review.stdout, code, `${scenario.name} observe includes ${code}`);
  }
}

function copyExample(label) {
  const targetRoot = path.join(tempDirectory, safeSegment(label));
  copyDirectory(exampleRoot, targetRoot);
  return targetRoot;
}

function copyDirectory(source, target) {
  mkdirSync(target, { recursive: true });

  for (const entry of readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
      continue;
    }

    if (entry.isFile()) {
      writeFileSync(targetPath, readFileSync(sourcePath));
    }
  }
}

function runAxi(args, expectedStatus) {
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: repoRoot,
    encoding: "utf8"
  });

  if (result.status !== expectedStatus) {
    throw new Error([
      `Expected command to exit ${expectedStatus}, got ${result.status}.`,
      `command: ${process.execPath} ${[cliPath, ...args].join(" ")}`,
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

function assertIncludes(values, expected, label) {
  if (!values.has(expected)) {
    throw new Error(`Expected ${label} to include ${JSON.stringify(expected)}.`);
  }
}

function assertTextIncludes(text, expected, label) {
  if (!text.includes(expected)) {
    throw new Error(`Expected ${label} to include ${JSON.stringify(expected)}.\nActual output:\n${text}`);
  }
}

function safeSegment(value) {
  return value.replace(/[^A-Za-z0-9._-]+/g, "-");
}
