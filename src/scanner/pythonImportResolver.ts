import fs from "node:fs";
import path from "node:path";

const pythonIgnoredImportRootDirectories = new Set([
  ".git",
  ".mypy_cache",
  ".pytest_cache",
  ".ruff_cache",
  ".venv",
  "__pycache__",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "venv"
]);

export function resolvePythonImport(
  root: string,
  pythonImportRoots: string[],
  fromFile: string,
  specifier: string
): string | undefined {
  if (!specifier || path.isAbsolute(specifier)) {
    return undefined;
  }

  const leadingDots = specifier.match(/^\.+/)?.[0].length ?? 0;
  const moduleSpecifier = specifier.slice(leadingDots);
  const moduleSegments = moduleSpecifier.length > 0 ? moduleSpecifier.split(".").filter(Boolean) : [];
  if (leadingDots > 0) {
    const baseDirectory = pythonRelativeBaseDirectory(fromFile, leadingDots);
    const candidateBase = path.resolve(baseDirectory, ...moduleSegments);

    if (!isInsideDirectory(candidateBase, root)) {
      return undefined;
    }

    return resolvePythonModuleCandidate(candidateBase, root);
  }

  return resolvePythonAbsoluteImport(root, pythonImportRoots, fromFile, moduleSegments);
}

export function findPythonImportRoots(root: string): string[] {
  const roots = new Set<string>([root]);
  const srcRoot = path.join(root, "src");

  if (fs.existsSync(srcRoot) && fs.statSync(srcRoot).isDirectory()) {
    roots.add(srcRoot);

    for (const entry of fs.readdirSync(srcRoot, { withFileTypes: true })) {
      if (entry.isDirectory() && !pythonIgnoredImportRootDirectories.has(entry.name)) {
        roots.add(path.join(srcRoot, entry.name));
      }
    }
  }

  return [...roots].sort((left, right) => left.length - right.length || left.localeCompare(right));
}

function resolvePythonAbsoluteImport(
  root: string,
  pythonImportRoots: string[],
  fromFile: string,
  moduleSegments: string[]
): string | undefined {
  const fromDirectory = path.dirname(path.resolve(fromFile));
  const nearestRoots = pythonImportRoots
    .filter((importRoot) => isInsideDirectory(fromDirectory, importRoot))
    .sort((left, right) => right.length - left.length || left.localeCompare(right));

  const searchedRoots = new Set<string>();
  for (const importRoot of nearestRoots) {
    searchedRoots.add(importRoot);
    const resolved = resolvePythonImportFromRoot(root, importRoot, moduleSegments);
    if (resolved) {
      return resolved;
    }
  }

  const fallbackMatches: string[] = [];
  for (const importRoot of pythonImportRoots) {
    if (searchedRoots.has(importRoot)) {
      continue;
    }

    const resolved = resolvePythonImportFromRoot(root, importRoot, moduleSegments);
    if (resolved && !fallbackMatches.includes(resolved)) {
      fallbackMatches.push(resolved);
    }
  }

  return fallbackMatches.length === 1 ? fallbackMatches[0] : undefined;
}

function resolvePythonImportFromRoot(root: string, importRoot: string, moduleSegments: string[]): string | undefined {
  const candidateBase = path.resolve(importRoot, ...moduleSegments);
  if (!isInsideDirectory(candidateBase, root)) {
    return undefined;
  }

  return resolvePythonModuleCandidate(candidateBase, root);
}

function pythonRelativeBaseDirectory(fromFile: string, leadingDots: number): string {
  let directory = path.dirname(fromFile);

  for (let index = 1; index < leadingDots; index += 1) {
    directory = path.dirname(directory);
  }

  return directory;
}

function resolvePythonModuleCandidate(basePath: string, root: string): string | undefined {
  const candidates = [
    `${basePath}.py`,
    path.join(basePath, "__init__.py")
  ];

  for (const candidate of candidates) {
    if (isInsideDirectory(candidate, root) && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return undefined;
}

function isInsideDirectory(filePath: string, directory: string): boolean {
  const relative = path.relative(directory, filePath);
  return relative === "" || Boolean(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}
