import type {
  CollapsedCycle,
  CollapsedCycleBreakingCandidate,
  CollapsedCycleDependency,
  CollapsedCyclePathSample,
  InferredImportSample
} from "./infer.js";

interface CycleEvidenceGroup {
  key: string;
  name: string;
}

interface CycleEvidenceEdge {
  from: string;
  to: string;
  count: number;
  samples: InferredImportSample[];
}

interface CycleEvidenceComponent {
  keys: string[];
  name: string;
}

export interface BuildCollapsedCycleEvidenceInput {
  candidateGroups: CycleEvidenceGroup[];
  candidateEdges: CycleEvidenceEdge[];
  component: CycleEvidenceComponent;
}

const cycleBreakingCandidateLimit = 5;

/**
 * Collapsed-cycle evidence for inferred contracts. This module ranks and
 * explains review candidates; it does not decide architecture intent or emit
 * validation failures.
 */
export function buildCollapsedCycleEvidence(input: BuildCollapsedCycleEvidenceInput): CollapsedCycle {
  const componentKeys = new Set(input.component.keys);
  const cyclePathSamples = buildCyclePathSamples(input);
  const internalDependencies = input.candidateEdges
    .filter((edge) => componentKeys.has(edge.from) && componentKeys.has(edge.to) && edge.from !== edge.to)
    .map((edge) => ({
      fromGroup: candidateName(input.candidateGroups, edge.from),
      toGroup: candidateName(input.candidateGroups, edge.to),
      count: edge.count,
      samples: edge.samples
    }))
    .sort((left, right) =>
      `${left.fromGroup}\0${left.toGroup}`.localeCompare(`${right.fromGroup}\0${right.toGroup}`)
    );

  return {
    module: input.component.name,
    sourceGroups: input.component.keys.map((key) => candidateName(input.candidateGroups, key)).sort(),
    cyclePathSamples,
    internalDependencies,
    cycleBreakingCandidates: buildCycleBreakingCandidates(internalDependencies)
  };
}

export function buildCycleBreakingCandidates(
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

function buildCyclePathSamples(input: BuildCollapsedCycleEvidenceInput): CollapsedCyclePathSample[] {
  const componentKeys = new Set(input.component.keys);
  const outgoing = new Map<string, string[]>();

  for (const key of input.component.keys) {
    outgoing.set(key, []);
  }

  for (const edge of input.candidateEdges) {
    if (!componentKeys.has(edge.from) || !componentKeys.has(edge.to) || edge.from === edge.to) {
      continue;
    }
    outgoing.get(edge.from)?.push(edge.to);
  }

  for (const targets of outgoing.values()) {
    targets.sort((left, right) =>
      candidateName(input.candidateGroups, left).localeCompare(candidateName(input.candidateGroups, right))
    );
  }

  const starts = [...input.component.keys].sort((left, right) =>
    candidateName(input.candidateGroups, left).localeCompare(candidateName(input.candidateGroups, right))
  );

  for (const start of starts) {
    const cyclePath = findCyclePath(start, start, outgoing, new Set([start]), [start]);
    if (cyclePath) {
      return [
        {
          groups: cyclePath.map((key) => candidateName(input.candidateGroups, key))
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

function formatImportSiteCount(count: number): string {
  return count === 1 ? "1 import site" : `${count} import sites`;
}

function candidateName(candidateGroups: CycleEvidenceGroup[], key: string): string {
  return candidateGroups.find((group) => group.key === key)?.name ?? toIdentifier(key);
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
