import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import type { ImportBinding, ImportRecord, LocalExportRecord, SourceFileScan } from "../axi/types.js";
import { resolveRelativeImport, type ImportResolver, type ImportResolveOptions } from "./importResolver.js";

export interface ScanImportsOptions {
  resolver?: ImportResolver;
}

export function scanImports(filePath: string, options: ScanImportsOptions = {}): ImportRecord[] {
  return scanSourceFile(filePath, options).imports;
}

export function scanSourceFile(filePath: string, options: ScanImportsOptions = {}): SourceFileScan {
  const text = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, getScriptKind(filePath));
  const imports: ImportRecord[] = [];
  const localExports: LocalExportRecord[] = [];
  let functionLikeCount = 0;
  let classCount = 0;
  const resolver = options.resolver ?? { resolve: resolveRelativeImport };

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

  function visit(node: ts.Node): void {
    if (isFunctionLikeNode(node)) {
      functionLikeCount += 1;
    }

    if (ts.isClassDeclaration(node) || ts.isClassExpression(node)) {
      classCount += 1;
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
    localExports,
    metrics: {
      filePath,
      lineCount: countLines(text),
      importCount: imports.length,
      exportCount: countExportRecords(imports, localExports),
      functionLikeCount,
      classCount
    }
  };
}

function countLines(text: string): number {
  if (text.length === 0) {
    return 0;
  }

  return text.split(/\r\n|\r|\n/).length;
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

  if (ts.isIdentifier(node.expression) && node.expression.text === "require") {
    const specifier = readStringLiteral(firstArgument);
    return specifier ? { kind: "require", specifier } : undefined;
  }

  return undefined;
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
