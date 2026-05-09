#!/usr/bin/env node
import { formatCheckResult } from "./diagnostics/format.js";
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

if (command !== "check") {
  console.error(`Unknown command '${command}'.`);
  printHelp();
  process.exit(1);
}

const options = parseOptions(args.slice(1));
const result = runCheck({ root: options.root });

if (options.json) {
  console.log(formatCheckJson(result));
} else {
  console.log(formatCheckResult(result));
}

process.exit(result.violations.length === 0 ? 0 : 1);

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

Commands:
  check   Validate source dependencies against .axi architecture specs.
`);
}
