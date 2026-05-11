#!/usr/bin/env node
import { formatCheckResult } from "./diagnostics/format.js";
import { formatGraphJson, formatGraphResult } from "./diagnostics/graph.js";
import { formatInferJson, formatInferResult } from "./diagnostics/infer.js";
import { formatCheckJson } from "./diagnostics/json.js";
import { type InferGroupBy, runInfer } from "./infer/infer.js";
import { type AdoptionMode, runCheck } from "./validator/check.js";

interface CliOptions {
  root: string;
  json: boolean;
  configPath?: string;
  adoptionMode: AdoptionMode;
  groupDepth?: number;
  groupBy?: InferGroupBy;
  graphViolationsOnly: boolean;
  intentionalViolationExpiryWarningDays?: number;
}

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === "--help" || command === "-h") {
  printHelp();
  process.exit(0);
}

if (command !== "check" && command !== "graph" && command !== "infer") {
  console.error(`Unknown command '${command}'.`);
  printHelp();
  process.exit(1);
}

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
    adoptionMode: options.adoptionMode,
    intentionalViolationExpiryWarningDays: options.intentionalViolationExpiryWarningDays
  });

  if (command === "check" && options.json) {
    console.log(formatCheckJson(result));
  } else if (command === "check") {
    console.log(formatCheckResult(result));
  } else if (options.json) {
    console.log(formatGraphJson(result, { violationsOnly: options.graphViolationsOnly }));
  } else {
    console.log(formatGraphResult(result, { violationsOnly: options.graphViolationsOnly }));
  }

  process.exit(command === "check" && result.violations.length > 0 ? 1 : 0);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function parseOptions(values: string[], command: "check" | "graph" | "infer"): CliOptions {
  const options: CliOptions = {
    root: process.cwd(),
    json: false,
    adoptionMode: "loose",
    graphViolationsOnly: false
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
      options.json = true;
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

    if (value === "--intentional-violation-warning-days") {
      if (command === "infer") {
        console.error("--intentional-violation-warning-days is only supported by check and graph.");
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

    if (value === "--violations-only") {
      if (command !== "graph") {
        console.error("--violations-only is only supported by graph.");
        process.exit(1);
      }

      options.graphViolationsOnly = true;
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

function printHelp(): void {
  console.log(`Axiom

Usage:
  axi check [--root <path>] [--config <path>] [--json] [--warn-unowned] [--strict] [--intentional-violation-warning-days <n>]
  axi graph [--root <path>] [--config <path>] [--json] [--warn-unowned] [--strict] [--violations-only] [--intentional-violation-warning-days <n>]
  axi infer [--root <path>] [--config <path>] [--json] [--group-depth <n>] [--group-by folder|workspace]

Commands:
  check   Validate source dependencies against .axi architecture specs.
  graph   Print declared and observed architecture graphs.
  infer   Print a starter .axi contract inferred from current imports.

Graph:
  --violations-only  Show only observed dependency edges that have violations.

Adoption:
  default          Ignore source files not owned by any module path.
  --warn-unowned  Report unowned source files as warnings without failing check.
  --strict        Report unowned source files as violations.
  --intentional-violation-warning-days <n>
                   Warn when an intentional violation expires within n days. Defaults to 30.
`);
}
