import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";

const defaultRepo = "https://github.com/colinhacks/zod.git";
const defaultName = "zod";
const defaultBaselineRef = "v4.0.1";
const defaultCurrentRef = "v4.4.3";
const defaultWarnings = ["coupling", "deep", "unresolved"];
const options = parseArgs(process.argv.slice(2));
const cliPath = path.resolve("dist", "cli.js");
const startedAt = new Date();

if (!fs.existsSync(cliPath)) {
  console.error("dist/cli.js was not found. Run npm run build before real-project diff smoke.");
  process.exit(1);
}

const workRoot = options.workdir
  ? path.resolve(options.workdir)
  : fs.mkdtempSync(path.join(os.tmpdir(), "axiom-real-project-diff-smoke-"));

try {
  fs.mkdirSync(workRoot, { recursive: true });

  const baseline = cloneRef(options.baselineRef, "baseline");
  const current = cloneRef(options.currentRef, "current");
  const warningArgs = warningFlags(options.warnings);
  const configPath = writeScopeConfig(workRoot, options);
  const configArgs = configPath ? ["--config", configPath] : [];
  const contractPath = path.join(workRoot, `${safeSegment(options.name)}-${safeSegment(options.baselineRef)}-inferred.axi`);
  const baselineGraphPath = path.join(workRoot, `${safeSegment(options.name)}-${safeSegment(options.baselineRef)}-baseline.graph.json`);

  const infer = timedCapture(
    process.execPath,
    [cliPath, "infer", "--root", baseline.root, ...configArgs, "--group-by", options.groupBy],
    { label: `axi infer ${options.baselineRef}` }
  );
  writeTextFile(contractPath, ensureTrailingNewline(infer.stdout));

  const baselineGraph = timedCapture(
    process.execPath,
    [cliPath, "graph", "--root", baseline.root, ...configArgs, "--spec", contractPath, "--json", ...warningArgs],
    { label: `axi graph ${options.baselineRef}` }
  );
  writeTextFile(baselineGraphPath, ensureTrailingNewline(baselineGraph.stdout));

  const diffJson = timedCapture(
    process.execPath,
    [cliPath, "diff", baselineGraphPath, "--root", current.root, ...configArgs, "--spec", contractPath, "--json", ...warningArgs],
    { label: `axi diff ${options.baselineRef} -> ${options.currentRef}` }
  );
  const diffMarkdown = timedCapture(
    process.execPath,
    [cliPath, "diff", baselineGraphPath, "--root", current.root, ...configArgs, "--spec", contractPath, "--markdown", ...warningArgs],
    { label: `axi diff --markdown ${options.baselineRef} -> ${options.currentRef}` }
  );
  const observeMarkdown = timedCapture(
    process.execPath,
    [
      cliPath,
      "observe",
      "--baseline",
      baselineGraphPath,
      "--root",
      current.root,
      ...configArgs,
      "--spec",
      contractPath,
      "--markdown",
      ...warningArgs
    ],
    { label: `axi observe --baseline --markdown ${options.baselineRef} -> ${options.currentRef}` }
  );
  const diffMermaid = timedCapture(
    process.execPath,
    [cliPath, "diff", baselineGraphPath, "--root", current.root, ...configArgs, "--spec", contractPath, "--mermaid", ...warningArgs],
    { label: `axi diff --mermaid ${options.baselineRef} -> ${options.currentRef}` }
  );

  const baselinePayload = JSON.parse(baselineGraph.stdout);
  const diffPayload = JSON.parse(diffJson.stdout);
  const report = {
    kind: "axiom.real-project-diff-smoke.v1",
    generatedAt: startedAt.toISOString(),
    repo: options.repo,
    name: options.name,
    baselineRef: options.baselineRef,
    currentRef: options.currentRef,
    groupBy: options.groupBy,
    sourceScope: {
      include: options.include,
      exclude: options.exclude
    },
    warningFlags: warningArgs,
    node: process.version,
    platform: `${process.platform} ${process.arch}`,
    workRoot: options.keep ? normalizePath(workRoot) : undefined,
    artifacts: options.keep
      ? {
          contractPath: normalizePath(contractPath),
          baselineGraphPath: normalizePath(baselineGraphPath),
          ...(configPath ? { configPath: normalizePath(configPath) } : {})
        }
      : undefined,
    baseline: {
      ref: options.baselineRef,
      commit: baseline.commit,
      packageVersion: baseline.packageVersion,
      summary: baselinePayload.summary
    },
    current: {
      ref: options.currentRef,
      commit: current.commit,
      packageVersion: current.packageVersion,
      summary: diffPayload.summary
    },
    drift: summarizeDrift(diffPayload.drift),
    warnings: summarizeWarnings(diffPayload.warnings ?? []),
    timingsMs: {
      cloneBaseline: round(baseline.cloneMs),
      cloneCurrent: round(current.cloneMs),
      infer: round(infer.ms),
      baselineGraph: round(baselineGraph.ms),
      diffJson: round(diffJson.ms),
      diffMarkdown: round(diffMarkdown.ms),
      observeMarkdown: round(observeMarkdown.ms),
      diffMermaid: round(diffMermaid.ms)
    }
  };

  const json = JSON.stringify(report, null, 2);
  const markdown = formatMarkdownReport(report);

  if (options.jsonOut) {
    writeTextFile(options.jsonOut, `${json}\n`);
  }

  if (options.markdownOut) {
    writeTextFile(options.markdownOut, markdown);
  }

  if (options.diffMarkdownOut) {
    writeTextFile(options.diffMarkdownOut, diffMarkdown.stdout);
  }

  if (options.observeMarkdownOut) {
    writeTextFile(options.observeMarkdownOut, observeMarkdown.stdout);
  }

  if (options.mermaidOut) {
    writeTextFile(options.mermaidOut, diffMermaid.stdout);
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

function cloneRef(ref, role) {
  const repoRoot = path.join(workRoot, safeSegment(`${options.name}-${role}-${ref}`));
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

  return {
    root: repoRoot,
    commit,
    packageVersion,
    cloneMs
  };
}

function parseArgs(args) {
  const parsed = {
    repo: defaultRepo,
    name: defaultName,
    baselineRef: defaultBaselineRef,
    currentRef: defaultCurrentRef,
    groupBy: "workspace",
    include: [],
    exclude: [],
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

    if (arg === "--baseline-ref") {
      parsed.baselineRef = readRequiredValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--current-ref") {
      parsed.currentRef = readRequiredValue(args, index, arg);
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
      const value = readRequiredValue(args, index, arg);
      parsed.warnings =
        value === "none"
          ? []
          : value
              .split(",")
              .map((item) => item.trim())
              .filter(Boolean);
      index += 1;
      continue;
    }

    if (arg === "--include") {
      parsed.include = parsePatternList(readRequiredValue(args, index, arg));
      index += 1;
      continue;
    }

    if (arg === "--exclude") {
      parsed.exclude = parsePatternList(readRequiredValue(args, index, arg));
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

    if (arg === "--diff-markdown-out") {
      parsed.diffMarkdownOut = readRequiredValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--observe-markdown-out") {
      parsed.observeMarkdownOut = readRequiredValue(args, index, arg);
      index += 1;
      continue;
    }

    if (arg === "--mermaid-out") {
      parsed.mermaidOut = readRequiredValue(args, index, arg);
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

function parsePatternList(value) {
  if (value === "none") {
    return [];
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
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

function writeScopeConfig(workRoot, options) {
  if (options.include.length === 0 && options.exclude.length === 0) {
    return undefined;
  }

  const configPath = path.join(workRoot, `${safeSegment(options.name)}-scope.axiom.config.json`);
  writeTextFile(
    configPath,
    `${JSON.stringify(
      {
        ...(options.include.length > 0 ? { include: options.include } : {}),
        ...(options.exclude.length > 0 ? { exclude: options.exclude } : {})
      },
      null,
      2
    )}\n`
  );
  return configPath;
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

function summarizeDrift(drift) {
  return {
    kind: drift?.kind,
    baseline: drift?.baseline
      ? {
          ...(options.keep && typeof drift.baseline.path === "string" ? { path: drift.baseline.path } : {}),
          schemaVersion: drift.baseline.schemaVersion,
          observedDependencies: drift.baseline.observedDependencies
        }
      : undefined,
    newObservedEdges: summarizeEdges(drift?.newObservedEdges ?? []),
    removedObservedEdges: summarizeEdges(drift?.removedObservedEdges ?? [])
  };
}

function summarizeEdges(edges) {
  return edges.map((edge) => {
    const firstImport = edge.imports?.[0];
    const violationCodes = [...new Set((edge.violations ?? []).map((violation) => violation.code))].sort();
    const intentionalViolationCodes = [
      ...new Set((edge.intentionalViolations ?? []).map((violation) => violation.code))
    ].sort();

    return {
      fromModule: edge.fromModule,
      toModule: edge.toModule,
      importSites: edge.imports?.length ?? 0,
      firstImport: firstImport
        ? {
            filePath: firstImport.filePath,
            line: firstImport.line,
            specifier: firstImport.specifier,
            resolvedPath: firstImport.resolvedPath
          }
        : undefined,
      violationCodes,
      intentionalViolationCodes
    };
  });
}

function summarizeWarnings(warnings) {
  const byCode = {};
  const details = [];

  for (const warning of warnings) {
    byCode[warning.code] = (byCode[warning.code] ?? 0) + 1;
    details.push({
      code: warning.code,
      message: warning.message,
      location: warning.location,
      observed: warning.details?.observed,
      module: warning.details?.module,
      fromModule: warning.details?.fromModule,
      toModule: warning.details?.toModule,
      specifier: warning.details?.specifier,
      importedPath: warning.details?.importedPath,
      incomingModules: warning.details?.incomingModules ?? [],
      outgoingModules: warning.details?.outgoingModules ?? []
    });
  }

  return {
    byCode,
    details
  };
}

function formatMarkdownReport(report) {
  const lines = [
    `# ${report.name} Diff Architecture Smoke`,
    "",
    `Generated (UTC): ${report.generatedAt}`,
    `Repository: ${report.repo}`,
    `Baseline: ${report.baseline.ref} (${report.baseline.commit})`,
    `Current: ${report.current.ref} (${report.current.commit})`,
    `Source scope: ${formatSourceScope(report.sourceScope)}`,
    "",
    "This is a smoke test, not a verdict. The baseline contract is inferred from the baseline ref and reused as an external `--spec` against the current ref.",
    "",
    "## Summary",
    "",
    "| Ref | Commit | Package | Modules | Observed imports | Hard violations | Warnings |",
    "| --- | --- | --- | ---: | ---: | ---: | ---: |",
    [
      report.baseline.ref,
      report.baseline.commit,
      report.baseline.packageVersion ?? "n/a",
      report.baseline.summary.modules,
      report.baseline.summary.observedDependencies,
      report.baseline.summary.violations,
      report.baseline.summary.warnings
    ]
      .join(" | ")
      .replace(/^/, "| ")
      .replace(/$/, " |"),
    [
      report.current.ref,
      report.current.commit,
      report.current.packageVersion ?? "n/a",
      report.current.summary.modules,
      report.current.summary.observedDependencies,
      report.current.summary.violations,
      report.current.summary.warnings
    ]
      .join(" | ")
      .replace(/^/, "| ")
      .replace(/$/, " |"),
    "",
    "## Drift",
    "",
    `- New observed edges: ${report.drift.newObservedEdges.length}`,
    `- Removed observed edges: ${report.drift.removedObservedEdges.length}`,
    ""
  ];

  lines.push("### New Observed Edges");
  appendEdgeList(lines, report.drift.newObservedEdges, "via");
  lines.push("", "### Removed Observed Edges");
  appendEdgeList(lines, report.drift.removedObservedEdges, "previously via");

  lines.push("", "## Advisory Warnings", "");
  const warningCodes = Object.entries(report.warnings.byCode).map(([code, count]) => `${code}: ${count}`);
  lines.push(`- Warning counts: ${warningCodes.length ? warningCodes.join(", ") : "none"}`);
  for (const warning of report.warnings.details) {
    const location = warning.location ? `${warning.location.filePath}:${warning.location.line}` : "no location";
    const message = warning.message.endsWith(".") ? warning.message : `${warning.message}.`;
    const observed = warning.observed ? ` Observed: ${warning.observed}.` : "";
    const modules =
      warning.incomingModules.length > 0
        ? ` Incoming: ${warning.incomingModules.join(", ")}.`
        : warning.fromModule && warning.toModule
          ? ` Edge: ${warning.fromModule} -> ${warning.toModule}.`
          : "";
    lines.push(`- \`${warning.code}\` at \`${location}\`: ${message}${observed}${modules}`);
  }

  lines.push("", "## Timings", "");
  lines.push(`- Clone baseline: ${report.timingsMs.cloneBaseline}ms`);
  lines.push(`- Clone current: ${report.timingsMs.cloneCurrent}ms`);
  lines.push(`- Infer baseline contract: ${report.timingsMs.infer}ms`);
  lines.push(`- Baseline graph: ${report.timingsMs.baselineGraph}ms`);
  lines.push(`- Diff JSON: ${report.timingsMs.diffJson}ms`);
  lines.push(`- Observe Markdown: ${report.timingsMs.observeMarkdown}ms`);

  lines.push("", "## Caveats", "");
  lines.push("- The inferred baseline contract mirrors the baseline ref's current graph; it is not maintainer-declared architecture intent.");
  lines.push("- New or removed edges are advisory drift signals, not automatic good/bad judgments.");
  lines.push("- Warning counts are advisory pressure signals and do not fail CI by themselves.");
  lines.push("- Use this harness to calibrate Axiom behavior before turning any signal into a hard gate.");
  lines.push("");

  return `${lines.join("\n")}\n`;
}

function formatSourceScope(sourceScope) {
  const include = sourceScope.include.length > 0 ? `include ${sourceScope.include.join(", ")}` : "include all supported source";
  const exclude = sourceScope.exclude.length > 0 ? `exclude ${sourceScope.exclude.join(", ")}` : "default excludes only";
  return `${include}; ${exclude}`;
}

function appendEdgeList(lines, edges, prefix) {
  if (edges.length === 0) {
    lines.push("- None");
    return;
  }

  for (const edge of edges) {
    const codes = [...edge.violationCodes, ...edge.intentionalViolationCodes];
    const codeText = codes.length > 0 ? ` (${codes.join(", ")})` : "";
    lines.push(`- \`${edge.fromModule} -> ${edge.toModule}\`${codeText}`);
    if (edge.firstImport) {
      lines.push(`  - ${prefix} \`${edge.firstImport.filePath}:${edge.firstImport.line}\` importing \`${edge.firstImport.specifier}\``);
    }
  }
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
  if (!resolved.startsWith(temp + path.sep) || !path.basename(resolved).startsWith("axiom-real-project-diff-smoke-")) {
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
  console.log(`Axiom real-project diff smoke.

Usage:
  node scripts/real-project-diff-smoke.mjs [options]

Defaults:
  --repo ${defaultRepo}
  --name ${defaultName}
  --baseline-ref ${defaultBaselineRef}
  --current-ref ${defaultCurrentRef}
  --group-by workspace
  --warnings ${defaultWarnings.join(",")}

Options:
  --repo <url>                  Git repository URL.
  --name <name>                 Short project name used in paths and reports.
  --baseline-ref <ref>          Git tag or branch used to infer the baseline contract.
  --current-ref <ref>           Git tag or branch checked against the baseline contract.
  --group-by <mode>             infer grouping mode: folder or workspace.
  --include <patterns>          Comma list of source include globs for both refs.
  --exclude <patterns>          Comma list of source exclude globs for both refs.
  --warnings <list>             Comma list: coupling,deep,public-api,unresolved, or none.
  --json                        Print JSON instead of Markdown.
  --json-out <path>             Write machine-readable report JSON.
  --markdown-out <path>         Write the summarized Markdown report.
  --diff-markdown-out <path>    Write raw axi diff --markdown output.
  --observe-markdown-out <path> Write raw axi observe --baseline --markdown output.
  --mermaid-out <path>          Write raw axi diff --mermaid output.
  --workdir <path>              Reuse a local work directory.
  --keep                        Keep temporary clones and baseline artifacts.

The script clones two refs, infers a baseline contract, saves a graph baseline,
then runs axi diff and axi observe --baseline against the current ref.

This is a smoke calibration tool, not a production benchmark or architecture verdict.
`);
}
