import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import type { ImportRecord } from "../axi/types.js";
import { resolveRelativeImport, type ImportResolver } from "./importResolver.js";

export interface ScanImportsOptions {
  resolver?: ImportResolver;
}

export function scanImports(filePath: string, options: ScanImportsOptions = {}): ImportRecord[] {
  const text = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, text, ts.ScriptTarget.Latest, true, getScriptKind(filePath));
  const imports: ImportRecord[] = [];
  const resolver = options.resolver ?? { resolve: resolveRelativeImport };

  function recordImport(
    node: ts.Node,
    kind: ImportRecord["kind"],
    specifier: string,
    options: Pick<ImportRecord, "exportKind" | "isTypeOnly"> = {}
  ): void {
    const line = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;

    imports.push({
      filePath,
      line,
      kind,
      specifier,
      resolvedPath: resolver.resolve(filePath, specifier),
      ...options
    });
  }

  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node)) {
      const specifier = readStringLiteral(node.moduleSpecifier);
      if (specifier) {
        recordImport(node, "import", specifier);
      }
    } else if (ts.isExportDeclaration(node)) {
      const specifier = readStringLiteral(node.moduleSpecifier);
      if (specifier) {
        recordImport(node, "export", specifier, {
          exportKind: readExportKind(node),
          isTypeOnly: node.isTypeOnly
        });
      }
    } else if (ts.isImportEqualsDeclaration(node)) {
      const specifier = readImportEqualsSpecifier(node);
      if (specifier) {
        recordImport(node, "import", specifier);
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

  return imports;
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
