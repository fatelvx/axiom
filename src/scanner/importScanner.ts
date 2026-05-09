import fs from "node:fs";
import path from "node:path";
import type { ImportRecord } from "../axi/types.js";

const importPatterns = [
  /\bimport\s+(?:type\s+)?(?:[^'"]*?\s+from\s*)?["']([^"']+)["']/,
  /\bexport\s+(?:type\s+)?(?:[^'"]*?\s+from\s*)["']([^"']+)["']/,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/,
  /\brequire\s*\(\s*["']([^"']+)["']\s*\)/
];

const extensionCandidates = [".ts", ".tsx", ".js", ".jsx", ".mts", ".cts"];

export function scanImports(filePath: string): ImportRecord[] {
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/);
  const imports: ImportRecord[] = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";

    for (const pattern of importPatterns) {
      const match = line.match(pattern);
      if (!match) {
        continue;
      }

      const specifier = match[1] ?? "";
      imports.push({
        filePath,
        line: index + 1,
        specifier,
        resolvedPath: resolveImport(filePath, specifier)
      });
      break;
    }
  }

  return imports;
}

function resolveImport(fromFile: string, specifier: string): string | undefined {
  if (!specifier.startsWith(".")) {
    return undefined;
  }

  const basePath = path.resolve(path.dirname(fromFile), specifier);
  const candidates = buildCandidates(basePath);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return undefined;
}

function buildCandidates(basePath: string): string[] {
  const candidates: string[] = [basePath];

  for (const extension of extensionCandidates) {
    candidates.push(`${basePath}${extension}`);
  }

  for (const extension of extensionCandidates) {
    candidates.push(path.join(basePath, `index${extension}`));
  }

  return candidates;
}
