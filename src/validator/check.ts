import fs from "node:fs";
import path from "node:path";
import type { AxiomSpec, ImportRecord, ObservedDependency, Violation } from "../axi/types.js";
import { parseAxiomText } from "../axi/parser.js";
import { findAxiomFiles, findSourceFiles } from "../fs/discover.js";
import { scanImports } from "../scanner/importScanner.js";
import { createOwnershipIndex, validateOwnership } from "./ownership.js";
import { buildObservedDependencies, validateObservedDependencies, validateSpec } from "./validate.js";

export interface CheckOptions {
  root: string;
}

export interface CheckResult {
  root: string;
  specFiles: string[];
  sourceFiles: string[];
  importCount: number;
  observedDependencies: ObservedDependency[];
  spec: AxiomSpec;
  violations: Violation[];
}

export function runCheck(options: CheckOptions): CheckResult {
  const root = path.resolve(options.root);
  const specFiles = findAxiomFiles(root);
  const sourceFiles = findSourceFiles(root);
  const violations: Violation[] = [];
  const spec: AxiomSpec = { modules: [], layerOrders: [] };

  if (specFiles.length === 0) {
    violations.push({
      code: "no_spec_files",
      message: `No .axi files found under ${root}.`
    });
  }

  for (const specFile of specFiles) {
    const text = fs.readFileSync(specFile, "utf8");
    const parsed = parseAxiomText(specFile, text);
    spec.modules.push(...parsed.modules);
    spec.layerOrders.push(...parsed.layerOrders);
    violations.push(...parsed.violations);
  }

  violations.push(...validateSpec(spec));

  const imports: ImportRecord[] = sourceFiles.flatMap((sourceFile) => scanImports(sourceFile));
  const ownership = createOwnershipIndex(root, spec.modules);
  violations.push(...validateOwnership(sourceFiles, ownership));
  const observedDependencies = buildObservedDependencies(imports, ownership);

  violations.push(...validateObservedDependencies(spec, observedDependencies));

  return {
    root,
    specFiles,
    sourceFiles,
    importCount: imports.length,
    observedDependencies,
    spec,
    violations
  };
}
