import fs from "node:fs";
import path from "node:path";

export interface AxiomConfig {
  include?: string[];
  exclude?: string[];
  specs?: string[];
  tsconfig?: string;
  intentionalViolationExpiryWarningDays?: number;
  warnPublicApiSurface?: boolean;
  warnCouplingConcentration?: boolean;
}

export interface LoadedAxiomConfig {
  filePath?: string;
  include: string[];
  exclude: string[];
  specs: string[];
  tsconfig?: string;
  intentionalViolationExpiryWarningDays?: number;
  warnPublicApiSurface: boolean;
  warnCouplingConcentration: boolean;
}

export const defaultSpecPatterns = [
  "axiom/**/*.axi",
  "*.axi",
  "apps/*/axiom/**/*.axi",
  "apps/*/*.axi",
  "packages/*/axiom/**/*.axi",
  "packages/*/*.axi"
];

export function loadConfig(root: string, configPath?: string): LoadedAxiomConfig {
  const resolvedRoot = path.resolve(root);
  const resolvedConfigPath = configPath ? resolveConfigPath(resolvedRoot, configPath) : path.join(resolvedRoot, "axiom.config.json");

  if (!fs.existsSync(resolvedConfigPath)) {
    if (configPath) {
      throw new Error(`Axiom config not found: ${resolvedConfigPath}`);
    }

    return defaultConfig();
  }

  const config = parseConfigFile(resolvedConfigPath);

  return {
    filePath: resolvedConfigPath,
    include: config.include ?? [],
    exclude: config.exclude ?? [],
    specs: config.specs ?? [...defaultSpecPatterns],
    warnPublicApiSurface: config.warnPublicApiSurface ?? false,
    warnCouplingConcentration: config.warnCouplingConcentration ?? false,
    ...(config.tsconfig ? { tsconfig: config.tsconfig } : {}),
    ...(config.intentionalViolationExpiryWarningDays === undefined
      ? {}
      : { intentionalViolationExpiryWarningDays: config.intentionalViolationExpiryWarningDays })
  };
}

function defaultConfig(): LoadedAxiomConfig {
  return {
    include: [],
    exclude: [],
    specs: [...defaultSpecPatterns],
    warnPublicApiSurface: false,
    warnCouplingConcentration: false
  };
}

function resolveConfigPath(root: string, configPath: string): string {
  return path.isAbsolute(configPath) ? configPath : path.resolve(root, configPath);
}

function parseConfigFile(filePath: string): AxiomConfig {
  let parsed: unknown;

  try {
    parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to parse Axiom config ${filePath}: ${detail}`);
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`Axiom config must be a JSON object: ${filePath}`);
  }

  const rawConfig = parsed as Record<string, unknown>;

  return {
    include: readOptionalStringArray(filePath, rawConfig, "include"),
    exclude: readOptionalStringArray(filePath, rawConfig, "exclude"),
    specs: readOptionalStringArray(filePath, rawConfig, "specs"),
    tsconfig: readOptionalString(filePath, rawConfig, "tsconfig"),
    intentionalViolationExpiryWarningDays: readOptionalNonNegativeInteger(
      filePath,
      rawConfig,
      "intentionalViolationExpiryWarningDays"
    ),
    warnPublicApiSurface: readOptionalBoolean(filePath, rawConfig, "warnPublicApiSurface"),
    warnCouplingConcentration: readOptionalBoolean(filePath, rawConfig, "warnCouplingConcentration")
  };
}

function readOptionalStringArray(filePath: string, config: Record<string, unknown>, key: keyof AxiomConfig): string[] | undefined {
  const value = config[key];
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw new Error(`Axiom config '${key}' must be an array of strings: ${filePath}`);
  }

  return value;
}

function readOptionalString(filePath: string, config: Record<string, unknown>, key: keyof AxiomConfig): string | undefined {
  const value = config[key];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new Error(`Axiom config '${key}' must be a string: ${filePath}`);
  }

  return value;
}

function readOptionalNonNegativeInteger(
  filePath: string,
  config: Record<string, unknown>,
  key: keyof AxiomConfig
): number | undefined {
  const value = config[key];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error(`Axiom config '${key}' must be a non-negative integer: ${filePath}`);
  }

  return value;
}

function readOptionalBoolean(filePath: string, config: Record<string, unknown>, key: keyof AxiomConfig): boolean | undefined {
  const value = config[key];
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new Error(`Axiom config '${key}' must be a boolean: ${filePath}`);
  }

  return value;
}
