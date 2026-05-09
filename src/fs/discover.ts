import fs from "node:fs";
import path from "node:path";

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

export function findAxiomFiles(root: string): string[] {
  return walkFiles(root).filter((filePath) => filePath.endsWith(".axi"));
}

export function findSourceFiles(root: string): string[] {
  return walkFiles(root).filter((filePath) => {
    if (filePath.endsWith(".d.ts")) {
      return false;
    }

    return sourceExtensions.has(path.extname(filePath));
  });
}

function walkFiles(root: string): string[] {
  const files: string[] = [];

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
        if (!ignoredDirectories.has(entry.name)) {
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
