import fs from "node:fs";
import path from "node:path";
import { defaultSpecPatterns } from "../config/config.js";
import { globToRegExp, normalizePathForMatch } from "../validator/glob.js";

export interface DiscoveryOptions {
  include?: string[];
  exclude?: string[];
  specs?: string[];
}

const ignoredDirectories = new Set([
  ".benchmark_tmp",
  ".cache",
  ".git",
  ".lumina",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".turbo",
  ".vite",
  "build",
  "coverage",
  "dist",
  "generated-projects",
  "node_modules",
  "out",
  "src-tauri",
  "target",
  "temp",
  "tmp"
]);
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mts", ".cts"]);

export function findAxiomFiles(root: string, options: DiscoveryOptions = {}): string[] {
  const specPatterns = compilePatterns(options.specs ?? defaultSpecPatterns);
  return walkFiles(root, {}).filter((filePath) => filePath.endsWith(".axi") && matchesAny(root, filePath, specPatterns));
}

export function findSourceFiles(root: string, options: DiscoveryOptions = {}): string[] {
  const includePatterns = compilePatterns(options.include ?? []);
  const excludePatterns = compilePatterns(options.exclude ?? []);

  return walkFiles(root, options).filter((filePath) => {
    if (filePath.endsWith(".d.ts")) {
      return false;
    }

    if (!sourceExtensions.has(path.extname(filePath))) {
      return false;
    }

    if (matchesAny(root, filePath, excludePatterns)) {
      return false;
    }

    return includePatterns.length === 0 || matchesAny(root, filePath, includePatterns);
  });
}

function walkFiles(root: string, options: DiscoveryOptions): string[] {
  const files: string[] = [];
  const excludePatterns = compilePatterns(options.exclude ?? []);

  if (!fs.existsSync(root)) {
    return files;
  }

  visit(path.resolve(root));
  return files.sort();

  function visit(currentPath: string): void {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });

    for (const entry of entries) {
      const entryPath = path.join(currentPath, entry.name);

      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name) && !matchesDirectory(root, entryPath, excludePatterns)) {
          visit(entryPath);
        }
        continue;
      }

      if (entry.isFile()) {
        files.push(entryPath);
      }
    }
  }
}

function compilePatterns(patterns: string[]): RegExp[] {
  return patterns.map((pattern) => globToRegExp(pattern));
}

function matchesAny(root: string, filePath: string, patterns: RegExp[]): boolean {
  if (patterns.length === 0) {
    return false;
  }

  const relative = normalizePathForMatch(path.relative(root, filePath));
  return patterns.some((pattern) => pattern.test(relative));
}

function matchesDirectory(root: string, directoryPath: string, patterns: RegExp[]): boolean {
  if (patterns.length === 0) {
    return false;
  }

  const relative = normalizePathForMatch(path.relative(root, directoryPath));
  const directoryRelative = relative.endsWith("/") ? relative : `${relative}/`;
  return patterns.some((pattern) => pattern.test(relative) || pattern.test(directoryRelative));
}
