import type {
  DynamicDependencyExpressionRecord,
  ImportBinding,
  ImportRecord,
  SourceFileNameTokenCluster,
  SourceFileScan
} from "../axi/types.js";
import type { ImportResolver } from "./importResolver.js";

interface PythonLogicalLine {
  line: number;
  text: string;
}

interface PythonImportAlias {
  name: string;
  alias?: string;
}

export function scanPythonSourceFile(filePath: string, text: string, resolver: ImportResolver): SourceFileScan {
  const imports: ImportRecord[] = [];
  const dynamicDependencyExpressions: DynamicDependencyExpressionRecord[] = [];
  const declarationNames: string[] = [];
  let functionLikeCount = 0;
  let classCount = 0;

  function resolve(specifier: string): string | undefined {
    return resolver.resolve(filePath, specifier, { language: "python" });
  }

  function recordImport(
    line: number,
    specifier: string,
    importedBindings: ImportBinding[] = [],
    kind: ImportRecord["kind"] = "import"
  ): void {
    imports.push({
      filePath,
      line,
      kind,
      specifier,
      resolvedPath: resolve(specifier),
      importedBindings
    });
  }

  function recordDynamicDependencyExpression(
    line: number,
    expressionKind: string,
    expressionPreview: string
  ): void {
    dynamicDependencyExpressions.push({
      filePath,
      line,
      kind: "python_import_expression",
      expressionKind,
      expressionPreview: formatExpressionPreview(expressionPreview)
    });
  }

  for (const logicalLine of buildPythonLogicalLines(text)) {
    const functionName = readPythonFunctionName(logicalLine.text);
    if (functionName) {
      functionLikeCount += 1;
      declarationNames.push(functionName);
    }

    const className = readPythonClassName(logicalLine.text);
    if (className) {
      classCount += 1;
      declarationNames.push(className);
    }

    const importList = readPythonImportStatement(logicalLine.text);
    if (importList) {
      for (const alias of importList) {
        recordImport(logicalLine.line, alias.name, [pythonImportAliasBinding(alias)]);
      }
      continue;
    }

    const fromImport = readPythonFromImportStatement(logicalLine.text);
    if (fromImport) {
      const unresolvedBindings: ImportBinding[] = [];

      for (const alias of fromImport.imports) {
        const binding = pythonFromImportAliasBinding(alias);
        const submoduleSpecifier = alias.name === "*" ? undefined : appendPythonImportName(fromImport.module, alias.name);
        if (submoduleSpecifier && resolve(submoduleSpecifier)) {
          recordImport(logicalLine.line, submoduleSpecifier, [binding]);
        } else {
          unresolvedBindings.push(binding);
        }
      }

      if (unresolvedBindings.length > 0) {
        recordImport(logicalLine.line, fromImport.module, unresolvedBindings);
      }
    }

    for (const dynamicImport of readPythonDynamicImportCalls(logicalLine.text)) {
      if (dynamicImport.literalSpecifier) {
        recordImport(logicalLine.line, dynamicImport.literalSpecifier, [], "dynamic_import");
      } else {
        recordDynamicDependencyExpression(logicalLine.line, dynamicImport.callee, dynamicImport.argument);
      }
    }
  }

  return {
    imports,
    dynamicDependencyExpressions,
    localExports: [],
    metrics: {
      filePath,
      lineCount: countLines(text),
      importCount: imports.length,
      exportCount: 0,
      functionLikeCount,
      classCount,
      nameTokenClusters: buildNameTokenClusters(declarationNames)
    }
  };
}

function buildPythonLogicalLines(text: string): PythonLogicalLine[] {
  const logicalLines: PythonLogicalLine[] = [];
  const physicalLines = text.split(/\r\n|\r|\n/);
  let tripleQuote: "\"\"\"" | "'''" | undefined;
  let buffer = "";
  let startLine = 1;
  let parenDepth = 0;
  let continued = false;

  for (let index = 0; index < physicalLines.length; index += 1) {
    const withoutTripleQuotes = stripTripleQuotedText(physicalLines[index] ?? "", {
      get value() {
        return tripleQuote;
      },
      set value(next) {
        tripleQuote = next;
      }
    });
    const withoutComment = stripPythonComment(withoutTripleQuotes);
    const trimmed = withoutComment.trim();

    if (!continued && trimmed.length === 0) {
      continue;
    }

    if (!continued) {
      startLine = index + 1;
      buffer = "";
      parenDepth = 0;
    }

    const lineText = trimmed.endsWith("\\") ? trimmed.slice(0, -1).trimEnd() : trimmed;
    buffer = buffer.length > 0 ? `${buffer} ${lineText}` : lineText;
    parenDepth += countPythonGroupingDelta(lineText);
    continued = trimmed.endsWith("\\") || parenDepth > 0;

    if (!continued) {
      logicalLines.push({ line: startLine, text: buffer.replace(/\s+/g, " ").trim() });
      buffer = "";
    }
  }

  if (buffer.trim().length > 0) {
    logicalLines.push({ line: startLine, text: buffer.replace(/\s+/g, " ").trim() });
  }

  return logicalLines;
}

function stripTripleQuotedText(
  line: string,
  state: { value: "\"\"\"" | "'''" | undefined }
): string {
  let output = "";
  let cursor = 0;

  while (cursor < line.length) {
    if (state.value) {
      const end = line.indexOf(state.value, cursor);
      if (end === -1) {
        return output;
      }

      cursor = end + state.value.length;
      state.value = undefined;
      continue;
    }

    const nextDouble = line.indexOf("\"\"\"", cursor);
    const nextSingle = line.indexOf("'''", cursor);
    const candidates = [nextDouble, nextSingle].filter((value) => value >= 0);
    const next = candidates.length > 0 ? Math.min(...candidates) : -1;

    if (next === -1) {
      output += line.slice(cursor);
      break;
    }

    output += line.slice(cursor, next);
    state.value = next === nextDouble ? "\"\"\"" : "'''";
    cursor = next + state.value.length;
  }

  return output;
}

function stripPythonComment(line: string): string {
  let quote: "\"" | "'" | undefined;
  let escaped = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if ((char === "\"" || char === "'") && !quote) {
      quote = char;
      continue;
    }

    if (char === quote) {
      quote = undefined;
      continue;
    }

    if (char === "#" && !quote) {
      return line.slice(0, index);
    }
  }

  return line;
}

function countPythonGroupingDelta(line: string): number {
  let delta = 0;
  let quote: "\"" | "'" | undefined;
  let escaped = false;

  for (const char of line) {
    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if ((char === "\"" || char === "'") && !quote) {
      quote = char;
      continue;
    }

    if (char === quote) {
      quote = undefined;
      continue;
    }

    if (quote) {
      continue;
    }

    if (char === "(" || char === "[" || char === "{") {
      delta += 1;
    } else if (char === ")" || char === "]" || char === "}") {
      delta -= 1;
    }
  }

  return delta;
}

function readPythonImportStatement(text: string): PythonImportAlias[] | undefined {
  const match = text.match(/^import\s+(.+)$/);
  if (!match) {
    return undefined;
  }

  return splitPythonAliasList(match[1] ?? "").filter((alias) => isPythonModuleSpecifier(alias.name));
}

function readPythonFromImportStatement(
  text: string
): { module: string; imports: PythonImportAlias[] } | undefined {
  const match = text.match(/^from\s+(\.*[A-Za-z_][A-Za-z0-9_.]*|\.+)\s+import\s+(.+)$/);
  if (!match) {
    return undefined;
  }

  const module = match[1] ?? "";
  const imports = splitPythonAliasList(stripPythonImportListParens(match[2] ?? ""));
  return imports.length > 0 && isPythonModuleSpecifier(module)
    ? { module, imports }
    : undefined;
}

function readPythonDynamicImportCalls(
  text: string
): Array<{ callee: "importlib.import_module" | "__import__"; argument: string; literalSpecifier?: string }> {
  const calls: Array<{ callee: "importlib.import_module" | "__import__"; argument: string; literalSpecifier?: string }> = [];
  const pattern = /(?:^|[^A-Za-z0-9_])((?:importlib\.import_module)|__import__)\s*\(/g;

  for (const match of text.matchAll(pattern)) {
    const callee = match[1] as "importlib.import_module" | "__import__" | undefined;
    const matchedText = match[0] ?? "";
    if (!callee) {
      continue;
    }

    const prefix = matchedText.startsWith(callee) ? "" : matchedText[0];
    if (prefix === ".") {
      continue;
    }

    const openParenIndex = (match.index ?? 0) + matchedText.lastIndexOf("(");
    const argument = readFirstPythonCallArgument(text, openParenIndex);
    if (!argument) {
      continue;
    }

    calls.push({
      callee,
      argument,
      literalSpecifier: readPythonStringLiteral(argument)
    });
  }

  return calls;
}

function readFirstPythonCallArgument(text: string, openParenIndex: number): string | undefined {
  let quote: "\"" | "'" | undefined;
  let escaped = false;
  let depth = 0;
  const start = openParenIndex + 1;

  for (let index = start; index < text.length; index += 1) {
    const char = text[index];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      continue;
    }

    if ((char === "\"" || char === "'") && !quote) {
      quote = char;
      continue;
    }

    if (char === quote) {
      quote = undefined;
      continue;
    }

    if (quote) {
      continue;
    }

    if (char === "(" || char === "[" || char === "{") {
      depth += 1;
      continue;
    }

    if (char === ")" || char === "]" || char === "}") {
      if (depth === 0) {
        return text.slice(start, index).trim();
      }
      depth -= 1;
      continue;
    }

    if (char === "," && depth === 0) {
      return text.slice(start, index).trim();
    }
  }

  return undefined;
}

function readPythonStringLiteral(value: string): string | undefined {
  const match = value.trim().match(/^([rRuUbB]*)?(['"])([\s\S]*)\2$/);
  if (!match) {
    return undefined;
  }

  const prefix = match[1] ?? "";
  if (/[fF]/.test(prefix)) {
    return undefined;
  }

  return match[3] ?? "";
}

function splitPythonAliasList(value: string): PythonImportAlias[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map((item) => {
      const aliasMatch = item.match(/^([A-Za-z_][A-Za-z0-9_.]*|\*)\s+as\s+([A-Za-z_][A-Za-z0-9_]*)$/);
      if (aliasMatch) {
        return {
          name: aliasMatch[1] ?? "",
          alias: aliasMatch[2]
        };
      }

      return { name: item };
    })
    .filter((alias) => alias.name === "*" || isPythonModuleSpecifier(alias.name));
}

function stripPythonImportListParens(value: string): string {
  const trimmed = value.trim();
  return trimmed.startsWith("(") && trimmed.endsWith(")")
    ? trimmed.slice(1, -1).trim()
    : trimmed;
}

function appendPythonImportName(module: string, importedName: string): string {
  if (/^\.+$/.test(module)) {
    return `${module}${importedName}`;
  }

  return `${module}.${importedName}`;
}

function pythonImportAliasBinding(alias: PythonImportAlias): ImportBinding {
  return {
    localName: alias.alias ?? alias.name.split(".")[0] ?? alias.name,
    importedName: alias.name
  };
}

function pythonFromImportAliasBinding(alias: PythonImportAlias): ImportBinding {
  return {
    localName: alias.alias ?? alias.name,
    importedName: alias.name
  };
}

function isPythonModuleSpecifier(value: string): boolean {
  return /^(\.*[A-Za-z_][A-Za-z0-9_]*)(\.[A-Za-z_][A-Za-z0-9_]*)*$/.test(value) || /^\.+$/.test(value);
}

function readPythonFunctionName(text: string): string | undefined {
  return text.match(/^(?:async\s+)?def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/)?.[1];
}

function readPythonClassName(text: string): string | undefined {
  return text.match(/^class\s+([A-Za-z_][A-Za-z0-9_]*)\b/)?.[1];
}

function countLines(text: string): number {
  return text.length === 0 ? 0 : text.split(/\r\n|\r|\n/).length;
}

function formatExpressionPreview(value: string): string {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length <= 120 ? text : `${text.slice(0, 117)}...`;
}

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
    .map(([token, cluster]) => ({ token, count: cluster.count, samples: cluster.samples }))
    .sort((left, right) => right.count - left.count || left.token.localeCompare(right.token))
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
    if (token.length >= 3 && !pythonNameClusterStopTokens.has(token)) {
      uniqueTokens.add(token);
    }
  }

  return [...uniqueTokens];
}

const pythonNameClusterStopTokens = new Set([
  "add",
  "api",
  "app",
  "build",
  "class",
  "create",
  "data",
  "default",
  "from",
  "get",
  "handle",
  "init",
  "item",
  "main",
  "make",
  "module",
  "self",
  "set",
  "test",
  "type",
  "value",
  "with"
]);
