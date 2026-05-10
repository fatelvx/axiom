#!/usr/bin/env node
import { formatCheckResult } from "./diagnostics/format.js";
import { formatGraphJson, formatGraphResult } from "./diagnostics/graph.js";
import { formatCheckJson } from "./diagnostics/json.js";
import { runCheck } from "./validator/check.js";

interface CliOptions {
  root: string;
  json: boolean;
}

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === "--help" || command === "-h") {
  printHelp();
  process.exit(0);
}

if (command !== "check" && command !== "graph") {
  console.error(`Unknown command '${command}'.`);
  printHelp();
  process.exit(1);
}

const options = parseOptions(args.slice(1));
const result = runCheck({ root: options.root });

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

    console.error(`Unknown option '${value}'.`);
    process.exit(1);
  }

  return options;
}

function printHelp(): void {
  console.log(`Axiom

Usage:
  axi check [--root <path>] [--json]
  axi graph [--root <path>] [--json]

Commands:
  check   Validate source dependencies against .axi architecture specs.
  graph   Print declared and observed architecture graphs.
`);
}
