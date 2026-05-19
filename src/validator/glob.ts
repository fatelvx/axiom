export function globToRegExp(pattern: string): RegExp {
  const normalized = normalizePattern(pattern);
  let output = "";

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index] ?? "";
    const next = normalized[index + 1];

    if (char === "{") {
      const braceEnd = findBraceEnd(normalized, index + 1);
      if (braceEnd !== -1) {
        const alternatives = parseBraceAlternatives(normalized.slice(index + 1, braceEnd));

        if (alternatives.length > 1) {
          output += `(?:${alternatives.map(escapeRegExp).join("|")})`;
          index = braceEnd;
          continue;
        }
      }
    }

    if (char === "*" && next === "*" && normalized[index + 2] === "/") {
      output += "(?:.*/)?";
      index += 2;
      continue;
    }

    if (char === "*" && next === "*") {
      output += ".*";
      index += 1;
      continue;
    }

    if (char === "*") {
      output += "[^/]*";
      continue;
    }

    output += escapeRegExp(char);
  }

  return new RegExp(`^${output}$`);
}

export function normalizePathForMatch(value: string): string {
  return value.replace(/\\/g, "/").replace(/^\.\//, "");
}

function normalizePattern(value: string): string {
  return normalizePathForMatch(value.trim());
}

function findBraceEnd(pattern: string, startIndex: number): number {
  for (let index = startIndex; index < pattern.length; index += 1) {
    if (pattern[index] === "}") {
      return index;
    }

    if (pattern[index] === "{") {
      return -1;
    }
  }

  return -1;
}

function parseBraceAlternatives(value: string): string[] {
  const alternatives = value.split(",");
  if (alternatives.length < 2 || alternatives.some((alternative) => alternative.length === 0)) {
    return [];
  }

  return alternatives;
}

function escapeRegExp(value: string): string {
  return value.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
}
