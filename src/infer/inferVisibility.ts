import { stripExtension } from "./inferNaming.js";

export interface InferVisibilitySuggestions {
  suggestedExposes: string[];
  suggestedHides: string[];
}

/**
 * Visibility suggestions for inferred starter contracts. Suggestions stay
 * commented until a human turns them into real `.axi` visibility rules.
 */
export function buildInferVisibilitySuggestions(relativeFilePaths: string[]): InferVisibilitySuggestions {
  const suggestedExposes = new Set<string>();
  const suggestedHides = new Set<string>();

  for (const filePath of relativeFilePaths) {
    const relativePath = filePath.replace(/\\/g, "/");
    const segments = relativePath.split("/");
    const directorySegments = segments.slice(0, -1);
    const hiddenSegmentIndex = directorySegments.findIndex(isHiddenDirectoryName);

    if (hiddenSegmentIndex >= 0) {
      suggestedHides.add(`${directorySegments.slice(0, hiddenSegmentIndex + 1).join("/")}/**`);
    }

    if (stripExtension(segments.at(-1) ?? "") === "index" && hiddenSegmentIndex < 0) {
      suggestedExposes.add(relativePath);
    }
  }

  return {
    suggestedExposes: [...suggestedExposes].sort(),
    suggestedHides: [...suggestedHides].sort()
  };
}

export function isHiddenDirectoryName(segment: string): boolean {
  const normalized = segment.toLowerCase();
  return normalized === "internal" || normalized === "private";
}
