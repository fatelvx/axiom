import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
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
const servicesExampleRoot = path.join(repoRoot, "examples/spec-first-services-pilot");

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

  const cleanBaseline = createBaseline(cleanRoot);
  const cleanGraphPayload = cleanBaseline.payload;
  assertEqual(cleanGraphPayload.architectureSummary?.status, "clear", "clean graph status");
  assertEqual(cleanGraphPayload.summary?.violations, 0, "clean graph hard violation count");

  const cleanObserve = runAxi(["observe", "--root", cleanRoot, "--baseline", cleanBaseline.path, "--json"], 0);
  const cleanObservePayload = parseJson(cleanObserve.stdout, "clean observe output");
  assertEqual(cleanObservePayload.architectureSummary?.gate?.currentCommandIsGate, false, "clean observe is not a gate");
  assertEqual(cleanObservePayload.architectureSummary?.status, "clear", "clean observe status");
  assertTextIncludes(
    cleanObservePayload.architectureSummary?.reviewStory?.summary ?? "",
    "quiet",
    "clean observe review story"
  );
  assertEqual(readDriftCount(cleanObservePayload), 0, "clean observe baseline drift count");

  const cleanDiff = runAxi(["diff", cleanBaseline.path, "--root", cleanRoot, "--json"], 0);
  const cleanDiffPayload = parseJson(cleanDiff.stdout, "clean diff output");
  assertEqual(cleanDiffPayload.architectureSummary?.gate?.currentCommandIsGate, false, "clean diff is not a gate");
  assertEqual(readDriftCount(cleanDiffPayload), 0, "clean diff drift count");
  assertEqual(hashFile(cleanBaseline.path), cleanBaseline.hash, "clean baseline is not rewritten");

  runIntentionalDebtScenario();

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
    expectedCodes: ["hidden_import"],
    expectedMinimumDrift: 0
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
    expectedCodes: ["layer_breach"],
    expectedMinimumDrift: 1
  });

  runServicesBoundaryPilot();

  console.log("Spec-first validator smoke passed.");
  console.log("- reviewed example contract passed axi check");
  console.log("- baseline, diff, and observe review story stayed advisory in the clean artifact loop");
  console.log("- path-scoped intentional debt stayed visible without becoming a hidden allowlist");
  console.log("- hidden internal bypass failed as a hard visibility violation");
  console.log("- outward domain-to-UI import failed as a hard layer violation");
  console.log("- services-boundary pilot caught new deep service bypass and Services <-> Store drift");
} finally {
  rmSync(tempDirectory, { recursive: true, force: true });
}

function runIntentionalDebtScenario() {
  const scenarioRoot = copyExample("visible-intentional-debt");
  const baseline = createBaseline(scenarioRoot);
  const driftPath = "src/ui/legacyDomainPanel.ts";
  writeDriftFile(scenarioRoot, driftPath, [
    'import { normalizeUserName } from "../domain";',
    "",
    "export function renderLegacyDomainPanel(): string {",
    '  return normalizeUserName("Ada");',
    "}",
    ""
  ].join("\n"));

  const contractPath = path.join(scenarioRoot, "axiom", "main.axi");
  writeFileSync(
    contractPath,
    `${readFileSync(contractPath, "utf8").trimEnd()}\naccepts undeclared_dependency to Domain at "${driftPath}" until 2099-01-01 because "temporary application boundary migration"\n`,
    "utf8"
  );

  const acceptedCheck = runAxi(["check", "--root", scenarioRoot, "--json"], 0);
  const checkPayload = parseJson(acceptedCheck.stdout, "intentional debt check output");
  assertEqual(checkPayload.summary?.violations, 0, "intentional debt hard violation count");
  assertEqual(checkPayload.summary?.intentionalViolations, 1, "intentional debt check count");
  assertEqual(checkPayload.intentionalViolations?.[0]?.code, "undeclared_dependency", "intentional debt code");
  assertEqual(checkPayload.intentionalViolations?.[0]?.contract?.pathScope, driftPath, "intentional debt path scope");

  const acceptedObserve = runAxi(["observe", "--root", scenarioRoot, "--baseline", baseline.path, "--json"], 0);
  const observePayload = parseJson(acceptedObserve.stdout, "intentional debt observe output");
  assertEqual(observePayload.architectureSummary?.gate?.currentCommandIsGate, false, "intentional debt observe is not a gate");
  assertEqual(observePayload.summary?.violations, 0, "intentional debt observe hard violation count");
  assertEqual(observePayload.summary?.intentionalViolations, 1, "intentional debt observe count");
  assertEqual(observePayload.intentionalDebt?.[0]?.code, "undeclared_dependency", "intentional debt observe code");
  assertEqual(observePayload.intentionalDebt?.[0]?.pathScope, driftPath, "intentional debt observe path scope");
  assertMin(readDriftCount(observePayload), 1, "intentional debt baseline drift count");
  assertTextIncludes(
    observePayload.architectureSummary?.reviewStory?.summary ?? "",
    "visible",
    "intentional debt review story"
  );
  assertEqual(hashFile(baseline.path), baseline.hash, "intentional debt baseline is not rewritten");
}

function runServicesBoundaryPilot() {
  const cleanRoot = copyExample("services-boundary-clean", servicesExampleRoot);
  const cleanCheck = runAxi(["check", "--root", cleanRoot, "--json"], 0);
  const checkPayload = parseJson(cleanCheck.stdout, "services boundary check output");
  assertEqual(checkPayload.summary?.violations, 0, "services boundary hard violation count");
  assertEqual(checkPayload.summary?.intentionalViolations, 1, "services boundary visible debt count");
  assertEqual(checkPayload.intentionalViolations?.[0]?.code, "hidden_import", "services boundary debt code");
  assertEqual(
    checkPayload.intentionalViolations?.[0]?.contract?.pathScope,
    "src/components/LegacySettingsBridge.ts",
    "services boundary debt path scope"
  );

  const baseline = createBaseline(cleanRoot);
  assertEqual(baseline.payload.summary?.violations, 0, "services boundary baseline hard violation count");
  assertEqual(baseline.payload.summary?.intentionalViolations, 1, "services boundary baseline debt count");

  const observe = runAxi(["observe", "--root", cleanRoot, "--baseline", baseline.path, "--json"], 0);
  const observePayload = parseJson(observe.stdout, "services boundary observe output");
  assertEqual(observePayload.architectureSummary?.gate?.currentCommandIsGate, false, "services boundary observe is not a gate");
  assertEqual(observePayload.summary?.violations, 0, "services boundary observe hard violation count");
  assertEqual(observePayload.summary?.intentionalViolations, 1, "services boundary observe debt count");
  assertTextIncludes(
    observePayload.architectureSummary?.reviewStory?.summary ?? "",
    "visible",
    "services boundary debt review story"
  );
  assertEqual(hashFile(baseline.path), baseline.hash, "services boundary baseline is not rewritten");

  runMultiFileDriftScenario({
    name: "services-hidden-bypass",
    sourceRoot: servicesExampleRoot,
    files: [
      {
        filePath: "src/hooks/useUnsafeServiceStatus.ts",
        contents: [
          'import { readServiceStatus } from "../services/internal/agentLoop";',
          "",
          "export function useUnsafeServiceStatus(): string {",
          "  return readServiceStatus();",
          "}",
          ""
        ].join("\n")
      }
    ],
    expectedCodes: ["hidden_import"],
    expectedLocations: ["src/hooks/useUnsafeServiceStatus.ts"],
    expectedIntentionalViolations: 1,
    expectedMinimumDrift: 0
  });

  runMultiFileDriftScenario({
    name: "services-store-cycle-pressure",
    sourceRoot: servicesExampleRoot,
    files: [
      {
        filePath: "src/services/internal/agentLoop.ts",
        contents: [
          'import type { MessageDraft, SendReceipt } from "../../contracts";',
          'import { readLastQueuedConversation } from "../../store";',
          "",
          "export function runAgentLoop(draft: MessageDraft): SendReceipt {",
          "  return {",
          "    conversationId: readLastQueuedConversation() ?? draft.conversationId,",
          "    queued: draft.text.trim().length > 0",
          "  };",
          "}",
          "",
          "export function readServiceStatus(): string {",
          "  return \"ready\";",
          "}",
          ""
        ].join("\n")
      },
      {
        filePath: "src/store/internal/chatState.ts",
        contents: [
          'import type { SendReceipt } from "../../contracts";',
          'import { sendMessage } from "../../services";',
          "",
          "let lastReceipt: SendReceipt | undefined;",
          "",
          "export function rememberReceipt(receipt: SendReceipt): void {",
          "  lastReceipt = receipt;",
          "}",
          "",
          "export function readLastReceipt(): SendReceipt | undefined {",
          "  return lastReceipt;",
          "}",
          "",
          "export function replayLastReceipt(): SendReceipt | undefined {",
          "  return lastReceipt ? sendMessage({ conversationId: lastReceipt.conversationId, text: \"replay\" }) : undefined;",
          "}",
          ""
        ].join("\n")
      }
    ],
    expectedCodes: ["undeclared_dependency"],
    expectedLocations: ["src/services/internal/agentLoop.ts", "src/store/internal/chatState.ts"],
    expectedIntentionalViolations: 1,
    expectedMinimumDrift: 2
  });
}

function runDriftScenario(scenario) {
  runMultiFileDriftScenario({
    ...scenario,
    files: [
      {
        filePath: scenario.filePath,
        contents: scenario.contents
      }
    ],
    expectedLocations: [scenario.filePath]
  });
}

function runMultiFileDriftScenario(scenario) {
  const scenarioRoot = copyExample(scenario.name, scenario.sourceRoot ?? exampleRoot);
  const baseline = createBaseline(scenarioRoot);

  for (const file of scenario.files) {
    writeDriftFile(scenarioRoot, file.filePath, file.contents);
  }

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

  for (const location of scenario.expectedLocations) {
    assertIncludes(locations, location.replaceAll("\\", "/"), `${scenario.name} violation location`);
  }

  if (typeof scenario.expectedIntentionalViolations === "number") {
    assertEqual(
      payload.summary?.intentionalViolations,
      scenario.expectedIntentionalViolations,
      `${scenario.name} visible debt count`
    );
  }

  const review = runAxi(["observe", "--root", scenarioRoot, "--baseline", baseline.path, "--markdown"], 0);
  assertTextIncludes(review.stdout, "Status: failing contract", `${scenario.name} observe status`);
  if (scenario.expectedMinimumDrift > 0) {
    assertTextIncludes(review.stdout, "Architecture Drift", `${scenario.name} observe drift section`);
  }

  for (const code of scenario.expectedCodes) {
    assertTextIncludes(review.stdout, code, `${scenario.name} observe includes ${code}`);
  }

  const diff = runAxi(["diff", baseline.path, "--root", scenarioRoot, "--json"], 0);
  const diffPayload = parseJson(diff.stdout, `${scenario.name} diff output`);
  assertEqual(diffPayload.architectureSummary?.gate?.currentCommandIsGate, false, `${scenario.name} diff is not a gate`);
  assertMin(readDriftCount(diffPayload), scenario.expectedMinimumDrift, `${scenario.name} diff drift count`);
  assertEqual(hashFile(baseline.path), baseline.hash, `${scenario.name} baseline is not rewritten`);
}

function createBaseline(projectRoot) {
  const baselinePath = path.join(projectRoot, ".axi", "baselines", "current.graph.json");
  mkdirSync(path.dirname(baselinePath), { recursive: true });

  const graph = runAxi(["graph", "--root", projectRoot, "--json", "--portable"], 0);
  const payload = parseJson(graph.stdout, `${path.basename(projectRoot)} baseline graph output`);
  assertEqual(payload.root, ".", `${path.basename(projectRoot)} baseline uses portable root metadata`);
  assertEqual(payload.artifact?.kind, "graph_baseline", `${path.basename(projectRoot)} baseline artifact kind`);
  assertEqual(payload.artifact?.pathMode, "portable", `${path.basename(projectRoot)} baseline artifact path mode`);
  assertTextExcludes(graph.stdout, normalizePath(projectRoot), `${path.basename(projectRoot)} baseline excludes local root path`);
  writeFileSync(baselinePath, graph.stdout, "utf8");

  return {
    hash: hashFile(baselinePath),
    path: baselinePath,
    payload
  };
}

function writeDriftFile(projectRoot, relativePath, contents) {
  const absoluteDriftPath = path.join(projectRoot, relativePath);
  mkdirSync(path.dirname(absoluteDriftPath), { recursive: true });
  writeFileSync(absoluteDriftPath, contents, "utf8");
}

function copyExample(label, sourceRoot = exampleRoot) {
  const targetRoot = path.join(tempDirectory, safeSegment(label));
  copyDirectory(sourceRoot, targetRoot);
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

function assertMin(actual, minimum, label) {
  if (typeof actual !== "number" || actual < minimum) {
    throw new Error(`Expected ${label} to be at least ${minimum}, got ${JSON.stringify(actual)}.`);
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

function assertTextExcludes(text, unexpected, label) {
  if (text.includes(unexpected)) {
    throw new Error(`Expected ${label} to exclude ${JSON.stringify(unexpected)}.\nActual output:\n${text}`);
  }
}

function safeSegment(value) {
  return value.replace(/[^A-Za-z0-9._-]+/g, "-");
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
