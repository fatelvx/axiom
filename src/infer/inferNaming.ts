export interface NamedCandidateGroup {
  key: string;
  name: string;
}

/**
 * Naming evidence for inferred starter contracts. This module keeps inferred
 * labels readable; it does not decide architecture intent.
 */
export function candidateName(candidateGroups: NamedCandidateGroup[], key: string): string {
  return candidateGroups.find((group) => group.key === key)?.name ?? toIdentifier(key);
}

export function combinedName(candidateGroups: NamedCandidateGroup[], keys: string[]): string {
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

export function packageNameToIdentifier(packageName: string | undefined, packageRoot: string): string {
  if (packageName) {
    const unscopedName = packageName.startsWith("@") ? packageName.split("/").at(-1) : packageName;
    return toIdentifier(unscopedName ?? packageName);
  }

  return toIdentifier(packageRoot.split("/").at(-1) ?? "Module");
}

export function preferCandidateGroupName(existingName: string, candidateName: string): string {
  if ((existingName === "SrcRoot" || existingName === "Root") && candidateName !== existingName) {
    return candidateName;
  }

  return existingName;
}

export function sourceRootEntryModuleName(fileName: string | undefined): string | undefined {
  if (!fileName || !/\.[cm]?[jt]sx?$/.test(fileName)) {
    return undefined;
  }

  const stem = stripExtension(fileName).toLowerCase();
  if (stem === "bootstrap") {
    return "Bootstrap";
  }

  if (
    stem === "main" ||
    stem === "index" ||
    stem === "app" ||
    stem === "entry" ||
    stem === "startup" ||
    stem === "start"
  ) {
    return "AppEntry";
  }

  return undefined;
}

export function stripExtension(value: string): string {
  return value.replace(/\.[^.]+$/, "");
}

export function toIdentifier(value: string): string {
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
