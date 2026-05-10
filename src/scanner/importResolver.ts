import fs from "node:fs";
import path from "node:path";

export interface ImportResolver {
  resolve(fromFile: string, specifier: string): string | undefined;
}

export interface ImportResolverOptions {
  root: string;
  tsconfigPath?: string;
}

interface TsconfigResolver {
  baseUrl: string;
  paths: PathMapping[];
}

interface PathMapping {
  pattern: string;
  targets: string[];
  regexp: RegExp;
  prefixLength: number;
}

const extensionCandidates = [".ts", ".tsx", ".js", ".jsx", ".mts", ".cts"];
const sourceExtensionAlternates = new Map([
  [".js", [".ts", ".tsx"]],
  [".jsx", [".tsx"]],
  [".mjs", [".mts"]],
  [".cjs", [".cts"]]
]);

export function createImportResolver(options: ImportResolverOptions): ImportResolver {
  const root = path.resolve(options.root);
  const tsconfig = loadTsconfigResolver(root, options.tsconfigPath);

  return {
    resolve(fromFile: string, specifier: string): string | undefined {
      return resolveRelativeImport(fromFile, specifier) ?? resolveTsconfigPath(tsconfig, specifier);
    }
  };
}

export function resolveRelativeImport(fromFile: string, specifier: string): string | undefined {
  if (!specifier.startsWith(".")) {
    return undefined;
  }

  return resolveFileCandidate(path.resolve(path.dirname(fromFile), specifier));
}

function resolveTsconfigPath(tsconfig: TsconfigResolver | undefined, specifier: string): string | undefined {
  if (!tsconfig || specifier.startsWith(".")) {
    return undefined;
  }

  for (const mapping of tsconfig.paths) {
    const match = specifier.match(mapping.regexp);
    if (!match) {
      continue;
    }

    const captures = match.slice(1);
    for (const target of mapping.targets) {
      const substituted = substituteCaptures(target, captures);
      const resolved = resolveFileCandidate(path.resolve(tsconfig.baseUrl, substituted));
      if (resolved) {
        return resolved;
      }
    }
  }

  return undefined;
}

function loadTsconfigResolver(root: string, configuredPath: string | undefined): TsconfigResolver | undefined {
  const tsconfigPath = configuredPath ? resolveConfigPath(root, configuredPath) : path.join(root, "tsconfig.json");
  if (!fs.existsSync(tsconfigPath)) {
    return undefined;
  }

  const config = loadTsconfigFile(tsconfigPath);
  const compilerOptions = readObject(config.compilerOptions);
  const rawPaths = readObject(compilerOptions.paths);
  const paths = Object.entries(rawPaths)
    .filter((entry): entry is [string, string[]] => Array.isArray(entry[1]) && entry[1].every((value) => typeof value === "string"))
    .map(([pattern, targets]) => ({
      pattern,
      targets,
      regexp: pathPatternToRegExp(pattern),
      prefixLength: pattern.split("*", 1)[0]?.length ?? pattern.length
    }))
    .sort((left, right) => right.prefixLength - left.prefixLength || left.pattern.localeCompare(right.pattern));

  if (paths.length === 0) {
    return undefined;
  }

  const tsconfigDirectory = path.dirname(tsconfigPath);
  const baseUrl = typeof compilerOptions.baseUrl === "string"
    ? path.resolve(tsconfigDirectory, compilerOptions.baseUrl)
    : tsconfigDirectory;

  return {
    baseUrl,
    paths
  };
}

function loadTsconfigFile(filePath: string): Record<string, unknown> {
  const config = parseJsoncFile(filePath);
  const extendsValue = config.extends;
  if (typeof extendsValue !== "string") {
    return config;
  }

  const parentPath = resolveExtendsPath(path.dirname(filePath), extendsValue);
  if (!parentPath || !fs.existsSync(parentPath)) {
    return config;
  }

  const parent = loadTsconfigFile(parentPath);
  return mergeTsconfig(parent, config);
}

function mergeTsconfig(parent: Record<string, unknown>, child: Record<string, unknown>): Record<string, unknown> {
  const parentCompilerOptions = readObject(parent.compilerOptions);
  const childCompilerOptions = readObject(child.compilerOptions);

  return {
    ...parent,
    ...child,
    compilerOptions: {
      ...parentCompilerOptions,
      ...childCompilerOptions
    }
  };
}

function resolveConfigPath(root: string, configPath: string): string {
  return path.isAbsolute(configPath) ? configPath : path.resolve(root, configPath);
}

function resolveExtendsPath(fromDirectory: string, value: string): string | undefined {
  if (!value.startsWith(".") && !path.isAbsolute(value)) {
    return undefined;
  }

  const resolved = path.resolve(fromDirectory, value);
  return path.extname(resolved) ? resolved : `${resolved}.json`;
}

function parseJsoncFile(filePath: string): Record<string, unknown> {
  const text = fs.readFileSync(filePath, "utf8");
  const json = stripTrailingCommas(stripJsonComments(text));
  const parsed = JSON.parse(json) as unknown;
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : {};
}

function stripJsonComments(text: string): string {
  let output = "";
  let inString = false;
  let escaped = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index] ?? "";
    const next = text[index + 1];

    if (inString) {
      output += char;
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === "\\") {
        escaped = true;
        continue;
      }
      if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      output += char;
      continue;
    }

    if (char === "/" && next === "/") {
      while (index < text.length && text[index] !== "\n") {
        output += " ";
        index += 1;
      }
      output += "\n";
      continue;
    }

    if (char === "/" && next === "*") {
      output += "  ";
      index += 2;
      while (index < text.length && !(text[index] === "*" && text[index + 1] === "/")) {
        output += text[index] === "\n" ? "\n" : " ";
        index += 1;
      }
      output += " ";
      index += 1;
      continue;
    }

    output += char;
  }

  return output;
}

function stripTrailingCommas(text: string): string {
  return text.replace(/,\s*([}\]])/g, "$1");
}

function readObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function pathPatternToRegExp(pattern: string): RegExp {
  const escaped = pattern
    .split("*")
    .map((part) => escapeRegExp(part))
    .join("(.+)");

  return new RegExp(`^${escaped}$`);
}

function substituteCaptures(target: string, captures: string[]): string {
  let index = 0;
  return target.replace(/\*/g, () => captures[index++] ?? "");
}

function resolveFileCandidate(basePath: string): string | undefined {
  for (const candidate of buildCandidates(basePath)) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return undefined;
}

function buildCandidates(basePath: string): string[] {
  const candidates = new Set<string>([basePath]);
  const parsed = path.parse(basePath);
  const sourceAlternates = sourceExtensionAlternates.get(parsed.ext);

  for (const alternateExtension of sourceAlternates ?? []) {
    candidates.add(path.join(parsed.dir, `${parsed.name}${alternateExtension}`));
  }

  for (const extension of extensionCandidates) {
    candidates.add(`${basePath}${extension}`);
  }

  for (const extension of extensionCandidates) {
    candidates.add(path.join(basePath, `index${extension}`));
  }

  return [...candidates];
}

function escapeRegExp(value: string): string {
  return value.replace(/[\\^$+?.()|{}[\]]/g, "\\$&");
}
