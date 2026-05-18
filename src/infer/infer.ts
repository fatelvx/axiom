import path from "node:path";
import type { SourceFileMetric } from "../axi/types.js";
import { applyDiscoveryOverrides, loadConfig } from "../config/config.js";
import { findSourceFiles } from "../fs/discover.js";
import { createImportResolver, loadPackageResolver, type PackageMetadata } from "../scanner/importResolver.js";
import { scanSourceFile } from "../scanner/importScanner.js";
import { normalizePathForMatch } from "../validator/glob.js";
import { summarizeLargeFilePressure } from "../validator/largeFilePressure.js";
import { buildCollapsedCycleEvidence } from "./inferCycleEvidence.js";
import { buildCandidateEdges, buildObservedDependencies, type CandidateEdge } from "./inferDependencyEvidence.js";
import {
  buildInferReviewStory,
  buildStarterContract,
  inferStarterContractAuthoringChecklist,
  inferStarterContractNextCommands,
  inferStarterContractNotice,
  inferStarterContractReviewPass,
  type InferReviewPressure,
  type InferReviewStory,
  type InferStarterContract
} from "./inferGuidance.js";
import {
  candidateName,
  combinedName,
  packageNameToIdentifier,
  preferCandidateGroupName,
  sourceRootEntryModuleName,
  stripExtension,
  toIdentifier
} from "./inferNaming.js";
import { buildInferVisibilitySuggestions } from "./inferVisibility.js";

export {
  inferStarterContractAuthoringChecklist,
  inferStarterContractNextCommands,
  inferStarterContractNotice,
  inferStarterContractReviewPass
};
export type { InferReviewPressure, InferReviewStory, InferStarterContract };

export type InferGroupBy = "folder" | "workspace";

export interface InferOptions {
  root: string;
  configPath?: string;
  include?: string[];
  exclude?: string[];
  groupDepth?: number;
  groupBy?: InferGroupBy;
}

export interface InferredModule {
  name: string;
  paths: string[];
  suggestedExposes: string[];
  suggestedHides: string[];
  depends: string[];
  sourceGroups: string[];
}

export interface InferredDependency {
  fromModule: string;
  toModule: string;
  count: number;
  samples: InferredImportSample[];
}

export interface InferredImportSample {
  filePath: string;
  line: number;
  specifier: string;
  resolvedPath: string;
}

export interface CollapsedCycle {
  module: string;
  sourceGroups: string[];
  cyclePathSamples: CollapsedCyclePathSample[];
  internalDependencies: CollapsedCycleDependency[];
  cycleBreakingCandidates: CollapsedCycleBreakingCandidate[];
}

export interface CollapsedCyclePathSample {
  groups: string[];
}

export interface CollapsedCycleDependency {
  fromGroup: string;
  toGroup: string;
  count: number;
  samples: InferredImportSample[];
}

export interface CollapsedCycleBreakingCandidate {
  fromGroup: string;
  toGroup: string;
  count: number;
  samples: InferredImportSample[];
  rationale: string;
}

export interface InferArchitecturePressureNote {
  kind: "large_source_file";
  filePath: string;
  lineCount: number;
  threshold: number;
  importsScanned: number;
  exportsScanned: number;
  functionLikeCount: number;
  classCount: number;
  message: string;
}

export interface InferResult {
  root: string;
  starterContract: InferStarterContract;
  reviewStory: InferReviewStory;
  sourceFiles: string[];
  importCount: number;
  candidateModules: number;
  architecturePressureNotes: InferArchitecturePressureNote[];
  collapsedCycles: CollapsedCycle[];
  modules: InferredModule[];
  observedDependencies: InferredDependency[];
}

interface CandidateGroup {
  key: string;
  name: string;
  paths: Set<string>;
  files: string[];
}

interface Component {
  id: number;
  keys: string[];
  name: string;
}

export function runInfer(options: InferOptions): InferResult {
  const root = path.resolve(options.root);
  const config = applyDiscoveryOverrides(loadConfig(root, options.configPath), {
    include: options.include,
    exclude: options.exclude
  });
  const groupBy = options.groupBy ?? "folder";
  const packages = groupBy === "workspace" ? loadPackageResolver(root).packagesByDirectory : [];
  const allSourceFiles = findSourceFiles(root, config);
  const sourceFiles = chooseInferenceFiles(root, allSourceFiles, {
    groupBy,
    hasExplicitIncludeScope: config.include.length > 0
  });
  const resolver = createImportResolver({
    root,
    tsconfigPath: config.tsconfig,
    pythonImportRoots: config.pythonImportRoots
  });
  const workspaceSourceRoots = groupBy === "workspace" ? findWorkspaceSourceRoots(sourceFiles, packages) : new Set<string>();
  const candidateGroups = buildCandidateGroups(
    root,
    sourceFiles,
    normalizeGroupDepth(options.groupDepth),
    groupBy,
    packages,
    workspaceSourceRoots
  );
  const fileOwners = buildFileOwners(candidateGroups);
  const sourceScans = sourceFiles.map((sourceFile) => scanSourceFile(sourceFile, { resolver }));
  const imports = sourceScans.flatMap((scan) => scan.imports);
  const sourceFileMetrics = sourceScans.map((scan) => scan.metrics);
  const candidateEdges = buildCandidateEdges(root, imports, fileOwners);
  const components = collapseCycles(candidateGroups, candidateEdges);
  const keyToComponent = mapKeysToComponents(components);
  const modules = buildInferredModules(root, candidateGroups, candidateEdges, components, keyToComponent);
  const observedDependencies = buildObservedDependencies(root, candidateEdges, keyToComponent, components);
  const collapsedCycles = components
    .filter((component) => component.keys.length > 1)
    .map((component) => buildCollapsedCycleEvidence({ candidateGroups, candidateEdges, component }));
  const architecturePressureNotes = findArchitecturePressureNotes(root, sourceFileMetrics);

  return {
    root,
    starterContract: buildStarterContract(collapsedCycles, architecturePressureNotes),
    reviewStory: buildInferReviewStory({
      sourceFileCount: sourceFiles.length,
      importCount: imports.length,
      candidateModules: candidateGroups.length,
      modules,
      observedDependencies,
      collapsedCycles,
      architecturePressureNotes
    }),
    sourceFiles,
    importCount: imports.length,
    candidateModules: candidateGroups.length,
    architecturePressureNotes,
    collapsedCycles,
    modules,
    observedDependencies
  };
}

function findArchitecturePressureNotes(
  root: string,
  sourceFileMetrics: SourceFileMetric[]
): InferArchitecturePressureNote[] {
  return summarizeLargeFilePressure(root, sourceFileMetrics, { limit: 8 }).map((summary) => ({
    kind: "large_source_file",
    filePath: summary.filePath,
    lineCount: summary.lineCount,
    threshold: summary.threshold,
    importsScanned: summary.importsScanned,
    exportsScanned: summary.exportsScanned,
    functionLikeCount: summary.functionLikeCount,
    classCount: summary.classCount,
    message:
      `${summary.filePath} has ${summary.lineCount} lines; inferred module boundaries may miss responsibilities concentrated inside this file.`
  }));
}

function chooseInferenceFiles(
  root: string,
  sourceFiles: string[],
  options: {
    groupBy: InferGroupBy;
    hasExplicitIncludeScope: boolean;
  }
): string[] {
  if (options.groupBy === "workspace" || options.hasExplicitIncludeScope) {
    return sourceFiles;
  }

  const srcFiles = sourceFiles.filter((sourceFile) => relativePath(root, sourceFile).startsWith("src/"));
  return srcFiles.length > 0 ? srcFiles : sourceFiles;
}

function buildCandidateGroups(
  root: string,
  sourceFiles: string[],
  groupDepth: number,
  groupBy: InferGroupBy,
  packages: PackageMetadata[],
  workspaceSourceRoots: Set<string>
): CandidateGroup[] {
  const groups = new Map<string, CandidateGroup>();

  for (const sourceFile of sourceFiles) {
    const relative = relativePath(root, sourceFile);
    const classification = groupBy === "workspace"
      ? classifyWorkspaceSourceFile(root, sourceFile, relative, groupDepth, packages, workspaceSourceRoots)
      : classifySourceFile(relative, groupDepth);
    const group = groups.get(classification.key) ?? {
      key: classification.key,
      name: classification.name,
      paths: new Set<string>(),
      files: []
    };

    group.name = preferCandidateGroupName(group.name, classification.name);
    group.paths.add(classification.pathPattern);
    group.files.push(sourceFile);
    groups.set(classification.key, group);
  }

  return [...groups.values()].sort((left, right) => left.name.localeCompare(right.name));
}

function classifyWorkspaceSourceFile(
  root: string,
  sourceFile: string,
  relativePath: string,
  groupDepth: number,
  packages: PackageMetadata[],
  workspaceSourceRoots: Set<string>
): { key: string; name: string; pathPattern: string } {
  const ownerPackage = findNearestPackage(packages, sourceFile);
  if (!ownerPackage) {
    return classifySourceFile(relativePath, groupDepth);
  }

  const packageRoot = relativePathFrom(root, ownerPackage.directory);
  const packageRelative = relativePathFrom(ownerPackage.directory, sourceFile);
  const isRootPackage = packageRoot.length === 0;

  if (isRootPackage && !packageRelative.startsWith("src/")) {
    return classifySourceFile(relativePath, groupDepth);
  }

  if (packageRelative.startsWith("src/")) {
    const key = [packageRoot, "src"].filter(Boolean).join("/") || "src";
    const pathPattern = key === "src" ? "src/**" : `${key}/**`;

    return {
      key,
      name: packageNameToIdentifier(ownerPackage.name, packageRoot),
      pathPattern
    };
  }

  if (workspaceSourceRoots.has(path.resolve(ownerPackage.directory))) {
    return classifyWorkspaceAuxiliarySourceFile(packageRoot, packageRelative, ownerPackage.name, groupDepth);
  }

  const key = packageRoot;
  const pathPattern = `${key}/**`;

  return {
    key,
    name: packageNameToIdentifier(ownerPackage.name, packageRoot),
    pathPattern
  };
}

function classifyWorkspaceAuxiliarySourceFile(
  packageRoot: string,
  packageRelative: string,
  packageName: string | undefined,
  groupDepth: number
): { key: string; name: string; pathPattern: string } {
  const segments = packageRelative.split("/");
  const directories = segments.slice(0, -1);
  const packageIdentifier = packageNameToIdentifier(packageName, packageRoot);

  if (directories.length > 0) {
    const selected = directories.slice(0, Math.min(groupDepth, directories.length));
    const groupPath = [packageRoot, ...selected].filter(Boolean).join("/");
    return {
      key: groupPath,
      name: toIdentifier(`${packageIdentifier}-${selected.join("-")}`),
      pathPattern: directories.length < groupDepth ? `${groupPath}/*` : `${groupPath}/**`
    };
  }

  const fileName = stripExtension(segments.at(-1) ?? packageRelative);
  const key = [packageRoot, packageRelative].filter(Boolean).join("/");
  return {
    key,
    name: toIdentifier(`${packageIdentifier}-${fileName}`),
    pathPattern: key
  };
}

function classifySourceFile(relativePath: string, groupDepth: number): { key: string; name: string; pathPattern: string } {
  const segments = relativePath.split("/");

  if (segments[0] === "src") {
    const sourceDirectories = segments.slice(1, -1);
    if (sourceDirectories.length > 0) {
      const selected = sourceDirectories.slice(0, Math.min(groupDepth, sourceDirectories.length));
      const groupPath = `src/${selected.join("/")}`;
      return {
        key: groupPath,
        name: toIdentifier(selected.join("-")),
        pathPattern: sourceDirectories.length < groupDepth ? `${groupPath}/*` : `${groupPath}/**`
      };
    }

    return {
      key: "src/*",
      name: sourceRootEntryModuleName(segments.at(-1)) ?? "SrcRoot",
      pathPattern: "src/*"
    };
  }

  const sourceDirectories = segments.slice(0, -1);
  if (sourceDirectories.length > 0) {
    const selected = sourceDirectories.slice(0, Math.min(groupDepth, sourceDirectories.length));
    const groupPath = selected.join("/");
    return {
      key: groupPath,
      name: toIdentifier(selected.join("-")),
      pathPattern: sourceDirectories.length < groupDepth ? `${groupPath}/*` : `${groupPath}/**`
    };
  }

  return {
    key: relativePath,
    name: sourceRootEntryModuleName(segments.at(-1)) ?? toIdentifier(stripExtension(relativePath)),
    pathPattern: relativePath
  };
}

function buildFileOwners(candidateGroups: CandidateGroup[]): Map<string, string> {
  const owners = new Map<string, string>();

  for (const group of candidateGroups) {
    for (const file of group.files) {
      owners.set(file, group.key);
    }
  }

  return owners;
}

function collapseCycles(candidateGroups: CandidateGroup[], candidateEdges: CandidateEdge[]): Component[] {
  const keys = candidateGroups.map((group) => group.key).sort();
  const outgoing = new Map(keys.map((key) => [key, [] as string[]]));

  for (const edge of candidateEdges) {
    outgoing.get(edge.from)?.push(edge.to);
  }

  for (const targets of outgoing.values()) {
    targets.sort();
  }

  const indexByKey = new Map<string, number>();
  const lowLinkByKey = new Map<string, number>();
  const stack: string[] = [];
  const onStack = new Set<string>();
  const components: string[][] = [];
  let nextIndex = 0;

  for (const key of keys) {
    if (!indexByKey.has(key)) {
      visit(key);
    }
  }

  return uniquifyComponentNames(components
    .map((componentKeys, index) => ({
      id: index,
      keys: componentKeys.sort(),
      name: combinedName(candidateGroups, componentKeys)
    }))
    .sort((left, right) => left.name.localeCompare(right.name)));

  function visit(key: string): void {
    indexByKey.set(key, nextIndex);
    lowLinkByKey.set(key, nextIndex);
    nextIndex += 1;
    stack.push(key);
    onStack.add(key);

    for (const target of outgoing.get(key) ?? []) {
      if (!indexByKey.has(target)) {
        visit(target);
        lowLinkByKey.set(key, Math.min(readIndex(lowLinkByKey, key), readIndex(lowLinkByKey, target)));
      } else if (onStack.has(target)) {
        lowLinkByKey.set(key, Math.min(readIndex(lowLinkByKey, key), readIndex(indexByKey, target)));
      }
    }

    if (readIndex(lowLinkByKey, key) !== readIndex(indexByKey, key)) {
      return;
    }

    const component: string[] = [];
    while (stack.length > 0) {
      const item = stack.pop();
      if (!item) {
        break;
      }
      onStack.delete(item);
      component.push(item);
      if (item === key) {
        break;
      }
    }
    components.push(component);
  }
}

function mapKeysToComponents(components: Component[]): Map<string, Component> {
  const map = new Map<string, Component>();

  for (const component of components) {
    for (const key of component.keys) {
      map.set(key, component);
    }
  }

  return map;
}

function buildInferredModules(
  root: string,
  candidateGroups: CandidateGroup[],
  candidateEdges: CandidateEdge[],
  components: Component[],
  keyToComponent: Map<string, Component>
): InferredModule[] {
  const groupsByKey = new Map(candidateGroups.map((group) => [group.key, group]));

  return components
    .map((component) => {
      const depends = new Set<string>();

      for (const edge of candidateEdges) {
        const fromComponent = keyToComponent.get(edge.from);
        const toComponent = keyToComponent.get(edge.to);
        if (fromComponent?.id === component.id && toComponent && toComponent.id !== component.id) {
          depends.add(toComponent.name);
        }
      }

      const paths = new Set<string>();
      const files: string[] = [];
      for (const key of component.keys) {
        const group = groupsByKey.get(key);
        for (const pattern of group?.paths ?? []) {
          paths.add(pattern);
        }
        files.push(...(group?.files ?? []));
      }

      const visibility = buildInferVisibilitySuggestions(files.map((file) => relativePath(root, file)));
      return {
        name: component.name,
        paths: [...paths].sort(),
        suggestedExposes: visibility.suggestedExposes,
        suggestedHides: visibility.suggestedHides,
        depends: [...depends].sort(),
        sourceGroups: component.keys.map((key) => candidateName(candidateGroups, key)).sort()
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
}

function uniquifyComponentNames(components: Component[]): Component[] {
  const seen = new Map<string, number>();

  return components.map((component) => {
    const count = seen.get(component.name) ?? 0;
    seen.set(component.name, count + 1);

    if (count === 0) {
      return component;
    }

    return {
      ...component,
      name: `${component.name}${count + 1}`
    };
  });
}

function relativePath(root: string, filePath: string): string {
  return normalizePathForMatch(path.relative(root, filePath));
}

function relativePathFrom(root: string, filePath: string): string {
  return normalizePathForMatch(path.relative(root, filePath));
}

function readIndex(map: Map<string, number>, key: string): number {
  return map.get(key) ?? Number.POSITIVE_INFINITY;
}

function normalizeGroupDepth(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return 1;
  }

  return Math.max(1, Math.floor(value));
}

function findWorkspaceSourceRoots(sourceFiles: string[], packages: PackageMetadata[]): Set<string> {
  const packageDirectories = new Set<string>();

  for (const sourceFile of sourceFiles) {
    const ownerPackage = findNearestPackage(packages, sourceFile);
    if (!ownerPackage) {
      continue;
    }

    const packageRelative = relativePathFrom(ownerPackage.directory, sourceFile);
    if (packageRelative.startsWith("src/")) {
      packageDirectories.add(path.resolve(ownerPackage.directory));
    }
  }

  return packageDirectories;
}

function findNearestPackage(packages: PackageMetadata[], sourceFile: string): PackageMetadata | undefined {
  const resolvedSourceFile = path.resolve(sourceFile);
  return packages.find((packageMetadata) => isInsideDirectory(resolvedSourceFile, packageMetadata.directory));
}

function isInsideDirectory(filePath: string, directory: string): boolean {
  const relative = path.relative(directory, filePath);
  return relative === "" || Boolean(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}
