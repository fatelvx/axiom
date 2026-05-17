import fs from "node:fs";
import path from "node:path";
import { defaultSpecPatterns } from "../config/config.js";
import { globToRegExp, normalizePathForMatch } from "../validator/glob.js";

export interface DiscoveryOptions {
  include?: string[];
  exclude?: string[];
  specs?: string[];
}

interface CompiledPattern {
  regexp: RegExp;
  fixedPrefix: string;
}

const ignoredDirectories = new Set([
  ".cache",
  ".benchmark_tmp",
  ".git",
  ".mypy_cache",
  ".next",
  ".nuxt",
  ".pytest_cache",
  ".ruff_cache",
  ".svelte-kit",
  ".turbo",
  ".vite",
  ".venv",
  "__pycache__",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out",
  "target",
  "temp",
  "tmp",
  "venv"
]);
const sourceExtensions = new Set([".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".vue", ".py"]);

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
  const includePatterns = compilePatterns(options.include ?? []);

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
        if (
          !ignoredDirectories.has(entry.name) &&
          !matchesDirectory(root, entryPath, excludePatterns) &&
          canDirectoryContainIncludedPath(root, entryPath, includePatterns)
        ) {
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

function compilePatterns(patterns: string[]): CompiledPattern[] {
  return patterns.map((pattern) => ({
    regexp: globToRegExp(pattern),
    fixedPrefix: fixedPrefixFromGlob(pattern)
  }));
}

function matchesAny(root: string, filePath: string, patterns: CompiledPattern[]): boolean {
  if (patterns.length === 0) {
    return false;
  }

  const relative = normalizePathForMatch(path.relative(root, filePath));
  return patterns.some((pattern) => pattern.regexp.test(relative));
}

function matchesDirectory(root: string, directoryPath: string, patterns: CompiledPattern[]): boolean {
  if (patterns.length === 0) {
    return false;
  }

  const relative = normalizePathForMatch(path.relative(root, directoryPath));
  const directoryRelative = relative.endsWith("/") ? relative : `${relative}/`;
  return patterns.some((pattern) => pattern.regexp.test(relative) || pattern.regexp.test(directoryRelative));
}

function canDirectoryContainIncludedPath(root: string, directoryPath: string, includePatterns: CompiledPattern[]): boolean {
  if (includePatterns.length === 0) {
    return true;
  }

  const relative = normalizePathForMatch(path.relative(root, directoryPath));
  const directoryPrefix = relative.length === 0 ? "" : `${relative}/`;

  return includePatterns.some((pattern) => {
    if (pattern.fixedPrefix.length === 0) {
      return true;
    }

    return pattern.fixedPrefix.startsWith(directoryPrefix) || directoryPrefix.startsWith(pattern.fixedPrefix);
  });
}

function fixedPrefixFromGlob(pattern: string): string {
  const normalized = normalizePathForMatch(pattern.trim());
  const wildcardIndex = normalized.search(/[*]/);
  return wildcardIndex === -1 ? normalized : normalized.slice(0, wildcardIndex);
}
