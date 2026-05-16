import path from "node:path";
import type { SourceLocation } from "../axi/types.js";

// Shared graph diagnostics value readers; keep validation semantics in the validator.

export interface GraphLocationValue {
  filePath: string;
  line: number;
  column?: number;
}

export function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

export function readRecordArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value)
    ? value.filter((item): item is Record<string, unknown> => Boolean(readRecord(item)))
    : [];
}

export function formatNameTokenClusters(value: unknown, formatValue: (value: string) => string): string | undefined {
  const clusters = readRecordArray(value)
    .map((cluster) => {
      const token = readString(cluster.token);
      const count = readNumber(cluster.count);
      const samples = readStringArray(cluster.samples);
      if (!token || count === undefined) {
        return undefined;
      }

      const sampleText =
        samples.length > 0 ? `: ${samples.slice(0, 3).map(formatValue).join(", ")}` : "";
      return `${formatValue(token)} (${count}${sampleText})`;
    })
    .filter((cluster): cluster is string => cluster !== undefined);

  return clusters.length > 0 ? clusters.join("; ") : undefined;
}

export function readLocation(value: unknown): GraphLocationValue | undefined {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const location = value as Partial<GraphLocationValue>;
  if (typeof location.filePath !== "string" || typeof location.line !== "number") {
    return undefined;
  }

  return {
    filePath: location.filePath,
    line: location.line,
    column: location.column
  };
}

export function formatExpirationDistance(daysUntilExpiration: number): string {
  if (daysUntilExpiration === 0) {
    return "today";
  }

  if (daysUntilExpiration === 1) {
    return "in 1 day";
  }

  return `in ${daysUntilExpiration} days`;
}

export function normalizeDetails(root: string, value: Record<string, unknown>): Record<string, unknown> {
  return normalizeValue(root, value) as Record<string, unknown>;
}

export function toJsonLocation(root: string, location: SourceLocation): GraphLocationValue {
  return {
    filePath: relativePath(root, location.filePath),
    line: location.line,
    ...(location.column === undefined ? {} : { column: location.column })
  };
}

export function relativePath(root: string, filePath: string): string {
  if (!path.isAbsolute(filePath)) {
    return normalizePath(filePath);
  }

  const relative = path.relative(root, filePath);
  return normalizePath(relative.length > 0 ? relative : ".");
}

function normalizeValue(root: string, value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeValue(root, item));
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  if (isSourceLocation(value)) {
    return toJsonLocation(root, value);
  }

  const entries = Object.entries(value).map(([key, item]) => {
    if (key === "filePath" || key === "resolvedPath") {
      return [key, typeof item === "string" ? relativePath(root, item) : item];
    }

    return [key, normalizeValue(root, item)];
  });

  return Object.fromEntries(entries);
}

function isSourceLocation(value: object): value is SourceLocation {
  const maybeLocation = value as Partial<SourceLocation>;
  return typeof maybeLocation.filePath === "string" && typeof maybeLocation.line === "number";
}

export function normalizePath(filePath: string): string {
  return filePath.replace(/\\/g, "/");
}
