#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { formatCheckResult } from "./diagnostics/format.js";
import { formatGraphJson, formatGraphMarkdown, formatGraphResult, type GraphBaseline } from "./diagnostics/graph.js";
import { formatInferJson, formatInferResult } from "./diagnostics/infer.js";
import { formatCheckJson } from "./diagnostics/json.js";
import { type InferGroupBy, runInfer } from "./infer/infer.js";
import { type AdoptionMode, runCheck } from "./validator/check.js";

interface CliOptions {
  root: string;
  json: boolean;
  markdown: boolean;
  configPath?: string;
  specPaths: string[];
  adoptionMode: AdoptionMode;
  groupDepth?: number;
  groupBy?: InferGroupBy;
  graphViolationsOnly: boolean;
  graphAttention: boolean;
  baselinePath?: string;
  intentionalViolationExpiryWarningDays?: number;
  warnUnresolvedImports: boolean;
  warnPublicApiSurface: boolean;
  warnCouplingConcentration: boolean;
  warnDeepInternalImports: boolean;
}

type CliCommand = "check" | "graph" | "infer" | "observe";

const args = process.argv.slice(2);
const commandValue = args[0];

if (!commandValue || commandValue === "--help" || commandValue === "-h") {
  printHelp();
  process.exit(0);
}

if (!isCommand(commandValue)) {
  console.error(`Unknown command '${commandValue}'.`);
  printHelp();
  process.exit(1);
}

const command = commandValue;
const options = parseOptions(args.slice(1), command);

try {
  if (command === "infer") {
    const result = runInfer({
      root: options.root,
      configPath: options.configPath,
      groupDepth: options.groupDepth,
      groupBy: options.groupBy
    });
    console.log(options.json ? formatInferJson(result) : formatInferResult(result));
    process.exit(0);
  }

  const result = runCheck({
    root: options.root,
    configPath: options.configPath,
    specPaths: options.specPaths,
    adoptionMode: options.adoptionMode,
    intentionalViolationExpiryWarningDays: options.intentionalViolationExpiryWarningDays,
    warnUnresolvedImports: options.warnUnresolvedImports,
    warnPublicApiSurface: options.warnPublicApiSurface,
    warnCouplingConcentration: options.warnCouplingConcentration,
    warnDeepInternalImports: options.warnDeepInternalImports
  });
  const baseline = options.baselinePath ? loadGraphBaseline(options.baselinePath, options.root) : undefined;

  if (command === "check" && options.json) {
    console.log(formatCheckJson(result));
  } else if (command === "check") {
    console.log(formatCheckResult(result));
  } else if (options.json) {
    console.log(
      formatGraphJson(result, {
        violationsOnly: options.graphViolationsOnly,
        attention: options.graphAttention,
        observe: command === "observe",
        baseline
      })
    );
  } else if (options.markdown) {
    console.log(
      formatGraphMarkdown(result, {
        violationsOnly: options.graphViolationsOnly,
        attention: options.graphAttention,
        observe: command === "observe",
        baseline
      })
    );
  } else {
    console.log(
      formatGraphResult(result, {
        violationsOnly: options.graphViolationsOnly,
        attention: options.graphAttention,
        observe: command === "observe",
        baseline
      })
    );
  }

  process.exit(command === "check" && result.violations.length > 0 ? 1 : 0);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function isCommand(value: string | undefined): value is CliCommand {
  return value === "check" || value === "graph" || value === "infer" || value === "observe";
}

function parseOptions(values: string[], command: CliCommand): CliOptions {
  const options: CliOptions = {
    root: process.cwd(),
    json: false,
    markdown: false,
    specPaths: [],
    adoptionMode: "loose",
    graphViolationsOnly: command === "observe",
    graphAttention: command === "observe",
    warnUnresolvedImports: false,
    warnPublicApiSurface: false,
    warnCouplingConcentration: false,
    warnDeepInternalImports: false
  };

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];

    if (value === "--root") {
      const root = values[index + 1];
      if (!root) {
        console.error("Missing value for --root.");
        process.exit(1);
      }
      options.root = root;
      index += 1;
      continue;
    }

    if (value === "--json") {
      if (options.markdown) {
        console.error("Use either --json or --markdown, not both.");
        process.exit(1);
      }

      options.json = true;
      continue;
    }

    if (value === "--markdown") {
      if (command !== "graph" && command !== "observe") {
        console.error("--markdown is only supported by graph and observe.");
        process.exit(1);
      }

      if (options.json) {
        console.error("Use either --json or --markdown, not both.");
        process.exit(1);
      }

      options.markdown = true;
      continue;
    }

    if (value === "--warn-unowned") {
      if (options.adoptionMode === "strict") {
        console.error("Use either --strict or --warn-unowned, not both.");
        process.exit(1);
      }
      options.adoptionMode = "warn-unowned";
      continue;
    }

    if (value === "--strict") {
      if (options.adoptionMode === "warn-unowned") {
        console.error("Use either --strict or --warn-unowned, not both.");
        process.exit(1);
      }
      options.adoptionMode = "strict";
      continue;
    }

    if (value === "--config") {
      const configPath = values[index + 1];
      if (!configPath) {
        console.error("Missing value for --config.");
        process.exit(1);
      }
      options.configPath = configPath;
      index += 1;
      continue;
    }

    if (value === "--spec") {
      if (command === "infer") {
        console.error("--spec is only supported by check, graph, and observe.");
        process.exit(1);
      }

      const specPath = values[index + 1];
      if (!specPath) {
        console.error("Missing value for --spec.");
        process.exit(1);
      }

      options.specPaths.push(specPath);
      index += 1;
      continue;
    }

    if (value === "--intentional-violation-warning-days") {
      if (command === "infer") {
        console.error("--intentional-violation-warning-days is only supported by check, graph, and observe.");
        process.exit(1);
      }

      const rawWarningDays = values[index + 1];
      if (!rawWarningDays) {
        console.error("Missing value for --intentional-violation-warning-days.");
        process.exit(1);
      }

      const warningDays = Number(rawWarningDays);
      if (!Number.isInteger(warningDays) || warningDays < 0) {
        console.error("--intentional-violation-warning-days must be a non-negative integer.");
        process.exit(1);
      }

      options.intentionalViolationExpiryWarningDays = warningDays;
      index += 1;
      continue;
    }

    if (value === "--warn-unresolved-imports") {
      if (command === "infer") {
        console.error("--warn-unresolved-imports is only supported by check, graph, and observe.");
        process.exit(1);
      }

      options.warnUnresolvedImports = true;
      continue;
    }

    if (value === "--warn-public-api-surface") {
      if (command === "infer") {
        console.error("--warn-public-api-surface is only supported by check, graph, and observe.");
        process.exit(1);
      }

      options.warnPublicApiSurface = true;
      continue;
    }

    if (value === "--warn-coupling-concentration") {
      if (command === "infer") {
        console.error("--warn-coupling-concentration is only supported by check, graph, and observe.");
        process.exit(1);
      }

      options.warnCouplingConcentration = true;
      continue;
    }

    if (value === "--warn-deep-internal-imports") {
      if (command === "infer") {
        console.error("--warn-deep-internal-imports is only supported by check, graph, and observe.");
        process.exit(1);
      }

      options.warnDeepInternalImports = true;
      continue;
    }

    if (value === "--baseline") {
      if (command !== "graph" && command !== "observe") {
        console.error("--baseline is only supported by graph and observe.");
        process.exit(1);
      }

      const baselinePath = values[index + 1];
      if (!baselinePath) {
        console.error("Missing value for --baseline.");
        process.exit(1);
      }

      options.baselinePath = baselinePath;
      index += 1;
      continue;
    }

    if (value === "--violations-only") {
      if (command !== "graph" && command !== "observe") {
        console.error("--violations-only is only supported by graph and observe.");
        process.exit(1);
      }

      options.graphViolationsOnly = true;
      continue;
    }

    if (value === "--attention") {
      if (command !== "graph" && command !== "observe") {
        console.error("--attention is only supported by graph and observe.");
        process.exit(1);
      }

      options.graphViolationsOnly = true;
      options.graphAttention = true;
      continue;
    }

    if (value === "--group-depth") {
      if (command !== "infer") {
        console.error("--group-depth is only supported by infer.");
        process.exit(1);
      }

      const rawGroupDepth = values[index + 1];
      if (!rawGroupDepth) {
        console.error("Missing value for --group-depth.");
        process.exit(1);
      }

      const groupDepth = Number(rawGroupDepth);
      if (!Number.isInteger(groupDepth) || groupDepth < 1) {
        console.error("--group-depth must be a positive integer.");
        process.exit(1);
      }

      options.groupDepth = groupDepth;
      index += 1;
      continue;
    }

    if (value === "--group-by") {
      if (command !== "infer") {
        console.error("--group-by is only supported by infer.");
        process.exit(1);
      }

      const groupBy = values[index + 1];
      if (groupBy !== "folder" && groupBy !== "workspace") {
        console.error("--group-by must be either 'folder' or 'workspace'.");
        process.exit(1);
      }

      options.groupBy = groupBy;
      index += 1;
      continue;
    }

    console.error(`Unknown option '${value}'.`);
    process.exit(1);
  }

  return options;
}

function loadGraphBaseline(baselinePath: string, root: string): GraphBaseline {
  const resolvedPath = resolveBaselinePath(baselinePath, root);
  const rawText = fs.readFileSync(resolvedPath, "utf8");
  const payload = JSON.parse(rawText) as unknown;

  if (!payload || typeof payload !== "object") {
    throw new Error("--baseline must point to an axi graph --json result.");
  }

  const record = payload as Record<string, unknown>;
  const filters = readRecord(record.filters);
  if (readBoolean(filters?.violationsOnly)) {
    throw new Error("Baseline graph must be unfiltered. Re-run `axi graph --json` without --attention or --violations-only.");
  }

  const summary = readRecord(record.summary);
  const observedCount = readNumber(summary?.observedDependencies);
  const shownObservedCount = readNumber(summary?.shownObservedDependencies);
  if (observedCount !== undefined && shownObservedCount !== undefined && shownObservedCount < observedCount) {
    throw new Error("Baseline graph must be unfiltered. Re-run `axi graph --json` without --attention or --violations-only.");
  }

  const observedDependencies = record.observedDependencies;
  if (!Array.isArray(observedDependencies)) {
    throw new Error("--baseline must contain an observedDependencies array from axi graph --json.");
  }

  return {
    path: normalizePath(baselinePath),
    ...(typeof record.schemaVersion === "string" ? { schemaVersion: record.schemaVersion } : {}),
    observedDependencies: observedDependencies.map((dependency, index) => parseBaselineDependency(dependency, index))
  };
}

function parseBaselineDependency(value: unknown, index: number): GraphBaseline["observedDependencies"][number] {
  if (!value || typeof value !== "object") {
    throw new Error(`Invalid observed dependency at baseline index ${index}.`);
  }

  const dependency = value as Record<string, unknown>;
  const fromModule = dependency.fromModule;
  const toModule = dependency.toModule;
  const importSite = readRecord(dependency.import);
  const filePath = importSite?.filePath;
  const line = importSite?.line;
  const specifier = importSite?.specifier;
  const resolvedPath = importSite?.resolvedPath;

  if (typeof fromModule !== "string" || typeof toModule !== "string") {
    throw new Error(`Invalid observed dependency modules at baseline index ${index}.`);
  }

  if (typeof filePath !== "string" || typeof line !== "number" || typeof specifier !== "string") {
    throw new Error(`Invalid observed dependency import site at baseline index ${index}.`);
  }

  return {
    fromModule,
    toModule,
    import: {
      filePath,
      line,
      specifier,
      ...(typeof resolvedPath === "string" ? { resolvedPath } : {})
    }
  };
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function readBoolean(value: unknown): boolean {
  return value === true;
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}

function resolveBaselinePath(baselinePath: string, root: string): string {
  if (path.isAbsolute(baselinePath)) {
    return baselinePath;
  }

  const fromCwd = path.resolve(baselinePath);
  if (fs.existsSync(fromCwd)) {
    return fromCwd;
  }

  return path.resolve(root, baselinePath);
}

function printHelp(): void {
  console.log(`Axiom

Usage:
  axi check [--root <path>] [--config <path>] [--spec <path>] [--json] [--warn-unowned] [--strict] [--intentional-violation-warning-days <n>] [--warn-unresolved-imports] [--warn-public-api-surface] [--warn-coupling-concentration] [--warn-deep-internal-imports]
  axi graph [--root <path>] [--config <path>] [--spec <path>] [--json|--markdown] [--warn-unowned] [--strict] [--violations-only|--attention] [--baseline <graph-json>] [--intentional-violation-warning-days <n>] [--warn-unresolved-imports] [--warn-public-api-surface] [--warn-coupling-concentration] [--warn-deep-internal-imports]
  axi observe [--root <path>] [--config <path>] [--spec <path>] [--json|--markdown] [--warn-unowned] [--strict] [--baseline <graph-json>] [--intentional-violation-warning-days <n>] [--warn-unresolved-imports] [--warn-public-api-surface] [--warn-coupling-concentration] [--warn-deep-internal-imports]
  axi infer [--root <path>] [--config <path>] [--json] [--group-depth <n>] [--group-by folder|workspace]

Commands:
  check    Validate source dependencies against .axi architecture specs.
  graph    Print declared and observed architecture graphs.
  observe  Show the architecture attention surface: violations, visible debt, and warnings.
  infer    Print a starter .axi contract inferred from current imports.

Graph:
  --violations-only  Show only observed dependency edges that have violations.
  --attention        Alias for --violations-only with awareness-oriented human output.
  --baseline <graph-json>
                    Compare observed module edges against an unfiltered axi graph --json baseline.
  --markdown        Print a PR/agent-friendly architecture review summary for graph or observe.
                    This is presentation output; use axi check for a CI gate.
  observe            Product-facing alias for graph --attention.

Adoption:
  --spec <path>    Use an explicit .axi file or directory instead of discovering specs under --root.
                   Repeat the flag for multiple external contract files.
  default          Ignore source files not owned by any module path.
  --warn-unowned  Report unowned source files as warnings without failing check.
  --strict        Report unowned source files as violations.
  --intentional-violation-warning-days <n>
                   Warn when an intentional violation expires within n days. Defaults to 30.
  --warn-unresolved-imports
                   Warn when an owned file has a static relative or # import that Axiom cannot resolve.
  --warn-public-api-surface
                   Warn about broad exposed barrels and entry points that mask internal coupling.
  --warn-coupling-concentration
                   Warn when one module has high observed fan-in or fan-out without failing the check.
  --warn-deep-internal-imports
                   Warn when a module uses a relative cross-module import to bypass a likely entry point.
`);
}
