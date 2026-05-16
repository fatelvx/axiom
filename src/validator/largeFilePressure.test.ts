import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import type { SourceFileMetric } from "../axi/types.js";
import {
  findLargeModuleFileWarnings,
  summarizeLargeFilePressure,
  summarizeTopLargestFiles
} from "./largeFilePressure.js";

test("large file pressure summaries rank threshold-matching files without changing advisory semantics", () => {
  const root = path.join("repo");
  const metrics: SourceFileMetric[] = [
    metric(root, "src/small.ts", 200, { imports: 1, exports: 1, functions: 3 }),
    metric(root, "src/beta.ts", 900, { imports: 2, exports: 3, functions: 9, classes: 1 }),
    metric(root, "src/alpha.ts", 900, { imports: 1, exports: 0, functions: 4 }),
    metric(root, "src/huge.ts", 1200, {
      imports: 5,
      exports: 2,
      functions: 20,
      clusters: [{ token: "render", count: 3, samples: ["renderScene"] }]
    })
  ];

  assert.deepEqual(summarizeLargeFilePressure(root, metrics).map((summary) => summary.filePath), [
    "src/huge.ts",
    "src/alpha.ts",
    "src/beta.ts"
  ]);
  assert.deepEqual(summarizeLargeFilePressure(root, metrics, { limit: 2 }).map((summary) => summary.filePath), [
    "src/huge.ts",
    "src/alpha.ts"
  ]);

  const [huge] = summarizeLargeFilePressure(root, metrics);
  assert.equal(huge?.threshold, 800);
  assert.equal(huge?.importsScanned, 5);
  assert.equal(huge?.functionLikeCount, 20);
  assert.deepEqual(huge?.nameTokenClusters, [{ token: "render", count: 3, samples: ["renderScene"] }]);
});

test("large file pressure helpers keep warning and no-contract setup evidence shapes stable", () => {
  const root = path.join("repo");
  const metrics: SourceFileMetric[] = [
    metric(root, "src/one.ts", 810, { imports: 2, exports: 1, functions: 6 }),
    metric(root, "src/two.ts", 700, { imports: 1, exports: 2, functions: 4, classes: 1 })
  ];

  assert.deepEqual(summarizeTopLargestFiles(root, metrics), [
    {
      filePath: "src/one.ts",
      lineCount: 810,
      imports: 2,
      exports: 1,
      functions: 6,
      classes: 0
    },
    {
      filePath: "src/two.ts",
      lineCount: 700,
      imports: 1,
      exports: 2,
      functions: 4,
      classes: 1
    }
  ]);

  assert.deepEqual(findLargeModuleFileWarnings(metrics, root), [
    {
      code: "large_module_file",
      message: "Source file is large enough that architecture pressure may be hidden inside the file.",
      location: {
        filePath: path.join(root, "src/one.ts"),
        line: 1
      },
      details: {
        filePath: "src/one.ts",
        lineCount: 810,
        threshold: {
          lines: 800
        },
        importsScanned: 2,
        exportsScanned: 1,
        functionLikeCount: 6,
        classCount: 0,
        observed: "src/one.ts has 810 lines",
        scope: "intra_file_responsibility_pressure",
        suggestion:
          "Use this as a refactor/review prompt; split only after identifying real responsibilities. This warning does not mean the import graph is unhealthy."
      }
    }
  ]);
});

function metric(
  root: string,
  relativeFilePath: string,
  lineCount: number,
  options: {
    imports?: number;
    exports?: number;
    functions?: number;
    classes?: number;
    clusters?: SourceFileMetric["nameTokenClusters"];
  } = {}
): SourceFileMetric {
  return {
    filePath: path.join(root, relativeFilePath),
    lineCount,
    importCount: options.imports ?? 0,
    exportCount: options.exports ?? 0,
    functionLikeCount: options.functions ?? 0,
    classCount: options.classes ?? 0,
    nameTokenClusters: options.clusters ?? []
  };
}
