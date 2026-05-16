import path from "node:path";
import { largeModuleFileLineThreshold } from "../axi/constants.js";
import type { SourceFileMetric, SourceFileNameTokenCluster, Violation } from "../axi/types.js";
import { normalizePathForMatch } from "./glob.js";

// Builds review-only large-file pressure evidence; this module does not define gate semantics.
export interface LargeFilePressureSummary {
  filePath: string;
  absoluteFilePath: string;
  lineCount: number;
  threshold: number;
  importsScanned: number;
  exportsScanned: number;
  functionLikeCount: number;
  classCount: number;
  nameTokenClusters: SourceFileNameTokenCluster[];
}

export function summarizeLargeFilePressure(
  root: string,
  sourceFileMetrics: SourceFileMetric[],
  options: { limit?: number } = {}
): LargeFilePressureSummary[] {
  const ranked = rankedLargeFileMetrics(sourceFileMetrics, root);
  const limited = options.limit === undefined ? ranked : ranked.slice(0, options.limit);
  return limited.map((metric) => toLargeFilePressureSummary(root, metric));
}

export function findLargeModuleFileWarnings(sourceFileMetrics: SourceFileMetric[], root: string): Violation[] {
  return summarizeLargeFilePressure(root, sourceFileMetrics).map((summary) => ({
    code: "large_module_file" as const,
    message: "Source file is large enough that architecture pressure may be hidden inside the file.",
    location: {
      filePath: summary.absoluteFilePath,
      line: 1
    },
    details: {
      filePath: summary.filePath,
      lineCount: summary.lineCount,
      threshold: {
        lines: summary.threshold
      },
      importsScanned: summary.importsScanned,
      exportsScanned: summary.exportsScanned,
      functionLikeCount: summary.functionLikeCount,
      classCount: summary.classCount,
      ...(summary.nameTokenClusters.length > 0
        ? {
            nameTokenClusters: summary.nameTokenClusters,
            responsibilityHint:
              "Identifier token clusters are lexical review hints from declaration names. They are not proof that these are the correct module boundaries."
          }
        : {}),
      observed: `${summary.filePath} has ${summary.lineCount} lines`,
      scope: "intra_file_responsibility_pressure",
      suggestion:
        "Use this as a refactor/review prompt; split only after identifying real responsibilities. This warning does not mean the import graph is unhealthy."
    }
  }));
}

export function summarizeTopLargestFiles(
  root: string,
  sourceFileMetrics: SourceFileMetric[]
): Array<Record<string, number | string>> {
  return [...sourceFileMetrics]
    .sort((left, right) => compareLargeFileMetrics(root, left, right))
    .slice(0, 5)
    .map((metric) => ({
      filePath: relativePath(root, metric.filePath),
      lineCount: metric.lineCount,
      imports: metric.importCount,
      exports: metric.exportCount,
      functions: metric.functionLikeCount,
      classes: metric.classCount
    }));
}

function rankedLargeFileMetrics(sourceFileMetrics: SourceFileMetric[], root: string): SourceFileMetric[] {
  return sourceFileMetrics
    .filter((metric) => metric.lineCount >= largeModuleFileLineThreshold)
    .sort((left, right) => compareLargeFileMetrics(root, left, right));
}

function toLargeFilePressureSummary(root: string, metric: SourceFileMetric): LargeFilePressureSummary {
  return {
    filePath: relativePath(root, metric.filePath),
    absoluteFilePath: metric.filePath,
    lineCount: metric.lineCount,
    threshold: largeModuleFileLineThreshold,
    importsScanned: metric.importCount,
    exportsScanned: metric.exportCount,
    functionLikeCount: metric.functionLikeCount,
    classCount: metric.classCount,
    nameTokenClusters: metric.nameTokenClusters
  };
}

function compareLargeFileMetrics(root: string, left: SourceFileMetric, right: SourceFileMetric): number {
  if (right.lineCount !== left.lineCount) {
    return right.lineCount - left.lineCount;
  }

  return relativePath(root, left.filePath).localeCompare(relativePath(root, right.filePath));
}

function relativePath(root: string, filePath: string): string {
  return normalizePathForMatch(path.relative(root, filePath));
}
