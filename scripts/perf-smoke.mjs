import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";

const options = parseArgs(process.argv.slice(2));
const cliPath = path.resolve("dist", "cli.js");

if (!fs.existsSync(cliPath)) {
  console.error("dist/cli.js was not found. Run npm run build before perf smoke.");
  process.exit(1);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "axiom-perf-smoke-"));
const startedAt = new Date();

try {
  const generateStart = performance.now();
  const fixture = generateProject(tempRoot, options);
  const generateMs = performance.now() - generateStart;

  const checkStart = performance.now();
  const result = spawnSync(process.execPath, [cliPath, "check", "--root", tempRoot], {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 64
  });
  const checkMs = performance.now() - checkStart;

  if (result.status !== 0) {
    console.error("Axiom perf smoke failed.");
    console.error(result.stdout);
    console.error(result.stderr);
    throw new Error(`Axiom exited with status ${result.status ?? 1}.`);
  }

  const summary = parseSummary(result.stdout);
  const report = {
    kind: "axiom.perf-smoke.v1",
    startedAt: startedAt.toISOString(),
    node: process.version,
    platform: `${process.platform} ${process.arch}`,
    cpu: os.cpus()[0]?.model ?? "unknown",
    fixture: {
      root: options.keep ? tempRoot : undefined,
      modules: options.modules,
      filesPerModule: options.filesPerModule,
      crossImportsPerFile: options.crossImportsPerFile,
      expectedSourceFiles: fixture.sourceFiles,
      expectedImports: fixture.imports
    },
    result: {
      exitCode: result.status,
      modules: summary.modules,
      sourceFiles: summary.sourceFiles,
      importsScanned: summary.importsScanned,
      observedDependencies: summary.observedDependencies,
      generateMs: round(generateMs),
      checkMs: round(checkMs),
      sourceFilesPerSecond: rate(summary.sourceFiles, checkMs),
      importsPerSecond: rate(summary.importsScanned, checkMs)
    }
  };

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    printTextReport(report);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (!options.keep) {
    cleanupTempRoot(tempRoot);
  }
}

function parseArgs(args) {
  const options = {
    modules: 50,
    filesPerModule: 40,
    crossImportsPerFile: 2,
    json: false,
    keep: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--modules") {
      options.modules = readPositiveInt(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--files-per-module") {
      options.filesPerModule = readPositiveInt(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--cross-imports-per-file") {
      options.crossImportsPerFile = readNonNegativeInt(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--json") {
      options.json = true;
      continue;
    }

    if (arg === "--keep") {
      options.keep = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    console.error(`Unknown option: ${arg}`);
    printHelp();
    process.exit(1);
  }

  return options;
}

function readPositiveInt(args, index, name) {
  const value = readNonNegativeInt(args, index, name);
  if (value < 1) {
    console.error(`${name} must be at least 1.`);
    process.exit(1);
  }
  return value;
}

function readNonNegativeInt(args, index, name) {
  const raw = args[index + 1];
  if (!raw) {
    console.error(`Missing value for ${name}.`);
    process.exit(1);
  }

  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    console.error(`${name} must be a non-negative integer.`);
    process.exit(1);
  }

  return value;
}

function generateProject(root, options) {
  fs.mkdirSync(path.join(root, "axiom"), { recursive: true });
  fs.writeFileSync(path.join(root, "axiom.config.json"), `${JSON.stringify({ include: ["packages/*/src/**"] }, null, 2)}\n`);

  const specLines = [];
  let sourceFiles = 0;
  let imports = 0;

  for (let moduleIndex = 0; moduleIndex < options.modules; moduleIndex += 1) {
    const moduleName = moduleNameFor(moduleIndex, options.modules);
    const packageName = packageNameFor(moduleIndex, options.modules);
    const srcDir = path.join(root, "packages", packageName, "src");
    fs.mkdirSync(srcDir, { recursive: true });

    specLines.push(`module ${moduleName}`);
    specLines.push(`path "packages/${packageName}/src/**"`);
    const dependencyCount = Math.min(options.crossImportsPerFile, moduleIndex);
    for (let offset = 1; offset <= dependencyCount; offset += 1) {
      specLines.push(`depends on ${moduleNameFor(moduleIndex - offset, options.modules)}`);
    }
    specLines.push("");

    for (let fileIndex = 0; fileIndex < options.filesPerModule; fileIndex += 1) {
      const fileName = fileNameFor(fileIndex, options.filesPerModule);
      const lines = [];
      for (let offset = 1; offset <= dependencyCount; offset += 1) {
        const dependencyPackage = packageNameFor(moduleIndex - offset, options.modules);
        lines.push(
          `import { value as value${offset} } from "../../${dependencyPackage}/src/${fileName}";`
        );
        imports += 1;
      }

      const sum = dependencyCount === 0
        ? String(fileIndex)
        : Array.from({ length: dependencyCount }, (_, itemIndex) => `value${itemIndex + 1}`).join(" + ");
      lines.push(`export const value = ${sum};`);
      fs.writeFileSync(path.join(srcDir, `${fileName}.ts`), `${lines.join("\n")}\n`);
      sourceFiles += 1;
    }
  }

  fs.writeFileSync(path.join(root, "axiom", "main.axi"), specLines.join("\n"));

  return { sourceFiles, imports };
}

function moduleNameFor(index, total) {
  return `Module${pad(index, total)}`;
}

function packageNameFor(index, total) {
  return `module-${pad(index, total)}`;
}

function fileNameFor(index, total) {
  return `file-${pad(index, total)}`;
}

function pad(value, total) {
  const width = Math.max(3, String(total - 1).length);
  return String(value).padStart(width, "0");
}

function parseSummary(output) {
  return {
    modules: readSummaryNumber(output, "modules"),
    sourceFiles: readSummaryNumber(output, "source files"),
    importsScanned: readSummaryNumber(output, "imports scanned"),
    observedDependencies: readSummaryNumber(output, "observed dependencies")
  };
}

function readSummaryNumber(output, label) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = output.match(new RegExp(`^${escapedLabel}:\\s+(\\d+)`, "m"));
  if (!match) {
    throw new Error(`Could not read '${label}' from Axiom output:\n${output}`);
  }
  return Number(match[1]);
}

function printTextReport(report) {
  console.log("Axiom performance smoke.");
  console.log(`fixture: ${report.fixture.modules} modules x ${report.fixture.filesPerModule} files/module`);
  console.log(`cross imports per file: ${report.fixture.crossImportsPerFile}`);
  if (report.fixture.root) {
    console.log(`root: ${report.fixture.root}`);
  }
  console.log(`modules: ${report.result.modules}`);
  console.log(`source files: ${report.result.sourceFiles}`);
  console.log(`imports scanned: ${report.result.importsScanned}`);
  console.log(`observed dependencies: ${report.result.observedDependencies}`);
  console.log(`fixture generation: ${report.result.generateMs} ms`);
  console.log(`axi check duration: ${report.result.checkMs} ms`);
  console.log(`source files/sec: ${report.result.sourceFilesPerSecond}`);
  console.log(`imports/sec: ${report.result.importsPerSecond}`);
  console.log("note: synthetic smoke only; use real repository runs before making CI promises.");
}

function printHelp() {
  console.log(`Axiom performance smoke.

Usage:
  node scripts/perf-smoke.mjs [--modules <n>] [--files-per-module <n>] [--cross-imports-per-file <n>] [--json] [--keep]

Defaults:
  --modules 50
  --files-per-module 40
  --cross-imports-per-file 2

The script generates a temporary synthetic TypeScript workspace and runs:
  node dist/cli.js check --root <temp-root>
`);
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function rate(count, ms) {
  if (ms <= 0) {
    return 0;
  }

  return Math.round((count / ms) * 1000);
}

function cleanupTempRoot(root) {
  const resolved = path.resolve(root);
  const temp = path.resolve(os.tmpdir());
  if (!resolved.startsWith(temp + path.sep) || !path.basename(resolved).startsWith("axiom-perf-smoke-")) {
    throw new Error(`Refusing to remove unexpected temp path: ${resolved}`);
  }

  fs.rmSync(resolved, { recursive: true, force: true });
}
