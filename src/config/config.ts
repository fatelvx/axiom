import fs from "node:fs";
import path from "node:path";

export interface AxiomConfig {
  include?: string[];
  exclude?: string[];
  specs?: string[];
}

export interface LoadedAxiomConfig {
  filePath?: string;
  include: string[];
  exclude: string[];
  specs: string[];
}

export const defaultSpecPatterns = ["axiom/**/*.axi", "*.axi"];

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
    specs: config.specs ?? [...defaultSpecPatterns]
  };
}

function defaultConfig(): LoadedAxiomConfig {
  return {
    include: [],
    exclude: [],
    specs: [...defaultSpecPatterns]
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
    specs: readOptionalStringArray(filePath, rawConfig, "specs")
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
