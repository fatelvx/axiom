import path from "node:path";
import { largeModuleFileLineThreshold } from "../axi/constants.js";
import type { ImportRecord, SourceFileMetric } from "../axi/types.js";
import { applyDiscoveryOverrides, loadConfig } from "../config/config.js";
import { findSourceFiles } from "../fs/discover.js";
import { createImportResolver, loadPackageResolver, type PackageMetadata } from "../scanner/importResolver.js";
import { scanSourceFile } from "../scanner/importScanner.js";
import { normalizePathForMatch } from "../validator/glob.js";

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

export interface InferStarterContract {
  kind: "current_graph_snapshot";
  notice: string[];
  authoringChecklist: string[];
  nextCommands: string[];
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

interface CandidateEdge {
  from: string;
  to: string;
  count: number;
  samples: InferredImportSample[];
}

interface Component {
  id: number;
  keys: string[];
  name: string;
}

const sampleLimit = 5;
const cycleBreakingCandidateLimit = 5;

export const inferStarterContractNotice = [
  "This starter contract mirrors the current dependency graph; it is not a recommended architecture.",
  "Review module names, collapsed cycles, visibility suggestions, and dependencies before treating it as intent.",
  "Use `axi check` only after the contract describes the architecture you want to protect."
];

export const inferStarterContractAuthoringChecklist = [
  "Rename modules so they match the team's architecture vocabulary, not only folder names.",
  "Review each `depends on` edge and its evidence comments as intended architecture; remove or refactor accidental edges before using this as a gate.",
  "Turn commented `exposes` and `hides` suggestions into real rules only after confirming the public/internal boundary.",
  "Add `layers` and `layer` statements only when dependency direction is clear enough to enforce.",
  "Use `accepts ... [at \"path\"] until ... because ...` only for reviewed migration debt; do not blanket-accept first-run problems.",
  "Save an unfiltered graph JSON baseline when the draft is useful so future runs can show drift over time."
];

export const inferStarterContractNextCommands = [
  "axi observe --root . --spec <draft.axi> --markdown",
  "axi graph --root . --spec <draft.axi> --mermaid",
  "axi graph --root . --spec <draft.axi> --json > axiom-baseline.json",
  "axi diff --root . --spec <draft.axi> axiom-baseline.json"
];

export function runInfer(options: InferOptions): InferResult {
  const root = path.resolve(options.root);
  const config = applyDiscoveryOverrides(loadConfig(root, options.configPath), {
    include: options.include,
    exclude: options.exclude
  });
  const groupBy = options.groupBy ?? "folder";
  const packages = groupBy === "workspace" ? loadPackageResolver(root).packagesByDirectory : [];
  const allSourceFiles = findSourceFiles(root, config);
  const sourceFiles = chooseInferenceFiles(root, allSourceFiles, groupBy);
  const resolver = createImportResolver({ root, tsconfigPath: config.tsconfig });
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
    .map((component) => buildCollapsedCycle(candidateGroups, candidateEdges, component));
  const architecturePressureNotes = findArchitecturePressureNotes(root, sourceFileMetrics);

  return {
    root,
    starterContract: buildStarterContract(collapsedCycles, architecturePressureNotes),
    sourceFiles,
    importCount: imports.length,
    candidateModules: candidateGroups.length,
    architecturePressureNotes,
    collapsedCycles,
    modules,
    observedDependencies
  };
}

function buildStarterContract(
  collapsedCycles: CollapsedCycle[],
  architecturePressureNotes: InferArchitecturePressureNote[]
): InferStarterContract {
  const authoringChecklist = [...inferStarterContractAuthoringChecklist];

  if (collapsedCycles.length > 0) {
    authoringChecklist.push(
      "Review collapsed cycles as boundary tangles; keep a merged module only if that cycle is an intentional unit."
    );
  } else {
    authoringChecklist.push(
      "If the module map feels too broad or too detailed, rerun inference with `--group-depth` or `--group-by workspace`."
    );
  }

  if (architecturePressureNotes.length > 0) {
    authoringChecklist.push(
      "Inspect architecture pressure notes; a quiet inferred import graph can still hide responsibilities inside very large files."
    );
  }

  return {
    kind: "current_graph_snapshot",
    notice: [...inferStarterContractNotice],
    authoringChecklist,
    nextCommands: [...inferStarterContractNextCommands]
  };
}

function findArchitecturePressureNotes(
  root: string,
  sourceFileMetrics: SourceFileMetric[]
): InferArchitecturePressureNote[] {
  return sourceFileMetrics
    .filter((metric) => metric.lineCount >= largeModuleFileLineThreshold)
    .sort((left, right) => {
      if (right.lineCount !== left.lineCount) {
        return right.lineCount - left.lineCount;
      }

      return relativePath(root, left.filePath).localeCompare(relativePath(root, right.filePath));
    })
    .slice(0, 8)
    .map((metric) => {
      const filePath = relativePath(root, metric.filePath);
      return {
        kind: "large_source_file",
        filePath,
        lineCount: metric.lineCount,
        threshold: largeModuleFileLineThreshold,
        importsScanned: metric.importCount,
        exportsScanned: metric.exportCount,
        functionLikeCount: metric.functionLikeCount,
        classCount: metric.classCount,
        message:
          `${filePath} has ${metric.lineCount} lines; inferred module boundaries may miss responsibilities concentrated inside this file.`
      };
    });
}

function chooseInferenceFiles(root: string, sourceFiles: string[], groupBy: InferGroupBy): string[] {
  if (groupBy === "workspace") {
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
      name: "SrcRoot",
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
    name: toIdentifier(stripExtension(relativePath)),
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

function buildCandidateEdges(
  root: string,
  imports: ImportRecord[],
  fileOwners: Map<string, string>
): CandidateEdge[] {
  const byPair = new Map<string, CandidateEdge>();

  for (const importRecord of imports) {
    if (!importRecord.resolvedPath) {
      continue;
    }

    const from = fileOwners.get(importRecord.filePath);
    const to = fileOwners.get(importRecord.resolvedPath);
    if (!from || !to || from === to) {
      continue;
    }

    const key = `${from}\0${to}`;
    const edge = byPair.get(key) ?? {
      from,
      to,
      count: 0,
      samples: []
    };

    edge.count += 1;
    if (edge.samples.length < sampleLimit) {
      edge.samples.push({
        filePath: relativePath(root, importRecord.filePath),
        line: importRecord.line,
        specifier: importRecord.specifier,
        resolvedPath: relativePath(root, importRecord.resolvedPath)
      });
    }
    byPair.set(key, edge);
  }

  return [...byPair.values()].sort((left, right) => edgeSortKey(left).localeCompare(edgeSortKey(right)));
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

      const visibility = inferVisibilitySuggestions(root, files);
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

function inferVisibilitySuggestions(root: string, files: string[]): Pick<InferredModule, "suggestedExposes" | "suggestedHides"> {
  const suggestedExposes = new Set<string>();
  const suggestedHides = new Set<string>();

  for (const file of files) {
    const relative = relativePath(root, file);
    const segments = relative.split("/");
    const directorySegments = segments.slice(0, -1);
    const hiddenSegmentIndex = directorySegments.findIndex(isHiddenDirectoryName);

    if (hiddenSegmentIndex >= 0) {
      suggestedHides.add(`${directorySegments.slice(0, hiddenSegmentIndex + 1).join("/")}/**`);
    }

    if (stripExtension(segments.at(-1) ?? "") === "index" && hiddenSegmentIndex < 0) {
      suggestedExposes.add(relative);
    }
  }

  return {
    suggestedExposes: [...suggestedExposes].sort(),
    suggestedHides: [...suggestedHides].sort()
  };
}

function isHiddenDirectoryName(segment: string): boolean {
  const normalized = segment.toLowerCase();
  return normalized === "internal" || normalized === "private";
}

function buildObservedDependencies(
  root: string,
  candidateEdges: CandidateEdge[],
  keyToComponent: Map<string, Component>,
  components: Component[]
): InferredDependency[] {
  const componentById = new Map(components.map((component) => [component.id, component]));
  const byPair = new Map<string, InferredDependency>();

  for (const edge of candidateEdges) {
    const fromComponent = keyToComponent.get(edge.from);
    const toComponent = keyToComponent.get(edge.to);
    if (!fromComponent || !toComponent || fromComponent.id === toComponent.id) {
      continue;
    }

    const key = `${fromComponent.id}\0${toComponent.id}`;
    const dependency = byPair.get(key) ?? {
      fromModule: componentById.get(fromComponent.id)?.name ?? fromComponent.name,
      toModule: componentById.get(toComponent.id)?.name ?? toComponent.name,
      count: 0,
      samples: []
    };

    dependency.count += edge.count;
    for (const sample of edge.samples) {
      if (dependency.samples.length < sampleLimit) {
        dependency.samples.push({
          filePath: normalizePathForMatch(path.relative(root, path.resolve(root, sample.filePath))),
          line: sample.line,
          specifier: sample.specifier,
          resolvedPath: normalizePathForMatch(path.relative(root, path.resolve(root, sample.resolvedPath)))
        });
      }
    }
    byPair.set(key, dependency);
  }

  return [...byPair.values()].sort((left, right) =>
    `${left.fromModule}\0${left.toModule}`.localeCompare(`${right.fromModule}\0${right.toModule}`)
  );
}

function candidateName(candidateGroups: CandidateGroup[], key: string): string {
  return candidateGroups.find((group) => group.key === key)?.name ?? toIdentifier(key);
}

function combinedName(candidateGroups: CandidateGroup[], keys: string[]): string {
  const names = keys.map((key) => candidateName(candidateGroups, key)).sort();
  if (names.length === 1) {
    return names[0] ?? "Module";
  }

  const compact = compactCycleWords(names);
  const combined = toIdentifier(compact.words.join("-"));
  if (compact.removedDuplicatePrefix && combined.length <= 27 && names.length <= 3) {
    return toIdentifier(`${combined}-cycle`);
  }

  if (combined.length <= 32 && names.length <= 3) {
    return combined;
  }

  return conciseCycleName(names);
}

function compactCycleWords(names: string[]): { words: string[]; removedDuplicatePrefix: boolean } {
  const words: string[] = [];
  let removedDuplicatePrefix = false;

  for (const name of names) {
    const nameWords = splitIdentifierWords(name);
    for (const word of nameWords) {
      if (words[words.length - 1]?.toLowerCase() === word.toLowerCase()) {
        removedDuplicatePrefix = true;
        continue;
      }
      words.push(word);
    }
  }

  return {
    words: words.length > 0 ? words : names,
    removedDuplicatePrefix
  };
}

function conciseCycleName(names: string[]): string {
  const dominantToken = findDominantLeadingToken(names);
  if (dominantToken) {
    return toIdentifier(`${dominantToken}-cycle`);
  }

  return "MixedCycle";
}

function findDominantLeadingToken(names: string[]): string | undefined {
  const counts = new Map<string, { token: string; count: number }>();

  for (const name of names) {
    const token = splitIdentifierWords(name)[0];
    if (!token) {
      continue;
    }
    const normalized = token.toLowerCase();
    const entry = counts.get(normalized) ?? { token, count: 0 };
    entry.count += 1;
    counts.set(normalized, entry);
  }

  const requiredCount = Math.max(2, Math.ceil(names.length / 2));
  return [...counts.values()]
    .filter((entry) => entry.count >= requiredCount)
    .sort((left, right) => right.count - left.count || left.token.localeCompare(right.token))[0]?.token;
}

function splitIdentifierWords(name: string): string[] {
  return name.match(/[A-Z]+(?=[A-Z][a-z]|\d|$)|[A-Z]?[a-z]+|\d+/g) ?? [name];
}

function buildCollapsedCycle(
  candidateGroups: CandidateGroup[],
  candidateEdges: CandidateEdge[],
  component: Component
): CollapsedCycle {
  const componentKeys = new Set(component.keys);
  const cyclePathSamples = buildCyclePathSamples(candidateGroups, candidateEdges, component);
  const internalDependencies = candidateEdges
    .filter((edge) => componentKeys.has(edge.from) && componentKeys.has(edge.to) && edge.from !== edge.to)
    .map((edge) => ({
      fromGroup: candidateName(candidateGroups, edge.from),
      toGroup: candidateName(candidateGroups, edge.to),
      count: edge.count,
      samples: edge.samples
    }))
    .sort((left, right) =>
      `${left.fromGroup}\0${left.toGroup}`.localeCompare(`${right.fromGroup}\0${right.toGroup}`)
    );
  const cycleBreakingCandidates = buildCycleBreakingCandidates(internalDependencies);

  return {
    module: component.name,
    sourceGroups: component.keys.map((key) => candidateName(candidateGroups, key)).sort(),
    cyclePathSamples,
    internalDependencies,
    cycleBreakingCandidates
  };
}

function buildCycleBreakingCandidates(
  internalDependencies: CollapsedCycleDependency[]
): CollapsedCycleBreakingCandidate[] {
  return internalDependencies
    .map((dependency) => ({
      fromGroup: dependency.fromGroup,
      toGroup: dependency.toGroup,
      count: dependency.count,
      samples: dependency.samples,
      rationale:
        `${dependency.fromGroup} -> ${dependency.toGroup} participates in the collapsed cycle with ${formatImportSiteCount(
          dependency.count
        )}; inspect whether this edge should become an explicit boundary, interface, event, or accepted merged responsibility.`
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return `${left.fromGroup}\0${left.toGroup}`.localeCompare(`${right.fromGroup}\0${right.toGroup}`);
    })
    .slice(0, cycleBreakingCandidateLimit);
}

function formatImportSiteCount(count: number): string {
  return count === 1 ? "1 import site" : `${count} import sites`;
}

function buildCyclePathSamples(
  candidateGroups: CandidateGroup[],
  candidateEdges: CandidateEdge[],
  component: Component
): CollapsedCyclePathSample[] {
  const componentKeys = new Set(component.keys);
  const outgoing = new Map<string, string[]>();

  for (const key of component.keys) {
    outgoing.set(key, []);
  }

  for (const edge of candidateEdges) {
    if (!componentKeys.has(edge.from) || !componentKeys.has(edge.to) || edge.from === edge.to) {
      continue;
    }
    outgoing.get(edge.from)?.push(edge.to);
  }

  for (const targets of outgoing.values()) {
    targets.sort((left, right) => candidateName(candidateGroups, left).localeCompare(candidateName(candidateGroups, right)));
  }

  const starts = [...component.keys].sort((left, right) =>
    candidateName(candidateGroups, left).localeCompare(candidateName(candidateGroups, right))
  );

  for (const start of starts) {
    const cyclePath = findCyclePath(start, start, outgoing, new Set([start]), [start]);
    if (cyclePath) {
      return [
        {
          groups: cyclePath.map((key) => candidateName(candidateGroups, key))
        }
      ];
    }
  }

  return [];
}

function findCyclePath(
  start: string,
  current: string,
  outgoing: Map<string, string[]>,
  visited: Set<string>,
  cyclePath: string[]
): string[] | undefined {
  for (const target of outgoing.get(current) ?? []) {
    if (target === start && cyclePath.length > 1) {
      return [...cyclePath, start];
    }

    if (visited.has(target)) {
      continue;
    }

    visited.add(target);
    const found = findCyclePath(start, target, outgoing, visited, [...cyclePath, target]);
    if (found) {
      return found;
    }
    visited.delete(target);
  }

  return undefined;
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

function toIdentifier(value: string): string {
  const words = value
    .replace(/\.[^.]+$/, "")
    .split(/[^A-Za-z0-9]+/)
    .filter((word) => word.length > 0);

  const identifier = words.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join("");
  if (!identifier) {
    return "Module";
  }

  return /^[A-Za-z]/.test(identifier) ? identifier : `Module${identifier}`;
}

function stripExtension(value: string): string {
  return value.replace(/\.[^.]+$/, "");
}

function relativePath(root: string, filePath: string): string {
  return normalizePathForMatch(path.relative(root, filePath));
}

function relativePathFrom(root: string, filePath: string): string {
  return normalizePathForMatch(path.relative(root, filePath));
}

function edgeSortKey(edge: CandidateEdge): string {
  return `${edge.from}\0${edge.to}`;
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

function packageNameToIdentifier(packageName: string | undefined, packageRoot: string): string {
  if (packageName) {
    const unscopedName = packageName.startsWith("@") ? packageName.split("/").at(-1) : packageName;
    return toIdentifier(unscopedName ?? packageName);
  }

  return toIdentifier(packageRoot.split("/").at(-1) ?? "Module");
}

function isInsideDirectory(filePath: string, directory: string): boolean {
  const relative = path.relative(directory, filePath);
  return relative === "" || Boolean(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}
