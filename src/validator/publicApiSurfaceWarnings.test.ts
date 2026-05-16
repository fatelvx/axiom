import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import type { AxiomModule, AxiomSpec, ImportRecord, SourceLocation } from "../axi/types.js";
import { createOwnershipIndex } from "./ownership.js";
import { findPublicApiSurfaceWarnings } from "./publicApiSurfaceWarnings.js";

test("public API surface warnings report broad exposed barrels without creating gate semantics", () => {
  const root = path.join("repo");
  const spec = servicesSpec(root);
  const ownership = createOwnershipIndex(root, spec.modules);
  const imports: ImportRecord[] = [
    {
      filePath: path.join(root, "src/services/index.ts"),
      line: 1,
      kind: "export",
      specifier: "./feature",
      resolvedPath: path.join(root, "src/services/feature.ts"),
      exportKind: "star"
    }
  ];

  assert.deepEqual(findPublicApiSurfaceWarnings(spec, imports, ownership, root), [
    {
      code: "broad_public_surface",
      message: "Services exposes a broad public API surface through export *.",
      location: {
        filePath: path.join(root, "src/services/index.ts"),
        line: 1
      },
      details: {
        module: "Services",
        specifier: "./feature",
        exposedPath: "src/services/index.ts",
        exportKind: "star",
        isTypeOnly: false,
        observed: "Services broad public surface",
        rule: "Services exposes src/services/index.ts",
        ruleLocation: loc(root, "axiom/main.axi", 3),
        suggestion:
          "Review whether this barrel is intentionally broad; prefer explicit exports or split the public surface when coupling starts to hide behind one entry point."
      }
    }
  ]);
});

test("public API surface warnings report entrypoint coupling as review pressure", () => {
  const root = path.join("repo");
  const spec = servicesSpec(root);
  const ownership = createOwnershipIndex(root, spec.modules);
  const imports: ImportRecord[] = ["a", "b", "c", "d"].map((name, index) => ({
    filePath: path.join(root, "src/services/index.ts"),
    line: index + 1,
    kind: "export",
    specifier: `./${name}`,
    resolvedPath: path.join(root, `src/services/${name}.ts`),
    exportKind: "named"
  }));

  assert.deepEqual(findPublicApiSurfaceWarnings(spec, imports, ownership, root), [
    {
      code: "public_entrypoint_coupling",
      message: "Services public entry point reaches 4 internal files.",
      location: {
        filePath: path.join(root, "src/services/index.ts"),
        line: 1
      },
      details: {
        module: "Services",
        exposedPath: "src/services/index.ts",
        internalTargetCount: 4,
        internalImportSites: 4,
        typeOnlyImportSites: 0,
        internalTargets: [
          "src/services/a.ts",
          "src/services/b.ts",
          "src/services/c.ts",
          "src/services/d.ts"
        ],
        importKinds: ["export"],
        threshold: {
          internalTargets: 4
        },
        observed: "Services public entry point depends on 4 internal files",
        rule: "Services exposes src/services/index.ts",
        ruleLocation: loc(root, "axiom/main.axi", 3),
        suggestion:
          "Review whether this entry point is masking internal coupling; prefer narrower named exports, split the public surface, or make the facade boundary explicit."
      }
    }
  ]);
});

function servicesSpec(root: string): AxiomSpec {
  const module: AxiomModule = {
    name: "Services",
    location: loc(root, "axiom/main.axi", 1),
    paths: ["src/services/**"],
    pathLocations: [loc(root, "axiom/main.axi", 2)],
    depends: [],
    forbidsModules: [],
    exposes: [{ pattern: "src/services/index.ts", location: loc(root, "axiom/main.axi", 3) }],
    hides: [],
    suppressions: [],
    forbidsCapabilities: [],
    requires: []
  };

  return {
    modules: [module],
    layerOrders: []
  };
}

function loc(root: string, relativeFilePath: string, line: number): SourceLocation {
  return {
    filePath: path.join(root, relativeFilePath),
    line
  };
}
