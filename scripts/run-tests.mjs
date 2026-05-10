import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const testFiles = findTestFiles(path.resolve("dist"));

if (testFiles.length === 0) {
  console.error("No compiled test files found under dist.");
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--test", ...testFiles], {
  stdio: "inherit"
});

process.exit(result.status ?? 1);

function findTestFiles(directory) {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return findTestFiles(entryPath);
      }
      return entry.isFile() && entry.name.endsWith(".test.js") ? [entryPath] : [];
    })
    .sort();
}
