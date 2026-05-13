import path from "node:path";
import type { SourceLocation, SuppressedViolation, Violation } from "../axi/types.js";
import type { CheckResult } from "../validator/check.js";

export function formatCheckResult(result: CheckResult): string {
  if (result.violations.length === 0 && result.warnings.length === 0 && result.suppressedViolations.length === 0) {
    return formatPassedSummary(result, "Axiom check passed.");
  }

  if (result.violations.length === 0) {
    return [
      formatPassedSummary(result, passedWithNonFailingDiagnosticsHeader(result)),
      ...(result.suppressedViolations.length > 0
        ? ["", ...formatIntentionalViolations(result.root, result.suppressedViolations)]
        : []),
      ...(result.warnings.length > 0 ? ["", ...formatDiagnostics(result.root, result.warnings, "warning")] : [])
    ].join("\n").trimEnd();
  }

  const lines = [
    "Axiom check failed.",
    `violations: ${result.violations.length}`,
    ...(result.warnings.length > 0 ? [`warnings: ${result.warnings.length}`] : []),
    ...(result.suppressedViolations.length > 0 ? [`intentional violations: ${result.suppressedViolations.length}`] : []),
    "",
    ...formatDiagnostics(result.root, result.violations, "error")
  ];

  if (result.warnings.length > 0) {
    lines.push("");
    lines.push(...formatDiagnostics(result.root, result.warnings, "warning"));
  }

  if (result.suppressedViolations.length > 0) {
    lines.push("");
    lines.push(...formatIntentionalViolations(result.root, result.suppressedViolations));
  }

  return lines.join("\n").trimEnd();
}

function passedWithNonFailingDiagnosticsHeader(result: CheckResult): string {
  if (result.suppressedViolations.length > 0 && result.warnings.length > 0) {
    return "Axiom check passed with intentional violations and warnings.";
  }

  if (result.suppressedViolations.length > 0) {
    return "Axiom check passed with intentional violations.";
  }

  return "Axiom check passed with warnings.";
}

function formatPassedSummary(result: CheckResult, header: string): string {
  return [
    header,
    `modules: ${result.spec.modules.length}`,
    `source files: ${result.sourceFiles.length}`,
    `imports scanned: ${result.importCount}`,
    `observed dependencies: ${result.observedDependencies.length}`,
    ...(result.suppressedViolations.length > 0 ? [`intentional violations: ${result.suppressedViolations.length}`] : []),
    ...(result.warnings.length > 0 ? [`warnings: ${result.warnings.length}`] : [])
  ].join("\n");
}

function formatDiagnostics(root: string, diagnostics: Violation[], severity: "error" | "warning"): string[] {
  const lines: string[] = [];

  for (const diagnostic of diagnostics) {
    lines.push(formatDiagnostic(root, diagnostic, severity));
    lines.push("");
  }

  return lines;
}

function formatIntentionalViolations(root: string, diagnostics: SuppressedViolation[]): string[] {
  const lines = ["intentional violations (accepted by contract):"];

  for (const diagnostic of diagnostics) {
    const location = diagnostic.violation.location
      ? formatLocation(root, diagnostic.violation.location.filePath, diagnostic.violation.location.line)
      : "";
    const suffix = location ? ` ${location}` : "";
    const ruleLocation = formatLocation(root, diagnostic.suppression.location.filePath, diagnostic.suppression.location.line);

    lines.push(`intentional violation ${diagnostic.violation.code}${suffix}`);
    lines.push(`  ${diagnostic.violation.message}`);
    lines.push(...formatDetails(root, diagnostic.violation));
    lines.push(
      `  contract: ${diagnostic.suppression.fromModule} intentionally accepts ${diagnostic.suppression.code} to ${diagnostic.suppression.toModule} until ${diagnostic.suppression.expiresOn} (${ruleLocation})`
    );
    lines.push(`  reason: ${diagnostic.suppression.reason}`);
    lines.push("");
  }

  return lines;
}

function formatDiagnostic(root: string, violation: Violation, severity: "error" | "warning"): string {
  const location = violation.location ? formatLocation(root, violation.location.filePath, violation.location.line) : "";
  const header = location ? `${severity} ${violation.code} ${location}` : `${severity} ${violation.code}`;
  const lines = [header, `  ${violation.message}`];
  lines.push(...formatDetails(root, violation));
  return lines.join("\n");
}

function formatLocation(root: string, filePath: string, line: number): string {
  const relative = path.relative(root, filePath).replace(/\\/g, "/");
  return `${relative}:${line}`;
}

function formatDetails(root: string, violation: Violation): string[] {
  if (!violation.details) {
    return [];
  }

  const lines: string[] = [];
  const observed = readString(violation.details.observed);
  const specifier = readString(violation.details.specifier);

  if (observed) {
    const suffix = specifier ? ` via "${specifier}"` : "";
    lines.push(`  observed: ${observed}${suffix}`);
  }

  const importedPath = readString(violation.details.importedPath);
  if (importedPath) {
    lines.push(`  imported path: ${importedPath}`);
  }

  const publicEntrypoints = readStringArray(violation.details.publicEntrypoints);
  if (publicEntrypoints.length > 0) {
    lines.push(`  likely entry points: ${publicEntrypoints.join(", ")}`);
  }

  const moduleEntrypoints = readStringArray(violation.details.moduleEntrypoints);
  if (moduleEntrypoints.length > 0) {
    lines.push(`  other module entry points: ${moduleEntrypoints.join(", ")}`);
  }

  const entrypointConfidence = readString(violation.details.entrypointConfidence);
  if (entrypointConfidence) {
    lines.push(`  entrypoint confidence: ${entrypointConfidence}`);
  }

  const entrypointReason = readString(violation.details.entrypointReason);
  if (entrypointReason) {
    lines.push(`  entrypoint reason: ${entrypointReason}`);
  }

  const deepImportGroup = readString(violation.details.deepImportGroup);
  if (deepImportGroup) {
    lines.push(`  deep import group: ${deepImportGroup}`);
  }

  const internalTargets = readStringArray(violation.details.internalTargets);
  if (internalTargets.length > 0) {
    lines.push(`  internal targets: ${internalTargets.join(", ")}`);
  }

  const rule = readString(violation.details.rule);
  const ruleLocation = readLocation(violation.details.ruleLocation);
  const suffix = ruleLocation ? ` (${formatLocation(root, ruleLocation.filePath, ruleLocation.line)})` : "";

  if (rule) {
    lines.push(`  rule: ${rule}${suffix}`);
  }

  const owners = readStringArray(violation.details.owners);
  if (owners.length > 0) {
    lines.push(`  owners: ${owners.join(", ")}`);
  }

  const suggestion = readString(violation.details.suggestion);
  if (suggestion) {
    lines.push(`  fix: ${suggestion}`);
  }

  return lines;
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readLocation(value: unknown): SourceLocation | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const location = value as Partial<SourceLocation>;
  if (typeof location.filePath !== "string" || typeof location.line !== "number") {
    return undefined;
  }

  return {
    filePath: location.filePath,
    line: location.line,
    column: location.column
  };
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}
