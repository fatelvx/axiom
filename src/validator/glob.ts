export function globToRegExp(pattern: string): RegExp {
  const normalized = normalizePattern(pattern);
  let output = "";

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index] ?? "";
    const next = normalized[index + 1];

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

function escapeRegExp(value: string): string {
  return /[\\^$+?.()|{}[\]]/.test(value) ? `\\${value}` : value;
}
