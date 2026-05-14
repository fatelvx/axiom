import fs from "node:fs";
import path from "node:path";

export interface ImportResolver {
  resolve(fromFile: string, specifier: string, options?: ImportResolveOptions): string | undefined;
}

export interface ImportResolverOptions {
  root: string;
  tsconfigPath?: string;
}

export interface ImportResolveOptions {
  allowDeclarationFiles?: boolean;
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

export interface PackageResolver {
  packagesByName: Map<string, PackageMetadata>;
  packagesByDirectory: PackageMetadata[];
}

export interface PackageMetadata {
  directory: string;
  name?: string;
  exports: PackageSubpathMapping[];
  imports: PackageSubpathMapping[];
}

interface PackageSubpathMapping {
  pattern: string;
  targets: string[];
  regexp: RegExp;
  prefixLength: number;
}

const extensionCandidates = [".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".vue"];
const declarationExtensionCandidates = [".d.ts", ".d.mts", ".d.cts"];
const sourceExtensionAlternates = new Map([
  [".js", [".ts", ".tsx"]],
  [".jsx", [".tsx"]],
  [".mjs", [".mts"]],
  [".cjs", [".cts"]]
]);
const packageConditionPreference = ["source", "development", "import", "module", "default", "require", "node", "browser", "types"];
const workspaceIgnoredDirectories = new Set([".git", "node_modules", "dist", "build", "coverage"]);

export function createImportResolver(options: ImportResolverOptions): ImportResolver {
  const root = path.resolve(options.root);
  const tsconfig = loadTsconfigResolver(root, options.tsconfigPath);
  const packageResolver = loadPackageResolver(root);

  return {
    resolve(fromFile: string, specifier: string, resolveOptions: ImportResolveOptions = {}): string | undefined {
      return resolveRelativeImport(fromFile, specifier, resolveOptions)
        ?? resolveTsconfigPath(tsconfig, specifier, resolveOptions)
        ?? resolvePackageSpecifier(packageResolver, fromFile, specifier, resolveOptions);
    }
  };
}

export function resolveRelativeImport(
  fromFile: string,
  specifier: string,
  options: ImportResolveOptions = {}
): string | undefined {
  if (!specifier.startsWith(".")) {
    return undefined;
  }

  return resolveFileCandidate(path.resolve(path.dirname(fromFile), specifier), options);
}

function resolveTsconfigPath(
  tsconfig: TsconfigResolver | undefined,
  specifier: string,
  options: ImportResolveOptions
): string | undefined {
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
      const resolved = resolveFileCandidate(path.resolve(tsconfig.baseUrl, substituted), options);
      if (resolved) {
        return resolved;
      }
    }
  }

  return undefined;
}

function resolvePackageSpecifier(
  packageResolver: PackageResolver,
  fromFile: string,
  specifier: string,
  options: ImportResolveOptions
): string | undefined {
  if (specifier.startsWith("#")) {
    const owner = findNearestPackage(packageResolver, fromFile);
    return owner ? resolvePackageSubpath(owner.directory, owner.imports, specifier, options) : undefined;
  }

  const parsed = parsePackageSpecifier(specifier);
  if (!parsed) {
    return undefined;
  }

  const packageMetadata = packageResolver.packagesByName.get(parsed.packageName);
  return packageMetadata
    ? resolvePackageSubpath(packageMetadata.directory, packageMetadata.exports, parsed.subpath, options)
    : undefined;
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

export function loadPackageResolver(root: string): PackageResolver {
  const packagesByDirectory = new Map<string, PackageMetadata>();
  const rootPackageJson = readJsonFile(path.join(root, "package.json"));

  if (rootPackageJson) {
    addPackage(root, rootPackageJson);
  }

  const workspacePatterns = new Set([
    ...readPackageJsonWorkspacePatterns(rootPackageJson?.workspaces),
    ...readPnpmWorkspacePatterns(root)
  ]);

  for (const workspacePattern of workspacePatterns) {
    for (const workspaceDirectory of expandWorkspacePattern(root, workspacePattern)) {
      const packageJson = readJsonFile(path.join(workspaceDirectory, "package.json"));
      if (packageJson) {
        addPackage(workspaceDirectory, packageJson);
      }
    }
  }

  const packages = [...packagesByDirectory.values()];
  const packagesByName = new Map<string, PackageMetadata>();
  for (const packageMetadata of packages) {
    if (packageMetadata.name && !packagesByName.has(packageMetadata.name)) {
      packagesByName.set(packageMetadata.name, packageMetadata);
    }
  }

  return {
    packagesByName,
    packagesByDirectory: packages.sort((left, right) => right.directory.length - left.directory.length)
  };

  function addPackage(directory: string, packageJson: Record<string, unknown>): void {
    const resolvedDirectory = path.resolve(directory);
    if (packagesByDirectory.has(resolvedDirectory)) {
      return;
    }

    const metadata: PackageMetadata = {
      directory: resolvedDirectory,
      name: typeof packageJson.name === "string" ? packageJson.name : undefined,
      exports: compilePackageExports(packageJson.exports, packageJson.main),
      imports: compilePackageImports(packageJson.imports)
    };

    if (metadata.name || metadata.exports.length > 0 || metadata.imports.length > 0) {
      packagesByDirectory.set(resolvedDirectory, metadata);
    }
  }
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

function readJsonFile(filePath: string): Record<string, unknown> | undefined {
  if (!fs.existsSync(filePath)) {
    return undefined;
  }

  try {
    return parseJsoncFile(filePath);
  } catch {
    return undefined;
  }
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

function compilePackageExports(value: unknown, mainValue?: unknown): PackageSubpathMapping[] {
  if (typeof value === "string" || Array.isArray(value)) {
    return compileSubpathMappings([[".", value]]);
  }

  const object = readObject(value);
  const entries = Object.entries(object);
  if (entries.length === 0) {
    return compilePackageMain(mainValue);
  }

  const hasSubpathKeys = entries.some(([key]) => key === "." || key.startsWith("./"));
  if (!hasSubpathKeys) {
    return compileSubpathMappings([[".", value]]);
  }

  return compileSubpathMappings(entries.filter(([key]) => key === "." || key.startsWith("./")));
}

function compilePackageMain(value: unknown): PackageSubpathMapping[] {
  if (typeof value !== "string" || value.length === 0) {
    return [];
  }

  const target = value.startsWith("./") ? value : `./${value}`;
  return compileSubpathMappings([[".", target]]);
}

function compilePackageImports(value: unknown): PackageSubpathMapping[] {
  return compileSubpathMappings(Object.entries(readObject(value)).filter(([key]) => key.startsWith("#")));
}

function compileSubpathMappings(entries: [string, unknown][]): PackageSubpathMapping[] {
  return entries
    .map(([pattern, target]) => {
      const targets = collectPackageTargets(target);
      return targets.length > 0
        ? {
            pattern,
            targets,
            regexp: pathPatternToRegExp(pattern),
            prefixLength: pattern.split("*", 1)[0]?.length ?? pattern.length
          }
        : undefined;
    })
    .filter((mapping): mapping is PackageSubpathMapping => Boolean(mapping))
    .sort((left, right) => right.prefixLength - left.prefixLength || left.pattern.localeCompare(right.pattern));
}

function collectPackageTargets(value: unknown): string[] {
  if (typeof value === "string") {
    return value.startsWith("./") ? [value] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectPackageTargets(item));
  }

  const object = readObject(value);
  const keys = Object.keys(object);
  if (keys.length === 0) {
    return [];
  }

  return orderConditionKeys(keys).flatMap((key) => collectPackageTargets(object[key]));
}

function orderConditionKeys(keys: string[]): string[] {
  const preferred = packageConditionPreference.filter((condition) => keys.includes(condition));
  const rest = keys.filter((key) => !packageConditionPreference.includes(key)).sort();
  return [...preferred, ...rest];
}

function resolvePackageSubpath(
  directory: string,
  mappings: PackageSubpathMapping[],
  subpath: string,
  options: ImportResolveOptions
): string | undefined {
  for (const mapping of mappings) {
    const match = subpath.match(mapping.regexp);
    if (!match) {
      continue;
    }

    const captures = match.slice(1);
    for (const target of mapping.targets) {
      const substituted = substituteCaptures(target, captures);
      const basePath = path.resolve(directory, substituted);
      if (!isInsideDirectory(basePath, directory)) {
        continue;
      }

      const resolved = resolveFileCandidate(basePath, options)
        ?? resolvePackageSourceMirror(directory, basePath, options);
      if (resolved) {
        return resolved;
      }
    }
  }

  return undefined;
}

function resolvePackageSourceMirror(
  directory: string,
  basePath: string,
  options: ImportResolveOptions
): string | undefined {
  const relative = normalizePackagePath(path.relative(directory, basePath));

  for (const outputDirectory of ["lib", "dist"]) {
    if (relative !== outputDirectory && !relative.startsWith(`${outputDirectory}/`)) {
      continue;
    }

    const sourceRelative = relative === outputDirectory
      ? "src"
      : `src/${relative.slice(outputDirectory.length + 1)}`;
    const sourceBasePath = path.resolve(directory, sourceRelative);
    if (!isInsideDirectory(sourceBasePath, directory)) {
      continue;
    }

    const resolved = resolveFileCandidate(sourceBasePath, options);
    if (resolved) {
      return resolved;
    }
  }

  return undefined;
}

function normalizePackagePath(value: string): string {
  return value.replace(/\\/g, "/");
}

function parsePackageSpecifier(specifier: string): { packageName: string; subpath: string } | undefined {
  if (specifier.startsWith(".") || specifier.startsWith("#") || path.isAbsolute(specifier)) {
    return undefined;
  }

  const segments = specifier.split("/");
  const first = segments[0];
  if (!first) {
    return undefined;
  }

  if (first.startsWith("@")) {
    const second = segments[1];
    if (!second) {
      return undefined;
    }

    const rest = segments.slice(2);
    return {
      packageName: `${first}/${second}`,
      subpath: rest.length > 0 ? `./${rest.join("/")}` : "."
    };
  }

  const rest = segments.slice(1);
  return {
    packageName: first,
    subpath: rest.length > 0 ? `./${rest.join("/")}` : "."
  };
}

function findNearestPackage(packageResolver: PackageResolver, filePath: string): PackageMetadata | undefined {
  const resolvedFilePath = path.resolve(filePath);
  return packageResolver.packagesByDirectory.find((packageMetadata) =>
    isInsideDirectory(resolvedFilePath, packageMetadata.directory)
  );
}

function readPackageJsonWorkspacePatterns(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && !item.startsWith("!"));
  }

  const packages = readObject(value).packages;
  return Array.isArray(packages)
    ? packages.filter((item): item is string => typeof item === "string" && !item.startsWith("!"))
    : [];
}

function readPnpmWorkspacePatterns(root: string): string[] {
  const workspacePath = path.join(root, "pnpm-workspace.yaml");
  if (!fs.existsSync(workspacePath)) {
    return [];
  }

  const lines = fs.readFileSync(workspacePath, "utf8").split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index] ?? "";
    const line = stripYamlComment(rawLine);
    const packagesMatch = line.match(/^(\s*)packages\s*:\s*(.*)$/);
    if (!packagesMatch) {
      continue;
    }

    const baseIndent = packagesMatch[1]?.length ?? 0;
    const inlineValue = packagesMatch[2]?.trim() ?? "";
    if (inlineValue.length > 0) {
      return readYamlStringList(inlineValue);
    }

    const patterns: string[] = [];
    for (let itemIndex = index + 1; itemIndex < lines.length; itemIndex += 1) {
      const itemRawLine = lines[itemIndex] ?? "";
      const itemLine = stripYamlComment(itemRawLine);
      if (itemLine.trim().length === 0) {
        continue;
      }

      const indent = itemLine.match(/^(\s*)/)?.[1]?.length ?? 0;
      if (indent <= baseIndent) {
        break;
      }

      const itemMatch = itemLine.trim().match(/^-\s+(.+)$/);
      if (!itemMatch) {
        continue;
      }

      const pattern = unquoteYamlScalar(itemMatch[1]?.trim() ?? "");
      if (pattern.length > 0 && !pattern.startsWith("!")) {
        patterns.push(pattern);
      }
    }

    return patterns;
  }

  return [];
}

function stripYamlComment(line: string): string {
  let inQuote: "\"" | "'" | undefined;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const previous = index > 0 ? line[index - 1] : undefined;

    if ((char === "\"" || char === "'") && previous !== "\\") {
      inQuote = inQuote === char ? undefined : inQuote ?? char;
      continue;
    }

    if (char === "#" && !inQuote) {
      return line.slice(0, index);
    }
  }

  return line;
}

function unquoteYamlScalar(value: string): string {
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

function readYamlStringList(value: string): string[] {
  const trimmed = value.trim();
  const rawItems = trimmed.startsWith("[") && trimmed.endsWith("]")
    ? splitYamlInlineSequence(trimmed.slice(1, -1))
    : [trimmed];

  return rawItems
    .map((item) => unquoteYamlScalar(item.trim()))
    .filter((item) => item.length > 0 && !item.startsWith("!"));
}

function splitYamlInlineSequence(value: string): string[] {
  const items: string[] = [];
  let current = "";
  let inQuote: "\"" | "'" | undefined;
  let escaped = false;

  for (const char of value) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === "\\" && inQuote === "\"") {
      current += char;
      escaped = true;
      continue;
    }

    if (char === "\"" || char === "'") {
      inQuote = inQuote === char ? undefined : inQuote ?? char;
      current += char;
      continue;
    }

    if (char === "," && !inQuote) {
      items.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  items.push(current);
  return items;
}

function expandWorkspacePattern(root: string, pattern: string): string[] {
  const normalized = pattern.replace(/\\/g, "/").replace(/\/package\.json$/, "").replace(/\/$/, "");
  if (!normalized) {
    return [];
  }

  return expandWorkspaceSegments(root, normalized.split("/").filter(Boolean), 0).filter((directory) =>
    fs.existsSync(path.join(directory, "package.json"))
  );
}

function expandWorkspaceSegments(currentDirectory: string, segments: string[], index: number): string[] {
  if (index >= segments.length) {
    return [currentDirectory];
  }

  const segment = segments[index] ?? "";
  if (segment === "**") {
    return [
      ...expandWorkspaceSegments(currentDirectory, segments, index + 1),
      ...readChildDirectories(currentDirectory).flatMap((directory) => expandWorkspaceSegments(directory, segments, index))
    ];
  }

  if (segment.includes("*")) {
    const regexp = new RegExp(`^${segment.split("*").map((part) => escapeRegExp(part)).join("[^/]+")}$`);
    return readChildDirectories(currentDirectory)
      .filter((directory) => regexp.test(path.basename(directory)))
      .flatMap((directory) => expandWorkspaceSegments(directory, segments, index + 1));
  }

  const nextDirectory = path.join(currentDirectory, segment);
  return fs.existsSync(nextDirectory) && fs.statSync(nextDirectory).isDirectory()
    ? expandWorkspaceSegments(nextDirectory, segments, index + 1)
    : [];
}

function readChildDirectories(directory: string): string[] {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs.readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !workspaceIgnoredDirectories.has(entry.name))
    .map((entry) => path.join(directory, entry.name));
}

function resolveFileCandidate(basePath: string, options: ImportResolveOptions = {}): string | undefined {
  for (const candidate of buildCandidates(basePath, options)) {
    const declarationAllowed = options.allowDeclarationFiles || !isDeclarationFile(candidate);
    if (declarationAllowed && fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return undefined;
}

function buildCandidates(basePath: string, options: ImportResolveOptions): string[] {
  const candidates = new Set<string>([basePath]);
  const parsed = path.parse(basePath);
  const sourceAlternates = sourceExtensionAlternates.get(parsed.ext);

  for (const alternateExtension of sourceAlternates ?? []) {
    candidates.add(path.join(parsed.dir, `${parsed.name}${alternateExtension}`));
  }

  for (const extension of extensionCandidates) {
    candidates.add(`${basePath}${extension}`);
  }

  if (options.allowDeclarationFiles) {
    for (const extension of declarationExtensionCandidates) {
      candidates.add(`${basePath}${extension}`);
    }
  }

  for (const extension of extensionCandidates) {
    candidates.add(path.join(basePath, `index${extension}`));
  }

  if (options.allowDeclarationFiles) {
    for (const extension of declarationExtensionCandidates) {
      candidates.add(path.join(basePath, `index${extension}`));
    }
  }

  return [...candidates];
}

function isDeclarationFile(filePath: string): boolean {
  return /\.d\.[cm]?ts$/.test(filePath);
}

function isInsideDirectory(filePath: string, directory: string): boolean {
  const relative = path.relative(directory, filePath);
  return relative === "" || Boolean(relative && !relative.startsWith("..") && !path.isAbsolute(relative));
}

function escapeRegExp(value: string): string {
  return value.replace(/[\\^$+?.()|{}[\]]/g, "\\$&");
}
