import type {
  GraphJsonDrift,
  GraphJsonImportSite,
  GraphJsonIntentionalDebt,
  GraphJsonLocation,
  GraphJsonViolation
} from "./graph.js";

export interface GraphJsonArchitectureSignal {
  kind: "setup_issue" | "hard_violation" | "visible_debt" | "advisory_warning" | "baseline_drift";
  code: string;
  message: string;
  location?: GraphJsonLocation;
  edge?: {
    fromModule: string;
    toModule: string;
  };
  acceptedUntil?: string;
  reason?: string;
}

export function formatArchitectureSummarySignals(input: {
  violations: GraphJsonViolation[];
  intentionalDebt: GraphJsonIntentionalDebt[];
  warnings: GraphJsonViolation[];
  drift?: GraphJsonDrift;
}): GraphJsonArchitectureSignal[] {
  const signals: GraphJsonArchitectureSignal[] = [];

  for (const violation of input.violations) {
    signals.push({
      kind: isSetupIssue(violation) ? "setup_issue" : "hard_violation",
      code: violation.code,
      message: violation.message,
      ...(violation.location ? { location: violation.location } : {}),
      ...edgeFromDetails(violation.details)
    });
  }

  for (const debt of input.intentionalDebt) {
    signals.push({
      kind: "visible_debt",
      code: debt.code,
      message: debt.message,
      ...(debt.location ? { location: debt.location } : {}),
      edge: {
        fromModule: debt.fromModule,
        toModule: debt.toModule
      },
      acceptedUntil: debt.acceptedUntil,
      reason: debt.reason
    });
  }

  for (const warning of input.warnings) {
    signals.push({
      kind: "advisory_warning",
      code: warning.code,
      message: warning.message,
      ...(warning.location ? { location: warning.location } : {}),
      ...edgeFromDetails(warning.details)
    });
  }

  if (input.drift) {
    for (const edge of input.drift.newObservedEdges) {
      signals.push({
        kind: "baseline_drift",
        code: input.drift.kind,
        message: `New observed edge ${edge.fromModule} -> ${edge.toModule}.`,
        ...(edge.imports[0] ? { location: pickImportLocation(edge.imports[0]) } : {}),
        edge: {
          fromModule: edge.fromModule,
          toModule: edge.toModule
        }
      });
    }

    for (const edge of input.drift.removedObservedEdges) {
      signals.push({
        kind: "baseline_drift",
        code: input.drift.kind,
        message: `Removed observed edge ${edge.fromModule} -> ${edge.toModule}.`,
        ...(edge.imports[0] ? { location: pickImportLocation(edge.imports[0]) } : {}),
        edge: {
          fromModule: edge.fromModule,
          toModule: edge.toModule
        }
      });
    }
  }

  return signals.slice(0, 5);
}

export function formatArchitectureSummaryNextActions(input: {
  violations: GraphJsonViolation[];
  intentionalDebt: GraphJsonIntentionalDebt[];
  warnings: GraphJsonViolation[];
  drift?: GraphJsonDrift;
}): string[] {
  if (input.violations.some(isSetupIssue)) {
    return [
      "Run `axi infer --root . > axiom/main.axi` to create a reviewed starter contract.",
      "Run `axi observe --root . --spec axiom/main.axi --markdown` before promoting the contract into a CI gate."
    ];
  }

  const actions: string[] = [];
  if (input.violations.length > 0) {
    actions.push("Use `axi check --json` as the hard gate and repair the listed `violations[]` first.");
    actions.push(
      "If a violation is truly temporary, propose a visible `.axi` `accepts ... [at \"path\"] until ... because ...` entry for review."
    );
  }

  if (input.intentionalDebt.length > 0) {
    actions.push("Review `intentionalDebt[]` as accepted architecture debt; remove entries when the migration is done.");
  }

  if (input.warnings.length > 0) {
    actions.push("Treat advisory `warnings[]` as architecture pressure before turning any signal into a hard rule.");
  }

  const driftCount = (input.drift?.newObservedEdges.length ?? 0) + (input.drift?.removedObservedEdges.length ?? 0);
  if (driftCount > 0) {
    actions.push("Review `drift` as baseline-aware architecture change before updating the baseline or contract.");
  } else if (actions.length === 0) {
    actions.push("Save an unfiltered `axi graph --json` baseline if you want future PRs to show architecture drift.");
  }

  return actions;
}

function edgeFromDetails(details: Record<string, unknown> | undefined): Pick<GraphJsonArchitectureSignal, "edge"> {
  const fromModule = readString(details?.fromModule);
  const toModule = readString(details?.toModule);

  return fromModule && toModule
    ? {
        edge: {
          fromModule,
          toModule
        }
      }
    : {};
}

function pickImportLocation(importSite: GraphJsonImportSite): GraphJsonLocation {
  return {
    filePath: importSite.filePath,
    line: importSite.line
  };
}

function isSetupIssue(violation: GraphJsonViolation): boolean {
  return violation.code === "no_spec_files";
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
