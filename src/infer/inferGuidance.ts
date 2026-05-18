import type {
  CollapsedCycle,
  InferArchitecturePressureNote,
  InferredDependency,
  InferredModule
} from "./infer.js";

export interface InferStarterContract {
  kind: "current_graph_snapshot";
  notice: string[];
  reviewPass: string[];
  authoringChecklist: string[];
  nextCommands: string[];
}

export interface InferReviewPressure {
  kind: "collapsed_cycle" | "large_source_file" | "dependency_evidence" | "quiet_snapshot";
  title: string;
  description: string;
  severity: "info" | "warning";
  modules?: string[];
  files?: string[];
}

export interface InferReviewStory {
  summary: string;
  setup: string;
  pressures: InferReviewPressure[];
  nextStep: string;
  caveat: string;
}

export interface InferReviewStoryInput {
  sourceFileCount: number;
  importCount: number;
  candidateModules: number;
  modules: Pick<InferredModule, "name">[];
  observedDependencies: Array<Pick<InferredDependency, "fromModule" | "toModule">>;
  collapsedCycles: Array<Pick<CollapsedCycle, "module">>;
  architecturePressureNotes: Array<Pick<InferArchitecturePressureNote, "filePath">>;
}

export const inferStarterContractNotice = [
  "This starter contract mirrors the current dependency graph; it is not a recommended architecture.",
  "Review module names, collapsed cycles, visibility suggestions, and dependencies before treating it as intent.",
  "Use `axi check` only after the contract describes the architecture you want to protect."
];

export const inferStarterContractReviewPass = [
  "Keep module names, paths, and `depends on` edges only when you can explain them as desired architecture.",
  "Change broad folder-shaped modules, collapsed cycles, and commented visibility suggestions into the boundary you want reviewers to protect.",
  "Remove accidental dependency edges from the draft unless the team intends to keep that relationship; use visible intentional debt only for reviewed migrations.",
  "Observe the reviewed draft first, then use `axi check` as a gate only after the contract is small, explainable, and low-noise."
];

export const inferStarterContractAuthoringChecklist = [
  "Rename modules so they match the team's architecture vocabulary, not only folder names.",
  "Review each `depends on` edge and its evidence comments as intended architecture; remove or refactor accidental edges before using this as a gate.",
  "Turn commented `exposes` and `hides` suggestions into real rules only after confirming the public/internal boundary.",
  "Add `layers` and `layer` statements only when dependency direction is clear enough to enforce.",
  "Use `accepts ... [at \"path\"] until ... because ...` only for reviewed migration debt; do not blanket-accept first-run problems.",
  "Save an unfiltered portable graph JSON baseline when the draft is useful so future runs can show drift over time without local root-path churn."
];

export const inferStarterContractNextCommands = [
  "axi observe --root . --spec <draft.axi> --markdown",
  "axi graph --root . --spec <draft.axi> --mermaid",
  "axi graph --root . --spec <draft.axi> --json --portable > axiom-baseline.json",
  "axi diff --root . --spec <draft.axi> axiom-baseline.json"
];

/**
 * Authoring guidance for inferred contracts. This module does not infer graph
 * structure; it preserves the product boundary that inference is onboarding
 * evidence, not declared architecture intent.
 */
export function buildStarterContract(
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
    reviewPass: [...inferStarterContractReviewPass],
    authoringChecklist,
    nextCommands: [...inferStarterContractNextCommands]
  };
}

export function buildInferReviewStory(input: InferReviewStoryInput): InferReviewStory {
  const pressures: InferReviewPressure[] = [];

  if (input.collapsedCycles.length > 0) {
    const cycleModules = input.collapsedCycles.map((cycle) => cycle.module);
    const firstCycle = input.collapsedCycles[0];
    const mergedVerb = input.collapsedCycles.length === 1 ? "was" : "were";
    pressures.push({
      kind: "collapsed_cycle",
      title: input.collapsedCycles.length === 1
        ? `Collapsed cycle: ${firstCycle?.module ?? "merged module"}`
        : `${input.collapsedCycles.length} collapsed cycles`,
      description:
        `${formatCount(input.collapsedCycles.length, "cycle")} ${mergedVerb} merged so the starter contract mirrors current code without immediately failing on declared dependency cycles. Review cycle-breaking candidates before treating the merged module as intended architecture.`,
      severity: "warning",
      modules: cycleModules
    });
  }

  if (input.architecturePressureNotes.length > 0) {
    const files = input.architecturePressureNotes.map((note) => note.filePath);
    pressures.push({
      kind: "large_source_file",
      title: "Large-file pressure in inferred scope",
      description:
        `${formatCount(input.architecturePressureNotes.length, "large source file")} may hide responsibilities that folder and import inference cannot split. Inspect these files before judging the starter module map as complete.`,
      severity: "warning",
      files
    });
  }

  if (input.observedDependencies.length > 0) {
    pressures.push({
      kind: "dependency_evidence",
      title: "Review inferred dependencies",
      description:
        `${formatCount(input.observedDependencies.length, "observed module edge")} became \`depends on\` lines with sample import evidence. Confirm each edge is intended before using this draft as a gate.`,
      severity: "info",
      modules: dependencyModules(input.observedDependencies)
    });
  }

  if (pressures.length === 0) {
    pressures.push({
      kind: "quiet_snapshot",
      title: "Quiet starter snapshot",
      description:
        "No cross-module import edges, collapsed cycles, or large-file pressure notes were found in this inference scope. Confirm the scan scope is the architecture you meant to model before saving a baseline.",
      severity: "info"
    });
  }

  return {
    summary:
      `Starter contract inferred ${formatCount(input.modules.length, "module")} and ${formatCount(
        input.observedDependencies.length,
        "observed module edge"
      )} from ${formatCount(input.sourceFileCount, "source file")}.`,
    setup:
      `Scanned ${formatCount(input.sourceFileCount, "source file")} and ${formatCount(
        input.importCount,
        "import"
      )}; ${formatCount(input.candidateModules, "candidate group")} became ${formatCount(
        input.modules.length,
        "starter module"
      )}. This is a current-graph snapshot, not declared architecture intent yet.`,
    pressures,
    nextStep: buildInferReviewNextStep(input.collapsedCycles.length, input.architecturePressureNotes.length),
    caveat:
      "Inference reads static imports and folder/package shape. It can lower authoring cost, but humans still decide module names, visibility, layers, accepted debt, and which edges are real architecture intent."
  };
}

function buildInferReviewNextStep(collapsedCycleCount: number, pressureNoteCount: number): string {
  if (collapsedCycleCount > 0 && pressureNoteCount > 0) {
    return "Review collapsed-cycle candidates and large-file pressure notes, then run `axi observe --root . --spec <draft.axi> --markdown` before saving a graph baseline.";
  }

  if (collapsedCycleCount > 0) {
    return "Review collapsed-cycle candidates, rename or split merged modules if needed, then run `axi observe --root . --spec <draft.axi> --markdown`.";
  }

  if (pressureNoteCount > 0) {
    return "Inspect large-file pressure notes, adjust module boundaries if needed, then run `axi observe --root . --spec <draft.axi> --markdown`.";
  }

  return "Rename modules, confirm inferred dependency evidence, then run `axi observe --root . --spec <draft.axi> --markdown` before saving a graph baseline.";
}

function dependencyModules(dependencies: Array<Pick<InferredDependency, "fromModule" | "toModule">>): string[] {
  const modules = new Set<string>();

  for (const dependency of dependencies) {
    modules.add(dependency.fromModule);
    modules.add(dependency.toModule);
  }

  return [...modules].sort();
}

function formatCount(count: number, noun: string): string {
  return count === 1 ? `1 ${noun}` : `${count} ${noun}s`;
}
