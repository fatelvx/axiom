import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import type {
  DynamicDependencyExpressionRecord,
  ImportBinding,
  ImportRecord,
  LocalExportRecord,
  SourceFileNameTokenCluster,
  SourceFileScan
} from "../axi/types.js";
import { resolveRelativeImport, type ImportResolver, type ImportResolveOptions } from "./importResolver.js";
import { scanPythonSourceFile } from "./pythonImportScanner.js";

export interface ScanImportsOptions {
  resolver?: ImportResolver;
}

export function scanImports(filePath: string, options: ScanImportsOptions = {}): ImportRecord[] {
  return scanSourceFile(filePath, options).imports;
}

export function scanSourceFile(filePath: string, options: ScanImportsOptions = {}): SourceFileScan {
  const text = fs.readFileSync(filePath, "utf8");
  const resolver = options.resolver ?? { resolve: resolveRelativeImport };

  if (path.extname(filePath).toLowerCase() === ".py") {
    return scanPythonSourceFile(filePath, text, resolver);
  }

  const parseText = prepareTextForParsing(filePath, text);
  const sourceFile = ts.createSourceFile(filePath, parseText, ts.ScriptTarget.Latest, true, getScriptKind(filePath));
  const imports: ImportRecord[] = [];
  const dynamicDependencyExpressions: DynamicDependencyExpressionRecord[] = [];
  const localExports: LocalExportRecord[] = [];
  const declarationNames: string[] = [];
  let functionLikeCount = 0;
  let classCount = 0;

  function recordImport(
    node: ts.Node,
    kind: ImportRecord["kind"],
    specifier: string,
    importOptions: Pick<ImportRecord, "exportKind" | "isTypeOnly" | "importedBindings"> = {}
  ): void {
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
    const resolveOptions: ImportResolveOptions = {
      allowDeclarationFiles: importOptions.isTypeOnly === true || kind === "import_type"
    };

    imports.push({
      filePath,
      line,
      kind,
      specifier,
      resolvedPath: resolver.resolve(filePath, specifier, resolveOptions),
      ...importOptions
    });
  }

  function recordLocalExport(
    node: ts.Node,
    kind: LocalExportRecord["kind"],
    exportedNames: string[],
    options: Pick<LocalExportRecord, "isTypeOnly"> = {}
  ): void {
    if (exportedNames.length === 0) {
      return;
    }

    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

    localExports.push({
      filePath,
      line,
      kind,
      exportedNames,
      ...options
    });
  }

  function recordDynamicDependencyExpression(
    node: ts.Node,
    kind: DynamicDependencyExpressionRecord["kind"],
    expression: ts.Expression
  ): void {
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

    dynamicDependencyExpressions.push({
      filePath,
      line,
      kind,
      expressionKind: formatSyntaxKind(expression.kind),
      expressionPreview: formatExpressionPreview(expression, sourceFile)
    });
  }

  function recordDeclarationName(name: string | undefined): void {
    if (!name) {
      return;
    }

    declarationNames.push(name);
  }

  function visit(node: ts.Node): void {
    if (isFunctionLikeNode(node)) {
      functionLikeCount += 1;
      recordDeclarationName(readFunctionLikeName(node));
    }

    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      classCount += 1;
      recordDeclarationName(readDeclarationName(node.name));
    }

    if (ts.isVariableDeclaration(node) && node.initializer && isNameableResponsibilityInitializer(node.initializer)) {
      recordDeclarationName(readBindingName(node.name));
    } else if (
      ts.isPropertyDeclaration(node) &&
      node.initializer &&
      isNameableResponsibilityInitializer(node.initializer)
    ) {
      recordDeclarationName(readPropertyName(node.name));
    }

    if (ts.isImportDeclaration(node)) {
      const specifier = readStringLiteral(node.moduleSpecifier);
      if (specifier) {
        const importedBindings = readImportBindings(node);
        recordImport(node, "import", specifier, {
          isTypeOnly: isImportDeclarationTypeOnly(node, importedBindings),
          importedBindings
        });
      }
    } else if (ts.isExportDeclaration(node)) {
      const specifier = readStringLiteral(node.moduleSpecifier);
      if (specifier) {
        recordImport(node, "export", specifier, {
          exportKind: readExportKind(node),
          isTypeOnly: node.isTypeOnly
        });
      } else {
        recordLocalExport(node, "named", readLocalExportNames(node), {
          isTypeOnly: isLocalExportTypeOnly(node)
        });
      }
    } else if (ts.isExportAssignment(node)) {
      if (ts.isIdentifier(node.expression)) {
        recordLocalExport(node, node.isExportEquals ? "export_equals" : "default", [node.expression.text]);
      }
    } else if (ts.isImportEqualsDeclaration(node)) {
      const specifier = readImportEqualsSpecifier(node);
      if (specifier) {
        recordImport(node, "import", specifier, {
          importedBindings: [{ localName: node.name.text }]
        });
      }
    } else if (ts.isCallExpression(node)) {
      const callImport = readCallImport(node);
      if (callImport) {
        recordImport(node, callImport.kind, callImport.specifier);
      } else {
        const dynamicExpression = readDynamicDependencyExpression(node);
        if (dynamicExpression) {
          recordDynamicDependencyExpression(node, dynamicExpression.kind, dynamicExpression.expression);
        }
      }
    } else if (ts.isImportTypeNode(node)) {
      const specifier = readImportTypeSpecifier(node);
      if (specifier) {
        recordImport(node, "import_type", specifier);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return {
    imports,
    dynamicDependencyExpressions,
    localExports,
    metrics: {
      filePath,
      lineCount: countLines(text),
      importCount: imports.length,
      exportCount: countExportRecords(imports, localExports),
      functionLikeCount,
      classCount,
      nameTokenClusters: buildNameTokenClusters(declarationNames)
    }
  };
}

function countLines(text: string): number {
  if (text.length === 0) {
    return 0;
  }

  return text.split(/\r\n|\r|\n/).length;
}

function prepareTextForParsing(filePath: string, text: string): string {
  return path.extname(filePath).toLowerCase() === ".vue" ? extractVueScriptText(text) : text;
}

function extractVueScriptText(text: string): string {
  const scriptBlockPattern = /<script\b[^>]*>[\s\S]*?<\/script>/gi;
  let output = "";
  let cursor = 0;

  for (const match of text.matchAll(scriptBlockPattern)) {
    const block = match[0];
    const blockStart = match.index ?? 0;
    const blockEnd = blockStart + block.length;
    const openEndInBlock = block.indexOf(">") + 1;
    const closeStartInBlock = block.toLowerCase().lastIndexOf("</script");

    if (openEndInBlock <= 0 || closeStartInBlock < openEndInBlock) {
      continue;
    }

    const scriptStart = blockStart + openEndInBlock;
    const scriptEnd = blockStart + closeStartInBlock;

    output += blankNonNewlineText(text.slice(cursor, scriptStart));
    output += text.slice(scriptStart, scriptEnd);
    output += blankNonNewlineText(text.slice(scriptEnd, blockEnd));
    cursor = blockEnd;
  }

  output += blankNonNewlineText(text.slice(cursor));
  return output;
}

function blankNonNewlineText(text: string): string {
  return text.replace(/[^\r\n]/g, " ");
}

function countExportRecords(imports: ImportRecord[], localExports: LocalExportRecord[]): number {
  return imports.filter((importRecord) => importRecord.kind === "export").length + localExports.length;
}

function isFunctionLikeNode(node: ts.Node): boolean {
  return (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isConstructorDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  );
}

function isNameableResponsibilityInitializer(node: ts.Expression): boolean {
  return isFunctionLikeNode(node) || ts.isClassExpression(node);
}

function readFunctionLikeName(node: ts.Node): string | undefined {
  if (
    ts.isFunctionDeclaration(node) ||
    ts.isFunctionExpression(node) ||
    ts.isMethodDeclaration(node) ||
    ts.isGetAccessorDeclaration(node) ||
    ts.isSetAccessorDeclaration(node)
  ) {
    return readDeclarationName(node.name);
  }

  return undefined;
}

function readDeclarationName(name: ts.PropertyName | ts.BindingName | undefined): string | undefined {
  if (!name) {
    return undefined;
  }

  return readPropertyName(name);
}

function readBindingName(name: ts.BindingName): string | undefined {
  return ts.isIdentifier(name) ? name.text : undefined;
}

function readPropertyName(name: ts.PropertyName | ts.BindingName): string | undefined {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }

  return undefined;
}

const nameClusterStopTokens = new Set([
  "add",
  "api",
  "app",
  "build",
  "call",
  "class",
  "const",
  "create",
  "data",
  "default",
  "each",
  "from",
  "get",
  "has",
  "handle",
  "init",
  "into",
  "item",
  "make",
  "new",
  "node",
  "run",
  "set",
  "the",
  "this",
  "type",
  "use",
  "used",
  "value",
  "with"
]);

function buildNameTokenClusters(names: string[]): SourceFileNameTokenCluster[] {
  const clustersByToken = new Map<string, { count: number; samples: string[] }>();

  for (const name of names) {
    for (const token of tokenizeIdentifier(name)) {
      const cluster = clustersByToken.get(token) ?? { count: 0, samples: [] };
      cluster.count += 1;
      if (cluster.samples.length < 5 && !cluster.samples.includes(name)) {
        cluster.samples.push(name);
      }
      clustersByToken.set(token, cluster);
    }
  }

  const clusters = [...clustersByToken.entries()]
    .filter(([, cluster]) => cluster.count >= 3)
    .map(([token, cluster]) => ({
      token,
      count: cluster.count,
      samples: cluster.samples
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }

      return left.token.localeCompare(right.token);
    })
    .slice(0, 5);

  return clusters.length >= 2 ? clusters : [];
}

function tokenizeIdentifier(name: string): string[] {
  const spaced = name
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^A-Za-z0-9]+/g, " ");

  const uniqueTokens = new Set<string>();
  for (const part of spaced.split(/\s+/)) {
    const token = part.toLowerCase().replace(/\d+/g, "");
    if (token.length < 3 || nameClusterStopTokens.has(token)) {
      continue;
    }

    uniqueTokens.add(token);
  }

  return [...uniqueTokens];
}

function readImportBindings(node: ts.ImportDeclaration): ImportBinding[] {
  const importClause = node.importClause;
  if (!importClause) {
    return [];
  }

  const bindings: ImportBinding[] = [];

  if (importClause.name) {
    bindings.push({
      localName: importClause.name.text,
      importedName: "default",
      isTypeOnly: importClause.isTypeOnly
    });
  }

  const namedBindings = importClause.namedBindings;
  if (!namedBindings) {
    return bindings;
  }

  if (ts.isNamespaceImport(namedBindings)) {
    bindings.push({
      localName: namedBindings.name.text,
      importedName: "*",
      isTypeOnly: importClause.isTypeOnly
    });
    return bindings;
  }

  for (const element of namedBindings.elements) {
    bindings.push({
      localName: element.name.text,
      importedName: element.propertyName?.text ?? element.name.text,
      isTypeOnly: importClause.isTypeOnly || element.isTypeOnly
    });
  }

  return bindings;
}

function isImportDeclarationTypeOnly(node: ts.ImportDeclaration, bindings: ImportBinding[]): boolean {
  if (node.importClause?.isTypeOnly) {
    return true;
  }

  return bindings.length > 0 && bindings.every((binding) => binding.isTypeOnly);
}

function readLocalExportNames(node: ts.ExportDeclaration): string[] {
  if (!node.exportClause || !ts.isNamedExports(node.exportClause)) {
    return [];
  }

  return node.exportClause.elements.map((element) => element.propertyName?.text ?? element.name.text);
}

function isLocalExportTypeOnly(node: ts.ExportDeclaration): boolean {
  if (node.isTypeOnly) {
    return true;
  }

  if (!node.exportClause || !ts.isNamedExports(node.exportClause)) {
    return false;
  }

  return node.exportClause.elements.length > 0 && node.exportClause.elements.every((element) => element.isTypeOnly);
}

function readExportKind(node: ts.ExportDeclaration): ImportRecord["exportKind"] {
  if (!node.exportClause) {
    return "star";
  }

  if (ts.isNamespaceExport(node.exportClause)) {
    return "namespace";
  }

  return "named";
}

function readStringLiteral(node: ts.Node | undefined): string | undefined {
  if (!node) {
    return undefined;
  }

  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }

  return undefined;
}

function readImportEqualsSpecifier(node: ts.ImportEqualsDeclaration): string | undefined {
  if (!ts.isExternalModuleReference(node.moduleReference)) {
    return undefined;
  }

  return readStringLiteral(node.moduleReference.expression);
}

function readCallImport(node: ts.CallExpression): { kind: ImportRecord["kind"]; specifier: string } | undefined {
  const firstArgument = node.arguments[0];
  if (!firstArgument) {
    return undefined;
  }

  if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
    const specifier = readStringLiteral(firstArgument);
    return specifier ? { kind: "dynamic_import", specifier } : undefined;
  }

  if (isRequireCallee(node.expression)) {
    const specifier = readStringLiteral(firstArgument);
    return specifier ? { kind: "require", specifier } : undefined;
  }

  return undefined;
}

function readDynamicDependencyExpression(
  node: ts.CallExpression
): { kind: DynamicDependencyExpressionRecord["kind"]; expression: ts.Expression } | undefined {
  const firstArgument = node.arguments[0];
  if (!firstArgument || readStringLiteral(firstArgument)) {
    return undefined;
  }

  if (node.expression.kind === ts.SyntaxKind.ImportKeyword) {
    return { kind: "dynamic_import_expression", expression: firstArgument };
  }

  if (isRequireCallee(node.expression)) {
    return { kind: "require_expression", expression: firstArgument };
  }

  return undefined;
}

function isRequireCallee(expression: ts.Expression): boolean {
  if (ts.isIdentifier(expression)) {
    return expression.text === "require";
  }

  return (
    ts.isPropertyAccessExpression(expression) &&
    expression.name.text === "require" &&
    ts.isIdentifier(expression.expression) &&
    expression.expression.text === "module"
  );
}

function formatSyntaxKind(kind: ts.SyntaxKind): string {
  const name = ts.SyntaxKind[kind];
  return typeof name === "string" ? name : String(kind);
}

function formatExpressionPreview(expression: ts.Expression, sourceFile: ts.SourceFile): string {
  const text = expression.getText(sourceFile).replace(/\s+/g, " ").trim();
  if (text.length <= 120) {
    return text;
  }

  return `${text.slice(0, 117)}...`;
}

function readImportTypeSpecifier(node: ts.ImportTypeNode): string | undefined {
  if (!ts.isLiteralTypeNode(node.argument)) {
    return undefined;
  }

  return readStringLiteral(node.argument.literal);
}

function getScriptKind(filePath: string): ts.ScriptKind {
  switch (path.extname(filePath).toLowerCase()) {
    case ".js":
      return ts.ScriptKind.JS;
    case ".jsx":
      return ts.ScriptKind.JSX;
    case ".tsx":
      return ts.ScriptKind.TSX;
    case ".mts":
      return ts.ScriptKind.TS;
    case ".cts":
      return ts.ScriptKind.TS;
    default:
      return ts.ScriptKind.TS;
  }
}
