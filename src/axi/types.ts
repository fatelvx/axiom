export type ViolationCode =
  | "parse_error"
  | "no_spec_files"
  | "duplicate_module"
  | "duplicate_layer_order"
  | "invalid_suppression"
  | "expired_suppression"
  | "expiring_suppression"
  | "unused_suppression"
  | "ambiguous_module_owner"
  | "unowned_source_file"
  | "unresolved_import"
  | "dynamic_dependency_expression"
  | "large_module_file"
  | "broad_public_surface"
  | "public_entrypoint_coupling"
  | "coupling_concentration"
  | "deep_internal_import"
  | "unknown_layer"
  | "missing_module_path"
  | "unknown_module"
  | "cycle_dependency"
  | "layer_breach"
  | "hidden_reexport"
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
  pathScope?: PathRef;
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
  kind: "import" | "export" | "dynamic_import" | "require" | "import_type";
  specifier: string;
  resolvedPath?: string;
  exportKind?: "named" | "star" | "namespace";
  isTypeOnly?: boolean;
  importedBindings?: ImportBinding[];
}

export interface DynamicDependencyExpressionRecord {
  filePath: string;
  line: number;
  kind: "dynamic_import_expression" | "require_expression" | "python_import_expression";
  expressionKind: string;
  expressionPreview: string;
}

export interface ImportBinding {
  localName: string;
  importedName?: string;
  isTypeOnly?: boolean;
}

export interface LocalExportRecord {
  filePath: string;
  line: number;
  kind: "named" | "default" | "export_equals";
  exportedNames: string[];
  isTypeOnly?: boolean;
}

export interface SourceFileMetric {
  filePath: string;
  lineCount: number;
  importCount: number;
  exportCount: number;
  functionLikeCount: number;
  classCount: number;
  nameTokenClusters: SourceFileNameTokenCluster[];
}

export interface SourceFileNameTokenCluster {
  token: string;
  count: number;
  samples: string[];
}

export interface SourceFileScan {
  imports: ImportRecord[];
  dynamicDependencyExpressions: DynamicDependencyExpressionRecord[];
  localExports: LocalExportRecord[];
  metrics: SourceFileMetric;
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
  pathScope?: string;
  expiresOn: string;
  reason: string;
  location: SourceLocation;
}

export interface SuppressedViolation {
  violation: Violation;
  suppression: SuppressionInfo;
}
