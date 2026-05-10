import path from "node:path";
import type { ImportRecord } from "../axi/types.js";
import { loadConfig } from "../config/config.js";
import { findSourceFiles } from "../fs/discover.js";
import { scanImports } from "../scanner/importScanner.js";
import { normalizePathForMatch } from "../validator/glob.js";

export interface InferOptions {
  root: string;
  configPath?: string;
}

export interface InferredModule {
  name: string;
  paths: string[];
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
}

export interface InferResult {
  root: string;
  sourceFiles: string[];
  importCount: number;
  candidateModules: number;
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

export function runInfer(options: InferOptions): InferResult {
  const root = path.resolve(options.root);
  const config = loadConfig(root, options.configPath);
  const allSourceFiles = findSourceFiles(root, config);
  const sourceFiles = chooseInferenceFiles(root, allSourceFiles);
  const candidateGroups = buildCandidateGroups(root, sourceFiles);
  const fileOwners = buildFileOwners(candidateGroups);
  const imports = sourceFiles.flatMap((sourceFile) => scanImports(sourceFile));
  const candidateEdges = buildCandidateEdges(root, imports, fileOwners);
  const components = collapseCycles(candidateGroups, candidateEdges);
  const keyToComponent = mapKeysToComponents(components);
  const modules = buildInferredModules(candidateGroups, candidateEdges, components, keyToComponent);
  const observedDependencies = buildObservedDependencies(root, candidateEdges, keyToComponent, components);

  return {
    root,
    sourceFiles,
    importCount: imports.length,
    candidateModules: candidateGroups.length,
    collapsedCycles: components
      .filter((component) => component.keys.length > 1)
      .map((component) => ({
        module: component.name,
        sourceGroups: component.keys.map((key) => candidateName(candidateGroups, key)).sort()
      })),
    modules,
    observedDependencies
  };
}

function chooseInferenceFiles(root: string, sourceFiles: string[]): string[] {
  const srcFiles = sourceFiles.filter((sourceFile) => relativePath(root, sourceFile).startsWith("src/"));
  return srcFiles.length > 0 ? srcFiles : sourceFiles;
}

function buildCandidateGroups(root: string, sourceFiles: string[]): CandidateGroup[] {
  const groups = new Map<string, CandidateGroup>();

  for (const sourceFile of sourceFiles) {
    const relative = relativePath(root, sourceFile);
    const classification = classifySourceFile(relative);
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

function classifySourceFile(relativePath: string): { key: string; name: string; pathPattern: string } {
  const segments = relativePath.split("/");

  if (segments[0] === "src") {
    const second = segments[1];
    if (segments.length >= 3 && second) {
      return {
        key: `src/${second}`,
        name: toIdentifier(second),
        pathPattern: `src/${second}/**`
      };
    }

    return {
      key: "src/*",
      name: "SrcRoot",
      pathPattern: "src/*"
    };
  }

  const first = segments[0];
  if (segments.length >= 2 && first) {
    return {
      key: first,
      name: toIdentifier(first),
      pathPattern: `${first}/**`
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
      for (const key of component.keys) {
        const group = groupsByKey.get(key);
        for (const pattern of group?.paths ?? []) {
          paths.add(pattern);
        }
      }

      return {
        name: component.name,
        paths: [...paths].sort(),
        depends: [...depends].sort(),
        sourceGroups: component.keys.map((key) => candidateName(candidateGroups, key)).sort()
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));
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
  return names.length === 1 ? names[0] ?? "Module" : names.join("");
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

function edgeSortKey(edge: CandidateEdge): string {
  return `${edge.from}\0${edge.to}`;
}

function readIndex(map: Map<string, number>, key: string): number {
  return map.get(key) ?? Number.POSITIVE_INFINITY;
}
