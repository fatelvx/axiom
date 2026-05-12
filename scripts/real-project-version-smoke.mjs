import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";

const defaultRefs = ["v3.25.76", "v4.0.1", "v4.4.3"];
const defaultRepo = "https://github.com/colinhacks/zod.git";
const defaultName = "zod";
const defaultWarnings = ["coupling", "deep", "public-api"];
const options = parseArgs(process.argv.slice(2));
const cliPath = path.resolve("dist", "cli.js");
const startedAt = new Date();

if (!fs.existsSync(cliPath)) {
  console.error("dist/cli.js was not found. Run npm run build before real-project version smoke.");
  process.exit(1);
}

const workRoot = options.workdir
  ? path.resolve(options.workdir)
  : fs.mkdtempSync(path.join(os.tmpdir(), "axiom-real-project-version-smoke-"));

try {
  fs.mkdirSync(workRoot, { recursive: true });
  const results = [];

  for (const ref of options.refs) {
    results.push(runRefSmoke(ref));
  }

  const report = {
    kind: "axiom.real-project-version-smoke.v1",
    generatedAt: startedAt.toISOString(),
    repo: options.repo,
    name: options.name,
    refs: options.refs,
    groupBy: options.groupBy,
    warningFlags: warningFlags(options.warnings),
    node: process.version,
    platform: `${process.platform} ${process.arch}`,
    workRoot: options.keep ? normalizePath(workRoot) : undefined,
    results,
    comparisons: compareResults(results)
  };

  const json = JSON.stringify(report, null, 2);
  const markdown = formatMarkdownReport(report);

  if (options.jsonOut) {
    writeTextFile(options.jsonOut, `${json}\n`);
  }

  if (options.markdownOut) {
    writeTextFile(options.markdownOut, markdown);
  }

  if (options.json) {
    console.log(json);
  } else {
    console.log(markdown);
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  if (!options.keep && !options.workdir) {
    cleanupTempRoot(workRoot);
  }
}

function runRefSmoke(ref) {
  const repoRoot = path.join(workRoot, safeSegment(`${options.name}-${ref}`));
  removeExistingRefRoot(repoRoot);
  const cloneStart = performance.now();
  runCommand("git", ["clone", "--depth", "1", "--branch", ref, options.repo, repoRoot], {
    label: `git clone ${ref}`
  });
  const cloneMs = performance.now() - cloneStart;
  const commit = runCapture("git", ["-C", repoRoot, "rev-parse", "--short", "HEAD"], {
    label: `git rev-parse ${ref}`
  }).trim();
  const packageVersion = readPackageVersion(repoRoot);

  const infer = timedCapture(process.execPath, [cliPath, "infer", "--root", repoRoot, "--group-by", options.groupBy], {
    label: `axi infer ${ref}`
  });
  const axiomDir = path.join(repoRoot, "axiom");
  fs.mkdirSync(axiomDir, { recursive: true });
  fs.writeFileSync(path.join(axiomDir, "main.axi"), ensureTrailingNewline(infer.stdout));

  const commonWarningFlags = warningFlags(options.warnings);
  const check = timedCapture(process.execPath, [cliPath, "check", "--root", repoRoot, "--json", ...commonWarningFlags], {
    label: `axi check ${ref}`
  });
  const graph = timedCapture(process.execPath, [cliPath, "graph", "--root", repoRoot, "--json", ...commonWarningFlags], {
    label: `axi graph ${ref}`
  });

  const checkJson = JSON.parse(check.stdout);
  const graphJson = JSON.parse(graph.stdout);
  const uniqueEdges = uniqueObservedEdges(graphJson.observedDependencies);
  const warnings = summarizeWarnings(graphJson.warnings);

  return {
    ref,
    commit,
    packageVersion,
    root: options.keep ? normalizePath(repoRoot) : undefined,
    summary: {
      modules: checkJson.summary.modules,
      sourceFiles: checkJson.summary.sourceFiles,
      importsScanned: checkJson.summary.importsScanned,
      observedImportSites: checkJson.summary.observedDependencies,
      uniqueObservedEdges: uniqueEdges.length,
      hardViolations: checkJson.summary.violations,
      intentionalViolations: checkJson.summary.intentionalViolations,
      advisoryWarnings: checkJson.summary.warnings
    },
    uniqueEdges,
    warnings,
    timingsMs: {
      clone: round(cloneMs),
      infer: round(infer.ms),
      check: round(check.ms),
      graph: round(graph.ms)
    }
  };
}

function parseArgs(args) {
  const parsed = {
    repo: defaultRepo,
    name: defaultName,
    refs: [...defaultRefs],
    groupBy: "workspace",
    warnings: [...defaultWarnings],
    json: false,
    keep: false
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--repo") {
      parsed.repo = readRequiredValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--name") {
      parsed.name = readRequiredValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--refs") {
      parsed.refs = readRequiredValue(args, index, arg)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      if (parsed.refs.length === 0) {
        throw new Error("--refs must contain at least one ref.");
      }
      index += 1;
      continue;
    }

    if (arg === "--group-by") {
      const value = readRequiredValue(args, index, arg);
      if (value !== "folder" && value !== "workspace") {
        throw new Error("--group-by must be either folder or workspace.");
      }
      parsed.groupBy = value;
      index += 1;
      continue;
    }

    if (arg === "--warnings") {
      parsed.warnings = readRequiredValue(args, index, arg)
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean);
      index += 1;
      continue;
    }

    if (arg === "--json-out") {
      parsed.jsonOut = readRequiredValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--markdown-out") {
      parsed.markdownOut = readRequiredValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--workdir") {
      parsed.workdir = readRequiredValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--json") {
      parsed.json = true;
      continue;
    }

    if (arg === "--keep") {
      parsed.keep = true;
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return parsed;
}

function readRequiredValue(args, index, flag) {
  const value = args[index + 1];
  if (!value) {
    throw new Error(`Missing value for ${flag}.`);
  }
  return value;
}

function warningFlags(warnings) {
  const flags = [];
  const enabled = new Set(warnings);

  if (enabled.has("coupling")) {
    flags.push("--warn-coupling-concentration");
  }

  if (enabled.has("deep")) {
    flags.push("--warn-deep-internal-imports");
  }

  if (enabled.has("public-api")) {
    flags.push("--warn-public-api-surface");
  }

  if (enabled.has("unresolved")) {
    flags.push("--warn-unresolved-imports");
  }

  return flags;
}

function timedCapture(command, args, options) {
  const start = performance.now();
  const stdout = runCapture(command, args, options);
  return {
    stdout,
    ms: performance.now() - start
  };
}

function runCapture(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 128
  });

  if (result.status !== 0) {
    throw new Error(formatCommandFailure(options.label ?? command, result));
  }

  return result.stdout;
}

function runCommand(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 128
  });

  if (result.status !== 0) {
    throw new Error(formatCommandFailure(options.label ?? command, result));
  }
}

function formatCommandFailure(label, result) {
  return [
    `${label} failed with exit ${result.status ?? 1}.`,
    result.stdout ? `stdout:\n${result.stdout}` : undefined,
    result.stderr ? `stderr:\n${result.stderr}` : undefined
  ]
    .filter(Boolean)
    .join("\n");
}

function readPackageVersion(repoRoot) {
  const packageJsonPath = path.join(repoRoot, "package.json");
  if (!fs.existsSync(packageJsonPath)) {
    return undefined;
  }

  try {
    const payload = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    return typeof payload.version === "string" ? payload.version : undefined;
  } catch {
    return undefined;
  }
}

function uniqueObservedEdges(observedDependencies) {
  const edges = new Set(
    observedDependencies.map((dependency) => `${dependency.fromModule}->${dependency.toModule}`)
  );
  return [...edges].sort();
}

function summarizeWarnings(warnings) {
  const byCode = {};
  const coupling = [];
  const deepInternalImports = [];
  const publicApiSurface = [];

  for (const warning of warnings) {
    byCode[warning.code] = (byCode[warning.code] ?? 0) + 1;

    if (warning.code === "coupling_concentration") {
      coupling.push({
        module: warning.details?.module,
        direction: warning.details?.direction,
        fanInModules: warning.details?.fanInModules,
        fanOutModules: warning.details?.fanOutModules,
        incomingModules: warning.details?.incomingModules ?? [],
        outgoingModules: warning.details?.outgoingModules ?? [],
        incomingImportSites: warning.details?.incomingImportSites,
        outgoingImportSites: warning.details?.outgoingImportSites,
        message: warning.message
      });
    }

    if (warning.code === "deep_internal_import") {
      deepInternalImports.push({
        location: warning.location,
        fromModule: warning.details?.fromModule,
        toModule: warning.details?.toModule,
        specifier: warning.details?.specifier,
        importedPath: warning.details?.importedPath,
        publicEntrypoints: warning.details?.publicEntrypoints ?? [],
        message: warning.message
      });
    }

    if (warning.code === "broad_public_surface" || warning.code === "public_entrypoint_coupling") {
      publicApiSurface.push({
        code: warning.code,
        location: warning.location,
        module: warning.details?.module,
        exposedPath: warning.details?.exposedPath,
        specifier: warning.details?.specifier,
        exportKind: warning.details?.exportKind,
        internalTargetCount: warning.details?.internalTargetCount,
        internalImportSites: warning.details?.internalImportSites,
        internalTargets: warning.details?.internalTargets ?? [],
        message: warning.message
      });
    }
  }

  return {
    byCode,
    coupling,
    deepInternalImports,
    publicApiSurface
  };
}

function compareResults(results) {
  const comparisons = [];

  for (let index = 1; index < results.length; index += 1) {
    const before = results[index - 1];
    const after = results[index];
    const beforeEdges = new Set(before.uniqueEdges);
    const afterEdges = new Set(after.uniqueEdges);
    const warningCodes = new Set([...Object.keys(before.warnings.byCode), ...Object.keys(after.warnings.byCode)]);
    const warningDeltas = {};

    for (const code of warningCodes) {
      warningDeltas[code] = (after.warnings.byCode[code] ?? 0) - (before.warnings.byCode[code] ?? 0);
    }

    comparisons.push({
      fromRef: before.ref,
      toRef: after.ref,
      sourceFileDelta: after.summary.sourceFiles - before.summary.sourceFiles,
      importsScannedDelta: after.summary.importsScanned - before.summary.importsScanned,
      observedImportSiteDelta: after.summary.observedImportSites - before.summary.observedImportSites,
      uniqueObservedEdgeDelta: after.summary.uniqueObservedEdges - before.summary.uniqueObservedEdges,
      advisoryWarningDelta: after.summary.advisoryWarnings - before.summary.advisoryWarnings,
      warningDeltas,
      newEdges: after.uniqueEdges.filter((edge) => !beforeEdges.has(edge)),
      removedEdges: before.uniqueEdges.filter((edge) => !afterEdges.has(edge))
    });
  }

  return comparisons;
}

function formatMarkdownReport(report) {
  const lines = [
    `# ${report.name} Version Architecture Smoke`,
    "",
    `Generated (UTC): ${report.generatedAt}`,
    `Repository: ${report.repo}`,
    `Refs: ${report.refs.join(", ")}`,
    "",
    "This is a smoke test, not a verdict. Each version gets its own inferred `.axi` contract, then Axiom compares observable pressure signals across versions.",
    "",
    "## Summary",
    "",
    "| Ref | Commit | Package | Source files | Imports | Unique edges | Warnings | Coupling | Deep imports | Public API | Infer ms | Check ms | Graph ms |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"
  ];

  for (const result of report.results) {
    lines.push(
      [
        result.ref,
        result.commit,
        result.packageVersion ?? "n/a",
        result.summary.sourceFiles,
        result.summary.importsScanned,
        result.summary.uniqueObservedEdges,
        result.summary.advisoryWarnings,
        result.warnings.byCode.coupling_concentration ?? 0,
        result.warnings.byCode.deep_internal_import ?? 0,
        (result.warnings.byCode.broad_public_surface ?? 0) + (result.warnings.byCode.public_entrypoint_coupling ?? 0),
        result.timingsMs.infer,
        result.timingsMs.check,
        result.timingsMs.graph
      ].join(" | ").replace(/^/, "| ").replace(/$/, " |")
    );
  }

  lines.push("", "## Edge Drift", "");
  for (const comparison of report.comparisons) {
    lines.push(`### ${comparison.fromRef} -> ${comparison.toRef}`);
    lines.push(
      `- Source files: ${formatDelta(comparison.sourceFileDelta)}, imports: ${formatDelta(
        comparison.importsScannedDelta
      )}, unique edges: ${formatDelta(comparison.uniqueObservedEdgeDelta)}, warnings: ${formatDelta(
        comparison.advisoryWarningDelta
      )}`
    );
    lines.push(`- New edges: ${formatList(comparison.newEdges)}`);
    lines.push(`- Removed edges: ${formatList(comparison.removedEdges)}`);
    const warningDeltas = Object.entries(comparison.warningDeltas).map(([code, delta]) => `${code} ${formatDelta(delta)}`);
    lines.push(`- Warning deltas: ${formatList(warningDeltas)}`);
    lines.push("");
  }

  lines.push("## Warning Details", "");
  for (const result of report.results) {
    lines.push(`### ${result.ref}`);
    if (
      result.warnings.coupling.length === 0 &&
      result.warnings.deepInternalImports.length === 0 &&
      result.warnings.publicApiSurface.length === 0
    ) {
      lines.push("- No coupling, deep internal import, or public API surface warnings.");
      lines.push("");
      continue;
    }

    for (const warning of result.warnings.coupling) {
      lines.push(
        `- \`coupling_concentration\`: ${warning.message} Incoming: ${formatList(
          warning.incomingModules
        )}. Outgoing: ${formatList(warning.outgoingModules)}.`
      );
    }

    for (const warning of result.warnings.deepInternalImports) {
      const location = warning.location ? `${warning.location.filePath}:${warning.location.line}` : "unknown";
      lines.push(
        `- \`deep_internal_import\` at \`${location}\`: \`${warning.fromModule} -> ${warning.toModule}\` via \`${warning.specifier}\` -> \`${warning.importedPath}\`.`
      );
    }

    for (const warning of result.warnings.publicApiSurface) {
      const location = warning.location ? `${warning.location.filePath}:${warning.location.line}` : "unknown";
      const details =
        warning.code === "public_entrypoint_coupling"
          ? `internal targets: ${warning.internalTargetCount ?? warning.internalTargets.length} (${formatList(
              warning.internalTargets
            )})`
          : `specifier: ${warning.specifier ?? "unknown"}, export kind: ${warning.exportKind ?? "unknown"}`;
      lines.push(
        `- \`${warning.code}\` at \`${location}\`: ${warning.message} Exposed path: \`${warning.exposedPath ?? "unknown"}\`; ${details}.`
      );
    }
    lines.push("");
  }

  lines.push("## Caveats", "");
  lines.push("- Inferred contracts mirror each version's current graph; they do not prove the intended architecture.");
  lines.push("- Warning counts are advisory pressure signals, not CI failures.");
  lines.push("- Public API surface warnings require active `exposes` rules; raw inferred contracts usually leave those as comments, so a zero public API count is expected unless a declared/probe contract is used.");
  lines.push("- Tag-to-tag comparisons can reflect repository reshaping, test/docs changes, or resolver coverage changes.");
  lines.push("- Use this as a calibration loop before turning any signal into a hard gate.");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function formatList(items) {
  if (!items || items.length === 0) {
    return "none";
  }

  return items.join(", ");
}

function formatDelta(value) {
  if (value > 0) {
    return `+${value}`;
  }

  return String(value);
}

function writeTextFile(filePath, text) {
  const resolvedPath = path.resolve(filePath);
  fs.mkdirSync(path.dirname(resolvedPath), { recursive: true });
  fs.writeFileSync(resolvedPath, text);
}

function ensureTrailingNewline(value) {
  return value.endsWith("\n") ? value : `${value}\n`;
}

function safeSegment(value) {
  return value.replace(/[^A-Za-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
}

function removeExistingRefRoot(repoRoot) {
  const resolved = path.resolve(repoRoot);
  const resolvedWorkRoot = path.resolve(workRoot);
  if (!resolved.startsWith(resolvedWorkRoot + path.sep)) {
    throw new Error(`Refusing to remove unexpected path: ${resolved}`);
  }
  fs.rmSync(resolved, { recursive: true, force: true });
}

function cleanupTempRoot(root) {
  const resolved = path.resolve(root);
  const temp = path.resolve(os.tmpdir());
  if (!resolved.startsWith(temp + path.sep) || !path.basename(resolved).startsWith("axiom-real-project-version-smoke-")) {
    throw new Error(`Refusing to remove unexpected temp path: ${resolved}`);
  }

  fs.rmSync(resolved, { recursive: true, force: true });
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/");
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function printHelp() {
  console.log(`Axiom real-project version smoke.

Usage:
  node scripts/real-project-version-smoke.mjs [options]

Defaults:
  --repo ${defaultRepo}
  --name ${defaultName}
  --refs ${defaultRefs.join(",")}
  --group-by workspace
  --warnings ${defaultWarnings.join(",")}

Options:
  --repo <url>             Git repository URL.
  --name <name>            Short project name used in paths and reports.
  --refs <a,b,c>           Git tags or branches to clone and compare.
  --group-by <mode>        infer grouping mode: folder or workspace.
  --warnings <list>        Comma list: coupling,deep,public-api,unresolved.
  --json                   Print JSON instead of Markdown.
  --json-out <path>        Write machine-readable report JSON.
  --markdown-out <path>    Write Markdown report.
  --workdir <path>         Reuse a local work directory.
  --keep                   Keep temporary clones.

The script builds a per-version inferred .axi contract, then runs:
  axi check --json
  axi graph --json

This is a smoke calibration tool, not a production benchmark or architecture verdict.
`);
}
