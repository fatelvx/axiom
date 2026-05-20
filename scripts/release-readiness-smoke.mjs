import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const packageJson = readJson("package.json");
const packageVersion = packageJson.version;

const publicTextFiles = [
  "README.md",
  ...listMarkdownFiles("guides"),
  ...listFiles("examples/github-actions").filter((filePath) => filePath.endsWith(".md") || filePath.endsWith(".yml")),
  ...listFiles(".github").filter((filePath) => filePath.endsWith(".yml") || filePath.endsWith(".yaml"))
];

const requiredPackageFiles = [
  "README.md",
  "CHANGELOG.md",
  "CONTRIBUTING.md",
  "LICENSE",
  "assets/banner.png",
  "assets/banner.svg",
  "assets/logo.svg",
  "guides/",
  "examples/basic-app/",
  "examples/github-actions/",
  "examples/monorepo-workspace/",
  "examples/spec-first-pilot/",
  "examples/spec-first-python-package-pilot/",
  "examples/spec-first-python-pilot/",
  "examples/spec-first-services-pilot/"
];

const requiredAlphaChecks = [
  "npm run release:readiness",
  "npm run ci",
  "npm run axiom:self:artifact",
  "npm run spec-first:smoke",
  "npm run mcp:smoke",
  "npm run mcp:agent-loop:smoke",
  "npm run mcp:conformance:smoke",
  "npm run github-actions:smoke",
  "npm run release:candidate:smoke",
  "npm run pack:dry-run"
];

const failures = [];

assertEqual(packageJson.name, "@fatelvx/axiom", "package name");
assertEqual(packageJson.bin?.axi, "dist/cli.js", "axi bin");
assertEqual(packageJson.bin?.axiom, "dist/cli.js", "axiom bin");
assertEqual(packageJson.bin?.["axi-mcp"], "dist/mcp/server.js", "axi-mcp bin");
assertEqual(packageJson.bin?.["axiom-mcp"], "dist/mcp/server.js", "axiom-mcp bin");
assertArrayIncludesAll(packageJson.files ?? [], requiredPackageFiles, "package files");
assertScriptIncludes("alpha:check", requiredAlphaChecks);

for (const relativePath of publicTextFiles) {
  const text = readText(relativePath);
  assertNoUnsafeAxiomInstallSnippets(relativePath, text);
  assertNoUnsafeNpxSnippets(relativePath, text);
  assertPinnedAxiomVersions(relativePath, text);
}

assertMcpSetupIssueRoutingDocs();

if (failures.length > 0) {
  throw new Error(`Release readiness smoke failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}`);
}

console.log("Release readiness smoke passed.");
console.log(`- public install snippets are pinned to @fatelvx/axiom@${packageVersion}`);
console.log("- public install snippets keep --ignore-scripts and --save-exact");
console.log("- public npx snippets use --no-install for Axiom bins");
console.log("- package files include the release guides, assets, and examples");
console.log("- alpha:check includes the expected readiness, validation, MCP, release, and pack gates");
console.log("- MCP guides preserve setupIssues/hardViolations routing guidance");

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function listMarkdownFiles(relativeDirectory) {
  return listFiles(relativeDirectory).filter((filePath) => filePath.endsWith(".md"));
}

function listFiles(relativeDirectory) {
  const root = path.join(repoRoot, relativeDirectory);
  if (!existsSync(root)) {
    return [];
  }

  const files = [];
  const stack = [relativeDirectory];

  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(path.join(repoRoot, current), { withFileTypes: true })) {
      const relativePath = path.join(current, entry.name).replaceAll("\\", "/");
      if (entry.isDirectory()) {
        stack.push(relativePath);
      } else if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  }

  return files.sort();
}

function assertNoUnsafeAxiomInstallSnippets(relativePath, text) {
  for (const line of lines(text)) {
    if (!/\bnpm\s+(?:install|i)\b/.test(line) || !line.includes("@fatelvx/axiom")) {
      continue;
    }

    if (line.includes("./fatelvx-axiom-<version>.tgz")) {
      if (!line.includes("--ignore-scripts")) {
        fail(relativePath, "local tarball install snippets must include --ignore-scripts", line);
      }
      continue;
    }

    if (!line.includes(`@fatelvx/axiom@${packageVersion}`)) {
      fail(relativePath, `install snippet must pin @fatelvx/axiom@${packageVersion}`, line);
    }

    if (!line.includes("--ignore-scripts")) {
      fail(relativePath, "install snippet must include --ignore-scripts", line);
    }

    if (!line.includes("--save-exact")) {
      fail(relativePath, "install snippet must include --save-exact", line);
    }
  }
}

function assertNoUnsafeNpxSnippets(relativePath, text) {
  for (const line of lines(text)) {
    if (!/\bnpx\b/.test(line) || !/\baxi(?:om)?\b/.test(line)) {
      continue;
    }

    if (!line.includes("--no-install")) {
      fail(relativePath, "Axiom npx snippets must include --no-install", line);
    }

    if (/npx\s+@fatelvx\/axiom\b/.test(line) || /npx\s+axi(?:om)?\b/.test(line)) {
      fail(relativePath, "Axiom npx snippets must run the local bin, not fetch a package", line);
    }
  }
}

function assertPinnedAxiomVersions(relativePath, text) {
  const matches = text.matchAll(/@fatelvx\/axiom@([^\s`"']+)/g);

  for (const match of matches) {
    const version = match[1];
    if (version !== packageVersion) {
      fail(relativePath, `expected @fatelvx/axiom@${packageVersion}, got @fatelvx/axiom@${version}`, match[0]);
    }
  }
}

function assertScriptIncludes(scriptName, expectedParts) {
  const script = packageJson.scripts?.[scriptName];
  if (typeof script !== "string") {
    failures.push(`package.json scripts.${scriptName} is missing.`);
    return;
  }

  for (const expectedPart of expectedParts) {
    if (!script.includes(expectedPart)) {
      failures.push(`package.json scripts.${scriptName} must include ${JSON.stringify(expectedPart)}.`);
    }
  }
}

function assertMcpSetupIssueRoutingDocs() {
  assertTextIncludesAll("guides/mcp-preview.md", [
    "summary.counts.setupIssues",
    "summary.counts.hardViolations",
    "Setup issues are not code architecture drift"
  ]);
  assertTextIncludesAll("guides/mcp-conformance.md", [
    "summary.counts.setupIssues",
    "summary.counts.hardViolations",
    "no_spec_files",
    "no_source_files"
  ]);
  assertTextIncludesAll("guides/agent-loop.md", [
    "summary.counts.setupIssues",
    "summary.counts.hardViolations",
    "scan setup evidence"
  ]);
  assertTextIncludesAll("guides/json-consumers.md", [
    "summary.counts.setupIssues",
    "summary.counts.hardViolations",
    "payload.violations[]"
  ]);
}

function assertTextIncludesAll(relativePath, expectedParts) {
  const text = readText(relativePath);
  for (const expectedPart of expectedParts) {
    if (!text.includes(expectedPart)) {
      failures.push(`${relativePath} must include ${JSON.stringify(expectedPart)}.`);
    }
  }
}

function assertArrayIncludesAll(values, requiredValues, label) {
  if (!Array.isArray(values)) {
    failures.push(`${label} must be an array.`);
    return;
  }

  for (const requiredValue of requiredValues) {
    if (!values.includes(requiredValue)) {
      failures.push(`${label} must include ${JSON.stringify(requiredValue)}.`);
    }
  }
}

function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    failures.push(`${label} must be ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
  }
}

function lines(text) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function fail(relativePath, message, line) {
  failures.push(`${relativePath}: ${message}: ${line}`);
}
