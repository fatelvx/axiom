#!/usr/bin/env node
import { formatCheckResult } from "./diagnostics/format.js";
import { formatGraphJson, formatGraphResult } from "./diagnostics/graph.js";
import { formatInferJson, formatInferResult } from "./diagnostics/infer.js";
import { formatCheckJson } from "./diagnostics/json.js";
import { runInfer } from "./infer/infer.js";
import { runCheck } from "./validator/check.js";

interface CliOptions {
  root: string;
  json: boolean;
  configPath?: string;
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

const options = parseOptions(args.slice(1));

try {
  if (command === "infer") {
    const result = runInfer({ root: options.root, configPath: options.configPath });
    console.log(options.json ? formatInferJson(result) : formatInferResult(result));
    process.exit(0);
  }

  const result = runCheck({ root: options.root, configPath: options.configPath });

  if (command === "check" && options.json) {
    console.log(formatCheckJson(result));
  } else if (command === "check") {
    console.log(formatCheckResult(result));
  } else if (options.json) {
    console.log(formatGraphJson(result));
  } else {
    console.log(formatGraphResult(result));
  }

  process.exit(command === "check" && result.violations.length > 0 ? 1 : 0);
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function parseOptions(values: string[]): CliOptions {
  const options: CliOptions = {
    root: process.cwd(),
    json: false
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

    console.error(`Unknown option '${value}'.`);
    process.exit(1);
  }

  return options;
}

function printHelp(): void {
  console.log(`Axiom

Usage:
  axi check [--root <path>] [--config <path>] [--json]
  axi graph [--root <path>] [--config <path>] [--json]
  axi infer [--root <path>] [--config <path>] [--json]

Commands:
  check   Validate source dependencies against .axi architecture specs.
  graph   Print declared and observed architecture graphs.
  infer   Print a starter .axi contract inferred from current imports.
`);
}
