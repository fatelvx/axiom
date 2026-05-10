import fs from "node:fs";
import type { ImportRecord } from "../axi/types.js";
import { resolveRelativeImport, type ImportResolver } from "./importResolver.js";

export interface ScanImportsOptions {
  resolver?: ImportResolver;
}

const importPatterns = [
  /\bimport\s+(?:type\s+)?(?:[^'"]*?\s+from\s*)?["']([^"']+)["']/,
  /\bexport\s+(?:type\s+)?(?:[^'"]*?\s+from\s*)["']([^"']+)["']/,
  /\bimport\s*\(\s*["']([^"']+)["']\s*\)/,
  /\brequire\s*\(\s*["']([^"']+)["']\s*\)/
];

export function scanImports(filePath: string, options: ScanImportsOptions = {}): ImportRecord[] {
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/);
  const imports: ImportRecord[] = [];
  const resolver = options.resolver ?? { resolve: resolveRelativeImport };

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
        resolvedPath: resolver.resolve(filePath, specifier)
      });
      break;
    }
  }

  return imports;
}
