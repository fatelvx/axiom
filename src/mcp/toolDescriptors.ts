import type { AxiomMcpToolDescriptor } from "./tools.js";

interface JsonSchema {
  additionalProperties?: boolean;
  description?: string;
  enum?: string[];
  items?: JsonSchema;
  minimum?: number;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  type: "array" | "boolean" | "integer" | "number" | "object" | "string";
}

const SUMMARY_SCHEMA: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["kind", "agentHint"],
  properties: {
    kind: { type: "string" },
    agentHint: { type: "string" },
    ok: { type: "boolean" },
    status: { type: "string" },
    gate: {
      type: "object",
      additionalProperties: false,
      required: ["command", "currentCommandIsGate", "hardViolationsFailCheck"],
      properties: {
        command: { type: "string" },
        currentCommandIsGate: { type: "boolean" },
        hardViolationsFailCheck: { type: "boolean" }
      }
    },
    counts: {
      type: "object",
      additionalProperties: false,
      properties: {
        allowedRoots: { type: "integer" },
        architecturePressureNotes: { type: "integer" },
        collapsedCycles: { type: "integer" },
        importsScanned: { type: "integer" },
        intentionalDebt: { type: "integer" },
        modules: { type: "integer" },
        newObservedEdges: { type: "integer" },
        observedDependencies: { type: "integer" },
        observedImportSites: { type: "integer" },
        observedModuleEdges: { type: "integer" },
        removedObservedEdges: { type: "integer" },
        shownObservedDependencies: { type: "integer" },
        sourceFiles: { type: "integer" },
        violations: { type: "integer" },
        warnings: { type: "integer" }
      }
    },
    drift: {
      type: "object",
      additionalProperties: false,
      required: ["newObservedEdges", "removedObservedEdges"],
      properties: {
        kind: { type: "string" },
        newObservedEdges: { type: "integer" },
        removedObservedEdges: { type: "integer" }
      }
    },
    reviewStory: {
      type: "object",
      additionalProperties: false,
      properties: {
        caveat: { type: "string" },
        firstPressure: {
          type: "object",
          additionalProperties: false,
          properties: {
            kind: { type: "string" },
            severity: { type: "string" },
            title: { type: "string" }
          }
        },
        nextStep: { type: "string" },
        summary: { type: "string" }
      }
    },
    topSignals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["kind", "title"],
        properties: {
          count: { type: "integer" },
          detail: { type: "string" },
          fromModule: { type: "string" },
          kind: { type: "string" },
          location: { type: "string" },
          module: { type: "string" },
          severity: { type: "string" },
          title: { type: "string" },
          toModule: { type: "string" }
        }
      }
    }
  }
};

const OUTPUT_SCHEMA: JsonSchema = {
  type: "object",
  additionalProperties: false,
  required: ["tool", "command", "exitCode", "summary"],
  properties: {
    tool: { type: "string" },
    command: { type: "string" },
    exitCode: { type: "integer" },
    schemaVersion: { type: "string" },
    summary: SUMMARY_SCHEMA,
    payload: { type: "object" },
    error: {
      type: "object",
      additionalProperties: false,
      required: ["message"],
      properties: {
        message: { type: "string" },
        stderr: { type: "string" },
        stdout: { type: "string" }
      }
    }
  }
};

const COMMON_TOOL_PROPERTIES: Record<string, JsonSchema> = {
  root: {
    type: "string",
    description: "Project root to scan. Paths inside .axi specs are resolved relative to this root."
  },
  configPath: {
    type: "string",
    description: "Optional axiom.config.json path."
  },
  include: {
    type: "array",
    description: "Optional source include globs, matching repeated CLI --include flags.",
    items: { type: "string" }
  },
  exclude: {
    type: "array",
    description: "Optional source exclude globs, matching repeated CLI --exclude flags.",
    items: { type: "string" }
  },
  specPaths: {
    type: "array",
    description: "Optional explicit .axi spec files or directories, matching repeated CLI --spec flags.",
    items: { type: "string" }
  },
  adoptionMode: {
    type: "string",
    description: "Ownership adoption mode for unowned source files.",
    enum: ["loose", "warn-unowned", "strict"]
  },
  intentionalViolationWarningDays: {
    type: "integer",
    minimum: 0,
    description: "Warn when visible intentional debt expires within this many days."
  },
  warnings: {
    type: "object",
    additionalProperties: false,
    description: "Opt-in advisory signal families. These never become MCP-only gates.",
    properties: {
      couplingConcentration: { type: "boolean" },
      deepInternalImports: { type: "boolean" },
      dynamicImports: { type: "boolean" },
      largeFiles: { type: "boolean" },
      publicApiSurface: { type: "boolean" },
      unresolvedImports: { type: "boolean" }
    }
  }
};

const BASELINE_PROPERTY: JsonSchema = {
  type: "string",
  description: "Path to an unfiltered axi graph --json baseline."
};

export const TOOL_DESCRIPTORS: AxiomMcpToolDescriptor[] = [
  {
    name: "axiom_roots",
    title: "List Allowed Axiom Roots",
    description: "List the local roots this MCP server is allowed to scan. Use this before choosing a root for other Axiom MCP tools.",
    inputSchema: objectSchema({}, []),
    outputSchema: OUTPUT_SCHEMA,
    annotations: readOnlyAnnotations()
  },
  {
    name: "axiom_check",
    title: "Run Axiom Check",
    description: "Run `axi check --json` as the hard contract gate. Exit code 1 from hard violations is returned as structured evidence, not a tool crash.",
    inputSchema: objectSchema(COMMON_TOOL_PROPERTIES, ["root"]),
    outputSchema: OUTPUT_SCHEMA,
    annotations: readOnlyAnnotations()
  },
  {
    name: "axiom_observe",
    title: "Run Axiom Observe",
    description: "Run `axi observe --json` for review context, warnings, visible debt, and optional baseline drift. This is not a gate.",
    inputSchema: objectSchema(
      {
        ...COMMON_TOOL_PROPERTIES,
        baselinePath: BASELINE_PROPERTY
      },
      ["root"]
    ),
    outputSchema: OUTPUT_SCHEMA,
    annotations: readOnlyAnnotations()
  },
  {
    name: "axiom_graph",
    title: "Run Axiom Graph",
    description: "Run `axi graph --json` for the declared and observed dependency graph, optionally focused as attention output or emitted as a portable baseline payload.",
    inputSchema: objectSchema(
      {
        ...COMMON_TOOL_PROPERTIES,
        baselinePath: BASELINE_PROPERTY,
        portable: {
          type: "boolean",
          description: "Emit `axi graph --json --portable` metadata for a shared graph baseline. Only valid with the full unfiltered graph and no baselinePath."
        },
        view: {
          type: "string",
          description: "Graph view. Full is the unfiltered graph; attention and violationsOnly match the CLI focus flags.",
          enum: ["full", "attention", "violationsOnly"]
        }
      },
      ["root"]
    ),
    outputSchema: OUTPUT_SCHEMA,
    annotations: readOnlyAnnotations()
  },
  {
    name: "axiom_diff",
    title: "Run Axiom Diff",
    description: "Run `axi diff --json` against an existing unfiltered graph baseline. Drift remains advisory.",
    inputSchema: objectSchema(
      {
        ...COMMON_TOOL_PROPERTIES,
        baselinePath: BASELINE_PROPERTY
      },
      ["root", "baselinePath"]
    ),
    outputSchema: OUTPUT_SCHEMA,
    annotations: readOnlyAnnotations()
  },
  {
    name: "axiom_infer_contract",
    title: "Infer Axiom Contract",
    description: "Run `axi infer --json` to produce a current-graph starter contract draft. This is authoring evidence, not declared intent.",
    inputSchema: objectSchema(
      {
        root: COMMON_TOOL_PROPERTIES.root,
        configPath: COMMON_TOOL_PROPERTIES.configPath,
        include: COMMON_TOOL_PROPERTIES.include,
        exclude: COMMON_TOOL_PROPERTIES.exclude,
        groupBy: {
          type: "string",
          description: "Inference grouping strategy.",
          enum: ["folder", "workspace"]
        },
        groupDepth: {
          type: "integer",
          minimum: 1,
          description: "Folder grouping depth for inferred modules."
        }
      },
      ["root"]
    ),
    outputSchema: OUTPUT_SCHEMA,
    annotations: readOnlyAnnotations()
  },
  {
    name: "axiom_observe_inferred_contract",
    title: "Observe With Inferred Contract",
    description: "Run `axi infer --json`, then run `axi observe --json` with a server-managed temporary inferred spec. This is advisory review evidence, not declared architecture intent.",
    inputSchema: objectSchema(
      {
        root: COMMON_TOOL_PROPERTIES.root,
        configPath: COMMON_TOOL_PROPERTIES.configPath,
        include: COMMON_TOOL_PROPERTIES.include,
        exclude: COMMON_TOOL_PROPERTIES.exclude,
        adoptionMode: COMMON_TOOL_PROPERTIES.adoptionMode,
        intentionalViolationWarningDays: COMMON_TOOL_PROPERTIES.intentionalViolationWarningDays,
        warnings: COMMON_TOOL_PROPERTIES.warnings,
        groupBy: {
          type: "string",
          description: "Inference grouping strategy used for the temporary starter contract.",
          enum: ["folder", "workspace"]
        },
        groupDepth: {
          type: "integer",
          minimum: 1,
          description: "Folder grouping depth used for the temporary starter contract."
        }
      },
      ["root"]
    ),
    outputSchema: OUTPUT_SCHEMA,
    annotations: readOnlyAnnotations()
  }
];

function objectSchema(properties: Record<string, JsonSchema>, required: string[]): JsonSchema {
  return {
    type: "object",
    additionalProperties: false,
    properties,
    required
  };
}

function readOnlyAnnotations(): AxiomMcpToolDescriptor["annotations"] {
  return {
    destructiveHint: false,
    openWorldHint: false,
    readOnlyHint: true
  };
}
