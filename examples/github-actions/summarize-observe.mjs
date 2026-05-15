#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: node summarize-observe.mjs <axiom-observe-json>");
  process.exit(2);
}

let payload;

try {
  payload = JSON.parse(decodeJsonText(await readFile(inputPath)));
} catch (error) {
  console.error(`Failed to read Axiom JSON from ${inputPath}: ${error.message}`);
  process.exit(2);
}

if (
  !payload ||
  typeof payload.schemaVersion !== "string" ||
  !payload.schemaVersion.startsWith("axiom.graph.")
) {
  console.error("Expected an axiom.graph.* JSON payload from `axi observe --json`.");
  process.exit(2);
}

const architectureSummary = readRecord(payload.architectureSummary);
if (!architectureSummary) {
  console.error("Expected graph JSON with architectureSummary. Re-run with Axiom graph JSON v11 or newer.");
  process.exit(2);
}

const summary = readRecord(payload.summary) ?? {};
const interpretation = readRecord(architectureSummary.interpretation);
const topSignals = Array.isArray(architectureSummary.topSignals) ? architectureSummary.topSignals : [];
const nextActions = Array.isArray(architectureSummary.suggestedNextActions)
  ? architectureSummary.suggestedNextActions
  : [];

const lines = [
  "## Axiom Architecture Summary",
  "",
  `Status: ${formatLabel(architectureSummary.status)}`,
  `Review mode: ${formatLabel(architectureSummary.mode)}`,
  `Gate: ${formatGate(architectureSummary.gate)}`,
  `Focus: ${formatText(architectureSummary.reviewFocus)}`,
  "",
  "### Counts",
  `- Modules: ${formatNumber(summary.modules)}`,
  `- Observed dependencies: ${formatObservedDependencyCount(summary)}`,
  `- Hard violations: ${formatNumber(summary.violations)}`,
  `- Intentional violations: ${formatNumber(summary.intentionalViolations)}`,
  `- Advisory warnings: ${formatNumber(summary.warnings)}`,
  "",
  "### Advisory Signal Handling",
  "- Advisory warnings are review pressure, not a cleanup checklist or failure state.",
  "- Do not refactor solely to reach zero warnings; first name the architecture hypothesis and verification plan.",
  "",
  "### Interpretation",
  ...formatInterpretation(interpretation),
  "",
  "### Top Signals",
  ...formatTopSignals(topSignals),
  "",
  "### Suggested Next Actions",
  ...formatNextActions(nextActions),
  "",
  "_This summary is generated from `axi observe --json`. Use `axi check` for the CI gate._"
];

console.log(lines.join("\n"));

function readRecord(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : undefined;
}

function formatGate(gate) {
  const record = readRecord(gate);
  const command = typeof record?.command === "string" ? record.command : "axi check";
  return `use \`${command}\` for CI failures; this summary is advisory`;
}

function formatObservedDependencyCount(summary) {
  const observed = formatNumber(summary.observedDependencies);
  const shown = typeof summary.shownObservedDependencies === "number" ? summary.shownObservedDependencies : undefined;

  if (shown === undefined || shown === summary.observedDependencies) {
    return observed;
  }

  return `${shown} of ${observed}`;
}

function formatTopSignals(signals) {
  if (signals.length === 0) {
    return ["- None"];
  }

  return signals.slice(0, 5).map((signal) => {
    const record = readRecord(signal) ?? {};
    const kind = capitalize(formatLabel(record.kind));
    const code = typeof record.code === "string" ? record.code : "architecture_signal";
    const location = formatLocation(record.location);
    const edge = formatEdge(record.edge);
    const accepted = typeof record.acceptedUntil === "string" ? ` Accepted until: \`${record.acceptedUntil}\`.` : "";
    const reason = typeof record.reason === "string" ? ` Reason: ${record.reason}.` : "";
    const message = formatText(record.message);

    return `- ${kind} \`${code}\`${location}${edge}: ${message}.${accepted}${reason}`;
  });
}

function formatNextActions(actions) {
  if (actions.length === 0) {
    return ["- No action suggested."];
  }

  return actions.map((action) => `- ${formatText(action)}`);
}

function formatInterpretation(interpretation) {
  if (!interpretation) {
    return ["- No interpretation available."];
  }

  const lines = [`- Headline: ${formatText(interpretation.headline)}`];
  const lookFirst = Array.isArray(interpretation.lookFirst) ? interpretation.lookFirst : [];
  if (lookFirst.length > 0) {
    lines.push("- Look first:");
    for (const item of lookFirst) {
      lines.push(`  - ${formatText(item)}`);
    }
  }

  const centralModules = Array.isArray(interpretation.centralModules) ? interpretation.centralModules : [];
  lines.push("- Central modules:");
  if (centralModules.length === 0) {
    lines.push("  - None observed in this scan scope.");
  } else {
    for (const module of centralModules.slice(0, 3)) {
      const record = readRecord(module) ?? {};
      const name = typeof record.module === "string" ? record.module : "unknown";
      const role = formatLabel(record.role);
      const totalImportSites = formatNumber(record.totalImportSites);
      const incomingModules = formatNumber(record.incomingModules);
      const outgoingModules = formatNumber(record.outgoingModules);
      lines.push(
        `  - \`${name}\` (${role}): ${totalImportSites} import sites, fan-in ${incomingModules}, fan-out ${outgoingModules}`
      );
    }
  }

  return lines;
}

function formatLocation(location) {
  const record = readRecord(location);
  if (!record || typeof record.filePath !== "string" || typeof record.line !== "number") {
    return "";
  }

  return ` at \`${record.filePath}:${record.line}\``;
}

function formatEdge(edge) {
  const record = readRecord(edge);
  if (!record || typeof record.fromModule !== "string" || typeof record.toModule !== "string") {
    return "";
  }

  return ` on \`${record.fromModule} -> ${record.toModule}\``;
}

function formatLabel(value) {
  return typeof value === "string" && value.length > 0 ? value.replace(/_/g, " ") : "unknown";
}

function capitalize(value) {
  return value.length > 0 ? `${value[0].toUpperCase()}${value.slice(1)}` : value;
}

function formatText(value) {
  if (typeof value !== "string" || value.length === 0) {
    return "No details provided";
  }

  return value.endsWith(".") ? value.slice(0, -1) : value;
}

function formatNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? String(value) : "0";
}

function decodeJsonText(buffer) {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.subarray(2).toString("utf16le");
  }

  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return buffer.subarray(3).toString("utf8");
  }

  return buffer.toString("utf8");
}
