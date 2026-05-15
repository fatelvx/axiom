import type { GraphJsonResult } from "./graph.js";

type GraphJsonWarning = GraphJsonResult["warnings"][number];

export interface WarningCluster {
  key: string;
  code: string;
  subject: string;
  count: number;
}

interface WarningReviewPressure {
  kind: "advisory_warning_root";
  title: string;
  description: string;
  severity: "review";
  count: number;
  code: string;
  modules: string[];
}

export function warningClusterToReviewPressure(cluster: WarningCluster): WarningReviewPressure {
  const modules = readWarningClusterModules(cluster);

  if (cluster.code === "deep_internal_import") {
    const moduleName = modules[0] ?? "module";
    if (cluster.subject.includes("state/store leakage")) {
      return {
        kind: "advisory_warning_root",
        title: `State/store leakage into ${moduleName}`,
        description: `${cluster.count} deep import${pluralize(
          cluster.count
        )} target state or store internals; review whether state should be injected, evented, or exposed through an explicit boundary.`,
        severity: "review",
        count: cluster.count,
        code: cluster.code,
        modules
      };
    }

    if (cluster.subject.includes("tool boundary pressure")) {
      return {
        kind: "advisory_warning_root",
        title: `Tool boundary pressure in ${moduleName}`,
        description: `${cluster.count} deep import${pluralize(
          cluster.count
        )} touch tool or tooling internals; review whether contracts/types should move to a smaller shared boundary.`,
        severity: "review",
        count: cluster.count,
        code: cluster.code,
        modules
      };
    }

    if (cluster.subject.includes("ambiguous public boundary")) {
      return {
        kind: "advisory_warning_root",
        title: `Ambiguous public boundary in ${moduleName}`,
        description: `${cluster.count} deep import${pluralize(
          cluster.count
        )} have no clear same-source-group entrypoint; split the module or declare explicit exposure rules before rewriting imports.`,
        severity: "review",
        count: cluster.count,
        code: cluster.code,
        modules
      };
    }

    return {
      kind: "advisory_warning_root",
      title: `Public-entry bypass in ${moduleName}`,
      description: `${cluster.count} deep import${pluralize(
        cluster.count
      )} bypass a likely source-group entrypoint; review whether the import should use the public boundary or be declared intentional.`,
      severity: "review",
      count: cluster.count,
      code: cluster.code,
      modules
    };
  }

  if (cluster.code === "composition_root_pressure") {
    const moduleName =
      modules[0] ??
      cluster.subject
        .replace(" composition root imports", "")
        .replace(" composition root fan-out", "");
    return {
      kind: "advisory_warning_root",
      title: `Composition root pressure in ${moduleName}`,
      description: `${cluster.count} concentration warning${pluralize(
        cluster.count
      )} likely comes from entry-point wiring; review whether the entry file only composes modules or is also accumulating product logic.`,
      severity: "review",
      count: cluster.count,
      code: cluster.code,
      modules
    };
  }

  if (cluster.code === "coupling_concentration") {
    if (
      cluster.subject.includes("composition root fan-out") ||
      cluster.subject.includes("composition root imports")
    ) {
      const moduleName =
        modules[0] ??
        cluster.subject
          .replace(" composition root fan-out", "")
          .replace(" composition root imports", "");
      return {
        kind: "advisory_warning_root",
        title: `Composition root pressure in ${moduleName}`,
        description: `${cluster.count} concentration warning${pluralize(
          cluster.count
        )} likely comes from entry-point wiring; review whether the entry file only composes modules or is also accumulating product logic.`,
        severity: "review",
        count: cluster.count,
        code: cluster.code,
        modules
      };
    }

    return {
      kind: "advisory_warning_root",
      title: `Coupling concentration around ${cluster.subject}`,
      description: `${cluster.count} concentration warning${pluralize(
        cluster.count
      )} suggest this module may be becoming a coordination hub.`,
      severity: "review",
      count: cluster.count,
      code: cluster.code,
      modules
    };
  }

  if (cluster.code === "large_module_file") {
    return {
      kind: "advisory_warning_root",
      title: "Intra-file responsibility pressure",
      description: `${cluster.count} large source file${pluralize(
        cluster.count
      )} may hide architecture pressure that import graphs cannot see.`,
      severity: "review",
      count: cluster.count,
      code: cluster.code,
      modules
    };
  }

  return {
    kind: "advisory_warning_root",
    title: `${cluster.code} around ${cluster.subject}`,
    description: `${cluster.count} advisory signal${pluralize(cluster.count)} share this root.`,
    severity: "review",
    count: cluster.count,
    code: cluster.code,
    modules
  };
}

export function formatWarningClusters(warnings: GraphJsonWarning[]): string[] {
  const clusters = buildWarningClusters(warnings);
  if (warnings.length <= 1) {
    return [];
  }

  const lines = ["  likely roots:"];
  for (const cluster of clusters.slice(0, 8)) {
    lines.push(`    ${cluster.code} ${cluster.subject}: ${cluster.count} warning${pluralize(cluster.count)}`);
  }
  if (clusters.length > 8) {
    lines.push(`    ... ${clusters.length - 8} more cluster${pluralize(clusters.length - 8)}`);
  }
  return lines;
}

export function formatMarkdownWarningClusters(warnings: GraphJsonWarning[]): string[] {
  const clusters = buildWarningClusters(warnings);
  if (warnings.length <= 1) {
    return [];
  }

  const lines = ["- Likely warning roots:"];
  for (const cluster of clusters.slice(0, 8)) {
    lines.push(
      `  - ${markdownCode(cluster.code)} ${markdownCode(cluster.subject)}: ${cluster.count} warning${pluralize(
        cluster.count
      )}`
    );
  }
  if (clusters.length > 8) {
    lines.push(`  - ${clusters.length - 8} more cluster${pluralize(clusters.length - 8)}`);
  }
  return lines;
}

export function buildWarningClusters(warnings: GraphJsonWarning[]): WarningCluster[] {
  const clusters = new Map<string, WarningCluster>();

  for (const warning of warnings) {
    const subject = warningClusterSubject(warning);
    const code = warningDisplayCode(warning);
    const key = `${code}\0${subject}`;
    const existing = clusters.get(key) ?? {
      key,
      code,
      subject,
      count: 0
    };
    existing.count += 1;
    clusters.set(key, existing);
  }

  return [...clusters.values()].sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    return `${left.code}\0${left.subject}`.localeCompare(`${right.code}\0${right.subject}`);
  });
}

export function warningDisplayCode(warning: GraphJsonWarning): string {
  if (
    warning.code === "coupling_concentration" &&
    readString(warning.details?.reviewKind) === "composition_root_pressure"
  ) {
    return "composition_root_pressure";
  }

  return warning.code;
}

function readWarningClusterModules(cluster: WarningCluster): string[] {
  if (cluster.code === "large_module_file") {
    return [];
  }

  const subject = cluster.subject;
  const arrowModules = subject.includes(" -> ")
    ? subject
        .split(" -> ")
        .map((part) => part.trim())
        .filter(Boolean)
    : [];
  if (arrowModules.length > 0) {
    return arrowModules;
  }

  const boundaryMatch = subject.match(/^(?<module>.+?) (state\/store leakage|tool boundary pressure|ambiguous public boundary|public-entry bypass):/);
  if (boundaryMatch?.groups?.module) {
    return [boundaryMatch.groups.module];
  }

  const compositionMatch = subject.match(/^(?<module>.+?) composition root (imports|fan-out)$/);
  if (compositionMatch?.groups?.module) {
    return [compositionMatch.groups.module];
  }

  if (subject !== "general") {
    return [subject];
  }

  return [];
}

function warningClusterSubject(warning: GraphJsonWarning): string {
  if (warning.code === "deep_internal_import") {
    return deepInternalImportClusterSubject(warning);
  }

  if (warning.code === "large_module_file") {
    return "intra-file responsibility pressure";
  }

  if (
    warning.code === "coupling_concentration" &&
    readString(warning.details?.reviewKind) === "composition_root_pressure"
  ) {
    const moduleName = readString(warning.details?.module);
    return moduleName ? `${moduleName} composition root imports` : "composition root imports";
  }

  const fromModule = readString(warning.details?.fromModule);
  const toModule = readString(warning.details?.toModule);
  if (fromModule && toModule) {
    return `${fromModule} -> ${toModule}`;
  }

  const moduleName = readString(warning.details?.module);
  if (moduleName) {
    return moduleName;
  }

  const target = readString(warning.details?.target);
  if (target) {
    return target;
  }

  return "general";
}

function deepInternalImportClusterSubject(warning: GraphJsonWarning): string {
  const toModule = readString(warning.details?.toModule) ?? "unknown module";
  const deepImportGroup = readString(warning.details?.deepImportGroup);
  const importedPath = readString(warning.details?.importedPath);
  const entrypointConfidence = readString(warning.details?.entrypointConfidence);
  const group = deepImportGroup ?? "unknown source group";
  const label = classifyDeepInternalRoot(importedPath, entrypointConfidence);

  return `${toModule} ${label}: ${group}`;
}

function classifyDeepInternalRoot(importedPath: string | undefined, entrypointConfidence: string | undefined): string {
  const segments = (importedPath ?? "").split("/").filter(Boolean);
  if (segments.includes("store")) {
    return "state/store leakage";
  }

  if (segments.includes("tooling") || segments.includes("tools")) {
    return "tool boundary pressure";
  }

  if (entrypointConfidence === "ambiguous_entrypoints") {
    return "ambiguous public boundary";
  }

  return "public-entry bypass";
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function markdownCode(value: string | number): string {
  return `\`${String(value).replace(/`/g, "\\`")}\``;
}

function pluralize(count: number): string {
  return count === 1 ? "" : "s";
}
