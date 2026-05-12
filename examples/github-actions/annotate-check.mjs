#!/usr/bin/env node
import { readFile } from "node:fs/promises";

const inputPath = process.argv[2];

if (!inputPath) {
  console.error("Usage: node annotate-check.mjs <axiom-check-json>");
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
  !payload.schemaVersion.startsWith("axiom.check.")
) {
  console.error("Expected an axiom.check.* JSON payload from `axi check --json`.");
  process.exit(2);
}

const violations = Array.isArray(payload.violations) ? payload.violations : [];

if (violations.length === 0) {
  const summary = payload.summary ?? {};
  const modules = Number(summary.modules ?? 0);
  const sourceFiles = Number(summary.sourceFiles ?? 0);
  const importsScanned = Number(summary.importsScanned ?? 0);
  emit("notice", {}, `Axiom check passed: ${modules} modules, ${sourceFiles} files, ${importsScanned} imports scanned.`);
  process.exit(0);
}

for (const violation of violations) {
  const location = violation.location ?? {};
  const details = violation.details ?? {};
  const properties = {};

  if (typeof location.filePath === "string" && location.filePath.length > 0) {
    properties.file = location.filePath;
  }

  if (Number.isInteger(location.line) && location.line > 0) {
    properties.line = String(location.line);
  }

  const messageParts = [
    typeof violation.code === "string" ? violation.code : "axiom_violation",
    typeof violation.message === "string" ? violation.message : undefined,
    typeof details.observed === "string" ? `observed: ${details.observed}` : undefined,
    typeof details.rule === "string" ? `rule: ${details.rule}` : undefined,
    typeof details.suggestion === "string" ? `fix: ${details.suggestion}` : undefined,
  ].filter(Boolean);

  emit("error", properties, messageParts.join(" | "));
}

function emit(kind, properties, message) {
  const serializedProperties = Object.entries(properties)
    .map(([key, value]) => `${key}=${escapeProperty(value)}`)
    .join(",");
  const propertySuffix = serializedProperties.length > 0 ? ` ${serializedProperties}` : "";
  console.log(`::${kind}${propertySuffix}::${escapeMessage(message)}`);
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

function escapeMessage(value) {
  return String(value)
    .replace(/%/g, "%25")
    .replace(/\r/g, "%0D")
    .replace(/\n/g, "%0A");
}

function escapeProperty(value) {
  return escapeMessage(value)
    .replace(/:/g, "%3A")
    .replace(/,/g, "%2C");
}
