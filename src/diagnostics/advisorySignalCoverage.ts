import type { ViolationCode } from "../axi/types.js";
import type { AdvisorySignalOptions } from "../validator/check.js";

export type AdvisorySignalCoverageStatus =
  | "checked_no_findings"
  | "findings_reported"
  | "not_evaluated_needs_contract"
  | "not_applicable_no_exposed_paths";

export interface GraphJsonAdvisorySignalCoverageEntry {
  family: keyof AdvisorySignalOptions;
  label: string;
  warningCodes: ViolationCode[];
  findings: number;
  status: AdvisorySignalCoverageStatus;
  note?: string;
}

export interface GraphJsonAdvisorySignalCoverage {
  enabledFamilies: GraphJsonAdvisorySignalCoverageEntry[];
  caveat: string;
}

interface AdvisorySignalDefinition {
  family: keyof AdvisorySignalOptions;
  label: string;
  warningCodes: ViolationCode[];
  requiresDeclaredModules: boolean;
  requiresExposedPaths?: boolean;
}

const advisorySignalDefinitions: AdvisorySignalDefinition[] = [
  {
    family: "unresolvedImports",
    label: "unresolved static imports",
    warningCodes: ["unresolved_import"],
    requiresDeclaredModules: true
  },
  {
    family: "dynamicImports",
    label: "non-literal dynamic dependency expressions",
    warningCodes: ["dynamic_dependency_expression"],
    requiresDeclaredModules: true
  },
  {
    family: "publicApiSurface",
    label: "public API surface probes",
    warningCodes: ["broad_public_surface", "public_entrypoint_coupling"],
    requiresDeclaredModules: true,
    requiresExposedPaths: true
  },
  {
    family: "couplingConcentration",
    label: "module coupling concentration",
    warningCodes: ["coupling_concentration"],
    requiresDeclaredModules: true
  },
  {
    family: "deepInternalImports",
    label: "deep internal imports",
    warningCodes: ["deep_internal_import"],
    requiresDeclaredModules: true
  },
  {
    family: "largeFiles",
    label: "large source files",
    warningCodes: ["large_module_file"],
    requiresDeclaredModules: false
  }
];

export function buildAdvisorySignalCoverage(input: {
  options: AdvisorySignalOptions;
  warningCodes: ViolationCode[];
  declaredModuleCount: number;
  exposedPathCount: number;
}): GraphJsonAdvisorySignalCoverage | undefined {
  const enabledFamilies = advisorySignalDefinitions
    .filter((definition) => input.options[definition.family])
    .map((definition) => {
      const findings = input.warningCodes.filter((code) => definition.warningCodes.includes(code)).length;
      const status = formatCoverageStatus(definition, findings, input);

      return {
        family: definition.family,
        label: definition.label,
        warningCodes: definition.warningCodes,
        findings,
        status,
        ...(formatCoverageNote(status) ? { note: formatCoverageNote(status) } : {})
      };
    });

  if (enabledFamilies.length === 0) {
    return undefined;
  }

  return {
    enabledFamilies,
    caveat:
      "Checked with no findings means this static scan did not report that advisory signal family. It is not proof of semantic architecture health or runtime dependency completeness."
  };
}

export function formatAdvisorySignalCoverageSummary(
  coverage: GraphJsonAdvisorySignalCoverage | undefined
): string[] {
  if (!coverage) {
    return [];
  }

  return formatAdvisorySignalCoverageLines(coverage, {
    checkedPrefix: "advisory checks with no findings",
    notEvaluatedPrefix: "advisory checks not evaluated"
  });
}

export function formatAdvisorySignalCoverageDetails(
  coverage: GraphJsonAdvisorySignalCoverage | undefined
): string[] {
  if (!coverage) {
    return [];
  }

  return formatAdvisorySignalCoverageLines(coverage, {
    checkedPrefix: "checked with no findings",
    notEvaluatedPrefix: "not evaluated",
    indent: "  "
  });
}

export function formatAdvisorySignalCoverageMarkdown(
  coverage: GraphJsonAdvisorySignalCoverage | undefined
): string[] {
  if (!coverage) {
    return [];
  }

  const lines: string[] = [];
  const checkedNoFindings = coverage.enabledFamilies.filter((entry) => entry.status === "checked_no_findings");
  const notEvaluated = coverage.enabledFamilies.filter(
    (entry) => entry.status === "not_evaluated_needs_contract" || entry.status === "not_applicable_no_exposed_paths"
  );

  if (checkedNoFindings.length > 0) {
    lines.push(`- Checked with no findings: ${checkedNoFindings.map((entry) => entry.label).join(", ")}.`);
  }

  if (notEvaluated.length > 0) {
    lines.push(`- Not evaluated: ${notEvaluated.map(formatCoverageEntryWithNote).join(", ")}.`);
  }

  if (checkedNoFindings.length > 0 || notEvaluated.length > 0) {
    lines.push(`- Coverage caveat: ${coverage.caveat}`);
  }

  return lines;
}

function formatCoverageStatus(
  definition: AdvisorySignalDefinition,
  findings: number,
  input: {
    declaredModuleCount: number;
    exposedPathCount: number;
  }
): AdvisorySignalCoverageStatus {
  if (definition.requiresDeclaredModules && input.declaredModuleCount === 0) {
    return "not_evaluated_needs_contract";
  }

  if (definition.requiresExposedPaths && input.exposedPathCount === 0) {
    return "not_applicable_no_exposed_paths";
  }

  return findings > 0 ? "findings_reported" : "checked_no_findings";
}

function formatCoverageNote(status: AdvisorySignalCoverageStatus): string | undefined {
  switch (status) {
    case "not_evaluated_needs_contract":
      return "Needs declared module ownership from a .axi contract or temporary inferred contract.";
    case "not_applicable_no_exposed_paths":
      return "Needs active exposes rules before public API surface probes can inspect declared entry points.";
    case "checked_no_findings":
    case "findings_reported":
      return undefined;
  }
}

function formatAdvisorySignalCoverageLines(
  coverage: GraphJsonAdvisorySignalCoverage,
  options: {
    checkedPrefix: string;
    notEvaluatedPrefix: string;
    indent?: string;
  }
): string[] {
  const indent = options.indent ?? "";
  const lines: string[] = [];
  const checkedNoFindings = coverage.enabledFamilies.filter((entry) => entry.status === "checked_no_findings");
  const notEvaluated = coverage.enabledFamilies.filter(
    (entry) => entry.status === "not_evaluated_needs_contract" || entry.status === "not_applicable_no_exposed_paths"
  );

  if (checkedNoFindings.length > 0) {
    lines.push(`${indent}${options.checkedPrefix}: ${checkedNoFindings.map((entry) => entry.label).join(", ")}`);
  }

  if (notEvaluated.length > 0) {
    lines.push(`${indent}${options.notEvaluatedPrefix}: ${notEvaluated.map(formatCoverageEntryWithNote).join(", ")}`);
  }

  if (checkedNoFindings.length > 0 || notEvaluated.length > 0) {
    lines.push(`${indent}coverage caveat: ${coverage.caveat}`);
  }

  return lines;
}

function formatCoverageEntryWithNote(entry: GraphJsonAdvisorySignalCoverageEntry): string {
  return entry.note ? `${entry.label} (${entry.note})` : entry.label;
}
