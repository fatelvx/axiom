import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import type { AxiomModule, AxiomSpec, ObservedDependency, PathRef, SourceLocation } from "../axi/types.js";
import { findDeepInternalImportWarnings } from "./deepInternalImportWarnings.js";
import { createOwnershipIndex } from "./ownership.js";

test("deep internal import warnings report source-group entrypoint bypasses as review pressure", () => {
  const root = path.join("repo");
  const spec = appAndLibSpec(root);
  const ownership = createOwnershipIndex(root, spec.modules);
  const sourceFiles = [
    path.join(root, "src/app/deep.ts"),
    path.join(root, "src/lib/index.ts"),
    path.join(root, "src/lib/internal/secret.ts")
  ];
  const observedDependencies: ObservedDependency[] = [
    {
      fromModule: "App",
      toModule: "Lib",
      importRecord: {
        filePath: path.join(root, "src/app/deep.ts"),
        line: 1,
        kind: "import",
        specifier: "../lib/internal/secret",
        resolvedPath: path.join(root, "src/lib/internal/secret.ts")
      }
    }
  ];

  assert.deepEqual(findDeepInternalImportWarnings(spec, observedDependencies, sourceFiles, ownership, root), [
    {
      code: "deep_internal_import",
      message: "App imports Lib through a deep relative path instead of a likely source-group entry point.",
      location: {
        filePath: path.join(root, "src/app/deep.ts"),
        line: 1
      },
      details: {
        fromModule: "App",
        toModule: "Lib",
        specifier: "../lib/internal/secret",
        importedPath: "src/lib/internal/secret.ts",
        deepImportGroup: "src/lib/internal/*",
        sourceGroup: "src/lib",
        publicEntrypoints: ["src/lib/index.ts"],
        publicEntrypointCount: 1,
        publicEntrypointsTruncated: false,
        moduleEntrypoints: [],
        moduleEntrypointCount: 0,
        moduleEntrypointsTruncated: false,
        entrypointConfidence: "single_likely_entrypoint",
        entrypointReason: "single_same_source_group_entrypoint",
        importKind: "import",
        observed: "App -> Lib deep internal import",
        scope: "relative_cross_module_non_entrypoint",
        suggestion:
          "Import the source-group entry point from Lib, or declare explicit exposes/hides rules if this deep path is intentional."
      }
    }
  ]);
});

test("deep internal import warnings avoid recommending entrypoints from another source group", () => {
  const root = path.join("repo");
  const spec = servicesCycleSpec(root);
  const ownership = createOwnershipIndex(root, spec.modules);
  const sourceFiles = [
    path.join(root, "src/app/use-store.ts"),
    path.join(root, "src/services/sandbox/index.ts"),
    path.join(root, "src/store/chatStore.ts")
  ];
  const observedDependencies: ObservedDependency[] = [
    {
      fromModule: "App",
      toModule: "ServicesCycle",
      importRecord: {
        filePath: path.join(root, "src/app/use-store.ts"),
        line: 1,
        kind: "import",
        specifier: "../store/chatStore",
        resolvedPath: path.join(root, "src/store/chatStore.ts")
      }
    }
  ];

  assert.deepEqual(findDeepInternalImportWarnings(spec, observedDependencies, sourceFiles, ownership, root), [
    {
      code: "deep_internal_import",
      message: "App imports ServicesCycle through a deep relative path with no clear source-group entry point.",
      location: {
        filePath: path.join(root, "src/app/use-store.ts"),
        line: 1
      },
      details: {
        fromModule: "App",
        toModule: "ServicesCycle",
        specifier: "../store/chatStore",
        importedPath: "src/store/chatStore.ts",
        deepImportGroup: "src/store/*",
        sourceGroup: "src/store",
        publicEntrypoints: [],
        publicEntrypointCount: 0,
        publicEntrypointsTruncated: false,
        moduleEntrypoints: ["src/services/sandbox/index.ts"],
        moduleEntrypointCount: 1,
        moduleEntrypointsTruncated: false,
        entrypointConfidence: "ambiguous_entrypoints",
        entrypointReason: "no_same_source_group_entrypoint",
        importKind: "import",
        observed: "App -> ServicesCycle deep internal import",
        scope: "relative_cross_module_non_entrypoint",
        suggestion:
          "Review the src/store/* source group for ServicesCycle; this module may be too broad or missing a public entry point, so declare explicit exposes/hides rules or split the module before treating another source group's index file as the public boundary."
      }
    }
  ]);
});

test("deep internal import warnings defer to explicit exposes rules", () => {
  const root = path.join("repo");
  const spec = appAndLibSpec(root, [{ pattern: "src/lib/index.ts", location: loc(root, "axiom/main.axi", 8) }]);
  const ownership = createOwnershipIndex(root, spec.modules);
  const sourceFiles = [
    path.join(root, "src/app/deep.ts"),
    path.join(root, "src/lib/index.ts"),
    path.join(root, "src/lib/internal/secret.ts")
  ];
  const observedDependencies: ObservedDependency[] = [
    {
      fromModule: "App",
      toModule: "Lib",
      importRecord: {
        filePath: path.join(root, "src/app/deep.ts"),
        line: 1,
        kind: "import",
        specifier: "../lib/internal/secret",
        resolvedPath: path.join(root, "src/lib/internal/secret.ts")
      }
    }
  ];

  assert.deepEqual(findDeepInternalImportWarnings(spec, observedDependencies, sourceFiles, ownership, root), []);
});

function appAndLibSpec(root: string, libExposes: PathRef[] = []): AxiomSpec {
  return {
    modules: [
      moduleRef(root, "App", ["src/app/**"], 1),
      moduleRef(root, "Lib", ["src/lib/**"], 5, libExposes)
    ],
    layerOrders: []
  };
}

function servicesCycleSpec(root: string): AxiomSpec {
  return {
    modules: [
      moduleRef(root, "App", ["src/app/**"], 1),
      moduleRef(root, "ServicesCycle", ["src/services/**", "src/store/**"], 5)
    ],
    layerOrders: []
  };
}

function moduleRef(
  root: string,
  name: string,
  paths: string[],
  line: number,
  exposes: PathRef[] = []
): AxiomModule {
  return {
    name,
    location: loc(root, "axiom/main.axi", line),
    paths,
    pathLocations: paths.map((_, index) => loc(root, "axiom/main.axi", line + index + 1)),
    depends: [],
    forbidsModules: [],
    exposes,
    hides: [],
    suppressions: [],
    forbidsCapabilities: [],
    requires: []
  };
}

function loc(root: string, relativeFilePath: string, line: number): SourceLocation {
  return {
    filePath: path.join(root, relativeFilePath),
    line
  };
}
