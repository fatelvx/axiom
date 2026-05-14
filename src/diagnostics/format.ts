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
      `  contract: ${diagnostic.suppression.fromModule} intentionally accepts ${diagnostic.suppression.code} to ${diagnostic.suppression.toModule}${formatPathScopeText(
        diagnostic.suppression.pathScope
      )} until ${diagnostic.suppression.expiresOn} (${ruleLocation})`
    );
    lines.push(`  reason: ${diagnostic.suppression.reason}`);
    lines.push("");
  }

  return lines;
}

function formatPathScopeText(pathScope: string | undefined): string {
  return pathScope ? ` at "${pathScope}"` : "";
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

  const sourceFileCount = readNumber(violation.details.sourceFiles);
  const importsScanned = readNumber(violation.details.importsScanned);
  if (sourceFileCount !== undefined || importsScanned !== undefined) {
    lines.push(
      `  scan: ${sourceFileCount ?? "unknown"} source files, ${importsScanned ?? "unknown"} imports scanned`
    );
  }

  const topLargestFiles = readRecordArray(violation.details.topLargestFiles);
  if (topLargestFiles.length > 0) {
    lines.push("  top largest files:");
    for (const file of topLargestFiles) {
      const filePath = readString(file.filePath) ?? "unknown";
      const lineCount = readNumber(file.lineCount) ?? 0;
      const importCount = readNumber(file.imports) ?? 0;
      const functionCount = readNumber(file.functions) ?? 0;
      const classCount = readNumber(file.classes) ?? 0;
      lines.push(`    ${filePath} (${lineCount} lines, ${importCount} imports, ${functionCount} functions, ${classCount} classes)`);
    }
  }

  const inferredModuleCandidates = readRecordArray(violation.details.inferredModuleCandidates);
  if (inferredModuleCandidates.length > 0) {
    lines.push("  inferred module candidates:");
    for (const candidate of inferredModuleCandidates) {
      const name = readString(candidate.name) ?? "Module";
      const candidatePath = readString(candidate.path) ?? "unknown";
      const fileCount = readNumber(candidate.fileCount) ?? 0;
      lines.push(`    ${name}: ${candidatePath} (${fileCount} files)`);
    }
  }

  const scopeHints = readRecordArray(violation.details.scopeHints);
  if (scopeHints.length > 0) {
    lines.push("  scope guidance:");
    for (const hint of scopeHints) {
      const message = readString(hint.message);
      if (message) {
        lines.push(`    ${message}`);
      }

      const matchedFolders = readStringArray(hint.matchedFolders);
      if (matchedFolders.length > 0) {
        lines.push(`    matched folders: ${matchedFolders.join(", ")}`);
      }

      const samplePaths = readStringArray(hint.samplePaths);
      if (samplePaths.length > 0) {
        lines.push(`    examples: ${samplePaths.join(", ")}`);
      }

      const suggestion = readString(hint.suggestion);
      if (suggestion) {
        lines.push(`    try: ${suggestion}`);
      }
    }
  }

  const lineCount = readNumber(violation.details.lineCount);
  if (lineCount !== undefined) {
    lines.push(`  line count: ${lineCount}`);
  }

  const threshold = readRecord(violation.details.threshold);
  const lineThreshold = readNumber(threshold?.lines);
  if (lineThreshold !== undefined) {
    lines.push(`  threshold: lines >= ${lineThreshold}`);
  }

  const functionLikeCount = readNumber(violation.details.functionLikeCount);
  const classCount = readNumber(violation.details.classCount);
  const exportsScanned = readNumber(violation.details.exportsScanned);
  if (functionLikeCount !== undefined || classCount !== undefined || exportsScanned !== undefined) {
    lines.push(
      `  file shape: ${functionLikeCount ?? 0} functions, ${classCount ?? 0} classes, ${exportsScanned ?? 0} exports`
    );
  }

  const nameTokenClusters = formatNameTokenClusters(violation.details.nameTokenClusters);
  if (nameTokenClusters) {
    lines.push(`  name clusters: ${nameTokenClusters}`);
  }

  const responsibilityHint = readString(violation.details.responsibilityHint);
  if (responsibilityHint) {
    lines.push(`  responsibility hint: ${responsibilityHint}`);
  }

  const scope = readString(violation.details.scope);
  if (scope) {
    lines.push(`  scope: ${scope}`);
  }

  const pathScope = readString(violation.details.pathScope);
  if (pathScope) {
    lines.push(`  path scope: ${pathScope}`);
  }

  const reviewKind = readString(violation.details.reviewKind);
  if (reviewKind) {
    lines.push(`  review kind: ${reviewKind}`);
  }

  const roleHint = readString(violation.details.roleHint);
  if (roleHint) {
    lines.push(`  role hint: ${roleHint}`);
  }

  const entryFiles = readStringArray(violation.details.entryFiles);
  if (entryFiles.length > 0) {
    lines.push(`  entry files: ${entryFiles.join(", ")}`);
  }

  const entryFileFanOutModules = readNumber(violation.details.entryFileFanOutModules);
  const entryFileImportSites = readNumber(violation.details.entryFileImportSites);
  if (entryFileFanOutModules !== undefined || entryFileImportSites !== undefined) {
    lines.push(
      `  entry file fan-out: ${entryFileFanOutModules ?? "unknown"} modules, ${
        entryFileImportSites ?? "unknown"
      } import sites`
    );
  }

  const note = readString(violation.details.note);
  if (note) {
    lines.push(`  note: ${note}`);
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

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function readRecordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(readRecord(item)))
    : [];
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function formatNameTokenClusters(value: unknown): string | undefined {
  const clusters = readRecordArray(value)
    .map((cluster) => {
      const token = typeof cluster.token === "string" ? cluster.token : undefined;
      const count = readNumber(cluster.count);
      const samples = readStringArray(cluster.samples);
      if (!token || count === undefined) {
        return undefined;
      }

      const sampleText = samples.length > 0 ? `: ${samples.slice(0, 3).join(", ")}` : "";
      return `${token} (${count}${sampleText})`;
    })
    .filter((cluster): cluster is string => cluster !== undefined);

  return clusters.length > 0 ? clusters.join("; ") : undefined;
}
