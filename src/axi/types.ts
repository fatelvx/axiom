export type ViolationCode =
  | "parse_error"
  | "no_spec_files"
  | "duplicate_module"
  | "duplicate_layer_order"
  | "invalid_suppression"
  | "expired_suppression"
  | "unused_suppression"
  | "ambiguous_module_owner"
  | "unowned_source_file"
  | "unknown_layer"
  | "missing_module_path"
  | "unknown_module"
  | "cycle_dependency"
  | "layer_breach"
  | "undeclared_dependency"
  | "hidden_import"
  | "unexposed_import"
  | "forbidden_dependency";

export interface SourceLocation {
  filePath: string;
  line: number;
  column?: number;
}

export interface ModuleRef {
  name: string;
  location: SourceLocation;
}

export interface PathRef {
  pattern: string;
  location: SourceLocation;
}

export interface SuppressionRule {
  code: string;
  target: ModuleRef;
  expiresOn: string;
  reason: string;
  location: SourceLocation;
}

export interface AxiomModule {
  name: string;
  location: SourceLocation;
  paths: string[];
  pathLocations: SourceLocation[];
  layer?: string;
  layerLocation?: SourceLocation;
  depends: ModuleRef[];
  forbidsModules: ModuleRef[];
  exposes: PathRef[];
  hides: PathRef[];
  suppressions: SuppressionRule[];
  forbidsCapabilities: ModuleRef[];
  requires: ModuleRef[];
  purpose?: string;
  purposeLocation?: SourceLocation;
}

export interface LayerOrder {
  layers: ModuleRef[];
  location: SourceLocation;
}

export interface AxiomSpec {
  modules: AxiomModule[];
  layerOrders: LayerOrder[];
}

export interface Violation {
  code: ViolationCode;
  message: string;
  location?: SourceLocation;
  details?: Record<string, unknown>;
}

export interface ImportRecord {
  filePath: string;
  line: number;
  specifier: string;
  resolvedPath?: string;
}

export interface ObservedDependency {
  fromModule: string;
  toModule: string;
  importRecord: ImportRecord;
}

export interface SuppressionInfo {
  fromModule: string;
  toModule: string;
  code: ViolationCode;
  expiresOn: string;
  reason: string;
  location: SourceLocation;
}

export interface SuppressedViolation {
  violation: Violation;
  suppression: SuppressionInfo;
}
