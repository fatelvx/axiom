import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const tempRoot = mkdtempSync(path.join(repoRoot, "node_modules", ".axiom-release-smoke-"));

try {
  const packDestination = path.relative(repoRoot, tempRoot);
  const pack = run("npm", ["pack", "--json", "--pack-destination", packDestination], { cwd: repoRoot });
  const packEntries = JSON.parse(pack.stdout);
  const filename = packEntries[0]?.filename;
  if (typeof filename !== "string" || filename.length === 0) {
    throw new Error(`npm pack did not return a tarball filename.\n${pack.stdout}`);
  }

  const tarballPath = path.join(tempRoot, filename);
  assertFile(tarballPath, "packed tarball");
  run("tar", ["-xzf", tarballPath, "-C", tempRoot], { cwd: repoRoot });

  const packageRoot = path.join(tempRoot, "package");
  const packageJsonPath = path.join(packageRoot, "package.json");
  assertFile(packageJsonPath, "package.json");

  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
  assertEqual(packageJson.name, "@fatelvx/axiom", "package name");
  assertEqual(packageJson.version, "0.6.0-alpha.1", "package version");
  assertDeepEqual(packageJson.bin, {
    axi: "dist/cli.js",
    "axi-mcp": "dist/mcp/server.js",
    axiom: "dist/cli.js",
    "axiom-mcp": "dist/mcp/server.js"
  }, "bin aliases");

  for (const filePath of [
    "README.md",
    "CHANGELOG.md",
    "dist/cli.js",
    "dist/mcp/server.js",
    "dist/mcp/tools.js",
    "dist/mcp/topSignals.js",
    "guides/mcp-preview.md",
    "guides/mcp-client-setup.md",
    "examples/basic-app/axiom/main.axi",
    "examples/spec-first-pilot/axiom/main.axi"
  ]) {
    assertFile(path.join(packageRoot, filePath), filePath);
  }

  const cliPath = path.join(packageRoot, "dist", "cli.js");
  const mcpPath = path.join(packageRoot, "dist", "mcp", "server.js");
  const specFirstRoot = path.join(packageRoot, "examples", "spec-first-pilot");
  const basicRoot = path.join(packageRoot, "examples", "basic-app");
  const monorepoRoot = path.join(packageRoot, "examples", "monorepo-workspace");
  const vueRoot = createVueSfcFixture(tempRoot);

  const passingCheck = run(process.execPath, [cliPath, "check", "--root", specFirstRoot, "--json"], { cwd: packageRoot });
  const passingPayload = JSON.parse(passingCheck.stdout);
  assertEqual(passingPayload.ok, true, "packaged spec-first check ok");
  assertEqual(passingPayload.summary?.violations, 0, "packaged spec-first violation count");

  const failingCheck = run(process.execPath, [cliPath, "check", "--root", basicRoot, "--json"], {
    acceptedExitCodes: [1],
    cwd: packageRoot
  });
  const failingPayload = JSON.parse(failingCheck.stdout);
  assertEqual(failingPayload.ok, false, "packaged basic-app check fails");
  assertArrayIncludes(
    failingPayload.violations?.map((violation) => violation.code),
    "hidden_import",
    "packaged basic-app hidden import"
  );

  const infer = run(process.execPath, [cliPath, "infer", "--root", specFirstRoot, "--json"], { cwd: packageRoot });
  const inferPayload = JSON.parse(infer.stdout);
  assertEqual(inferPayload.schemaVersion, "axiom.infer.v8", "packaged infer schema");
  assertTextIncludes(inferPayload.axi ?? "", "module", "packaged infer contract text");

  const vueCheck = run(process.execPath, [cliPath, "check", "--root", vueRoot, "--json"], {
    acceptedExitCodes: [1],
    cwd: packageRoot
  });
  const vuePayload = JSON.parse(vueCheck.stdout);
  assertEqual(vuePayload.summary?.sourceFiles, 4, "packaged Vue SFC source file count");
  assertEqual(vuePayload.summary?.importsScanned, 3, "packaged Vue SFC import count");
  assertArrayIncludes(vuePayload.sourceFiles, "src/App.vue", "packaged Vue SFC source list");
  assertArrayIncludes(
    vuePayload.violations?.map((violation) => violation.code),
    "hidden_import",
    "packaged Vue SFC hidden import"
  );

  const monorepoCheck = run(process.execPath, [cliPath, "check", "--root", monorepoRoot, "--json"], {
    acceptedExitCodes: [1],
    cwd: packageRoot
  });
  const monorepoPayload = JSON.parse(monorepoCheck.stdout);
  assertEqual(monorepoPayload.summary?.specFiles, 2, "packaged monorepo spec count");
  assertEqual(monorepoPayload.summary?.sourceFiles, 3, "packaged monorepo source count");
  assertArrayIncludes(
    monorepoPayload.violations?.map((violation) => violation.code),
    "hidden_import",
    "packaged monorepo hidden import"
  );

  const mcpHelp = run(process.execPath, [mcpPath, "--help"], { cwd: packageRoot });
  assertTextIncludes(`${mcpHelp.stdout}\n${mcpHelp.stderr}`, "Axiom MCP stdio server", "packaged MCP help");

  console.log("Release candidate smoke passed.");
  console.log("- packed the local package without publishing");
  console.log("- verified package contents and bin aliases");
  console.log("- ran packaged CLI against spec-first and failing examples");
  console.log("- ran packaged infer JSON from the extracted tarball");
  console.log("- verified packaged Vue SFC and monorepo path coverage");
  console.log("- verified packaged MCP server entry point");
} finally {
  rmSync(tempRoot, { force: true, recursive: true });
}

function createVueSfcFixture(tempRoot) {
  const root = path.join(tempRoot, "vue-sfc-fixture");

  writeFile(
    root,
    "axiom/main.axi",
    [
      "module App",
      "path \"src/App.vue\"",
      "depends on Components",
      "",
      "module Components",
      "path \"src/components/**\"",
      "exposes \"src/components/index.ts\"",
      "hides \"src/components/internal/**\""
    ].join("\n")
  );
  writeFile(
    root,
    "src/App.vue",
    [
      "<template>",
      "  <Widget />",
      "</template>",
      "<script setup lang=\"ts\">",
      "import { Widget } from \"./components\";",
      "import { secret } from \"./components/internal/secret\";",
      "const LazyWidget = () => import(\"./components/LazyWidget.vue\");",
      "</script>"
    ].join("\n")
  );
  writeFile(root, "src/components/index.ts", "export const Widget = 'widget';\n");
  writeFile(root, "src/components/internal/secret.ts", "export const secret = 'hidden';\n");
  writeFile(root, "src/components/LazyWidget.vue", "<script setup>\nconst name = 'lazy';\n</script>\n");

  return root;
}

function writeFile(root, relativePath, contents) {
  const filePath = path.join(root, relativePath);
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, `${contents}\n`);
}

function run(command, args, options = {}) {
  const acceptedExitCodes = options.acceptedExitCodes ?? [0];
  const invocation = normalizeInvocation(command, args);
  const result = spawnSync(invocation.command, invocation.args, {
    cwd: options.cwd,
    encoding: "utf8",
    shell: false,
    windowsHide: true
  });

  if (!acceptedExitCodes.includes(result.status ?? 1)) {
    throw new Error(
      [
        `Command failed: ${command} ${args.join(" ")}`,
        `exit: ${result.status}`,
        result.error ? `error: ${result.error.message}` : undefined,
        result.stdout ? `stdout:\n${result.stdout}` : undefined,
        result.stderr ? `stderr:\n${result.stderr}` : undefined
      ]
        .filter(Boolean)
        .join("\n")
    );
  }

  return result;
}

function normalizeInvocation(command, args) {
  if (process.platform === "win32" && command === "npm") {
    return {
      command: process.env.ComSpec ?? "cmd.exe",
      args: ["/d", "/s", "/c", "npm", ...args]
    };
  }

  return { command, args };
}

function assertFile(filePath, label) {
  if (!existsSync(filePath)) {
    throw new Error(`Expected ${label} at ${filePath}.`);
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new Error(`Expected ${label} to be ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
  }
}

function assertDeepEqual(actual, expected, label) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`Expected ${label} to be ${expectedJson}, got ${actualJson}.`);
  }
}

function assertArrayIncludes(values, expected, label) {
  if (!Array.isArray(values) || !values.includes(expected)) {
    throw new Error(`Expected ${label} to include ${JSON.stringify(expected)}.\nActual values:\n${JSON.stringify(values)}`);
  }
}

function assertTextIncludes(text, expected, label) {
  if (!text.includes(expected)) {
    throw new Error(`Expected ${label} to include ${JSON.stringify(expected)}.\nActual text:\n${text}`);
  }
}
