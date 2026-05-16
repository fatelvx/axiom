import path from "node:path";
import type { ImportRecord } from "../axi/types.js";
import { normalizePathForMatch } from "../validator/glob.js";
import type { InferredDependency, InferredImportSample } from "./infer.js";

export interface CandidateEdge {
  from: string;
  to: string;
  count: number;
  samples: InferredImportSample[];
}

interface DependencyEvidenceComponent {
  id: number;
  name: string;
}

const sampleLimit = 5;

/**
 * Dependency evidence for inferred contracts. This module shapes sample import
 * sites for `depends on` suggestions; it does not decide architecture intent.
 */
export function buildCandidateEdges(
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

export function buildObservedDependencies(
  root: string,
  candidateEdges: CandidateEdge[],
  keyToComponent: Map<string, DependencyEvidenceComponent>,
  components: DependencyEvidenceComponent[]
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

function relativePath(root: string, filePath: string): string {
  return normalizePathForMatch(path.relative(root, filePath));
}

function edgeSortKey(edge: CandidateEdge): string {
  return `${edge.from}\0${edge.to}`;
}
