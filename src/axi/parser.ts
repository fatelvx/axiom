import type { AxiomModule, LayerOrder, SourceLocation, Violation } from "./types.js";

interface ParseResult {
  modules: AxiomModule[];
  layerOrders: LayerOrder[];
  violations: Violation[];
}

const identifierPattern = /^[A-Za-z][A-Za-z0-9_]*$/;

export function parseAxiomText(filePath: string, text: string): ParseResult {
  const modules: AxiomModule[] = [];
  const layerOrders: LayerOrder[] = [];
  const violations: Violation[] = [];
  let current: AxiomModule | undefined;

  const lines = text.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const rawLine = lines[index] ?? "";
    const line = stripComment(rawLine).trim();

    if (line.length === 0) {
      continue;
    }

    const location: SourceLocation = { filePath, line: lineNumber };

    const moduleMatch = line.match(/^module\s+(.+)$/);
    if (moduleMatch) {
      const name = moduleMatch[1]?.trim() ?? "";
      if (!isIdentifier(name)) {
        violations.push({
          code: "parse_error",
          message: `Invalid module name '${name}'.`,
          location
        });
        current = undefined;
        continue;
      }

      current = {
        name,
        location,
        paths: [],
        pathLocations: [],
        depends: [],
        forbidsModules: [],
        exposes: [],
        hides: [],
        suppressions: [],
        forbidsCapabilities: [],
        requires: []
      };
      modules.push(current);
      continue;
    }

    const layerOrderMatch = line.match(/^layers\s+(.+)$/);
    if (layerOrderMatch) {
      const layers = parseLayerOrder(layerOrderMatch[1]?.trim() ?? "", location, violations);

      if (layers.length > 0) {
        layerOrders.push({ layers, location });
      }
      continue;
    }

    if (!current) {
      violations.push({
        code: "parse_error",
        message: "Statement appears before a module declaration.",
        location
      });
      continue;
    }

    const pathMatch = line.match(/^path\s+"([^"]+)"$/);
    if (pathMatch) {
      current.paths.push(pathMatch[1] ?? "");
      current.pathLocations.push(location);
      continue;
    }

    const exposesMatch = line.match(/^exposes\s+"([^"]+)"$/);
    if (exposesMatch) {
      current.exposes.push({ pattern: exposesMatch[1] ?? "", location });
      continue;
    }

    const hidesMatch = line.match(/^hides\s+"([^"]+)"$/);
    if (hidesMatch) {
      current.hides.push({ pattern: hidesMatch[1] ?? "", location });
      continue;
    }

    const suppressionMatch = line.match(
      /^suppresses\s+([A-Za-z][A-Za-z0-9_]*)\s+to\s+([A-Za-z][A-Za-z0-9_]*)\s+until\s+(\d{4}-\d{2}-\d{2})\s+because\s+"([^"]*)"$/u
    );
    if (suppressionMatch) {
      current.suppressions.push({
        code: suppressionMatch[1] ?? "",
        target: {
          name: suppressionMatch[2] ?? "",
          location
        },
        expiresOn: suppressionMatch[3] ?? "",
        reason: suppressionMatch[4] ?? "",
        location
      });
      continue;
    }

    if (line.startsWith("suppresses ")) {
      violations.push({
        code: "parse_error",
        message:
          'Invalid suppression statement. Use: suppresses <violation_code> to <Module> until <YYYY-MM-DD> because "<reason>".',
        location
      });
      continue;
    }

    const purposeMatch = line.match(/^purpose\s+"([^"]*)"$/);
    if (purposeMatch) {
      current.purpose = purposeMatch[1] ?? "";
      current.purposeLocation = location;
      continue;
    }

    const layerMatch = line.match(/^layer\s+(.+)$/);
    if (layerMatch) {
      const layer = layerMatch[1]?.trim() ?? "";
      if (!isIdentifier(layer)) {
        violations.push({
          code: "parse_error",
          message: `Invalid layer name '${layer}'.`,
          location
        });
        continue;
      }
      current.layer = layer;
      current.layerLocation = location;
      continue;
    }

    const dependsMatch = line.match(/^depends(?:\s+on)?\s+(.+)$/);
    if (dependsMatch) {
      addIdentifierRef(current.depends, dependsMatch[1]?.trim() ?? "", location, violations, "dependency");
      continue;
    }

    const forbidsModuleMatch = line.match(/^forbids\s+module\s+(.+)$/);
    if (forbidsModuleMatch) {
      addIdentifierRef(
        current.forbidsModules,
        forbidsModuleMatch[1]?.trim() ?? "",
        location,
        violations,
        "forbidden module"
      );
      continue;
    }

    const forbidsCapabilityMatch = line.match(/^forbids\s+capability\s+(.+)$/);
    if (forbidsCapabilityMatch) {
      addIdentifierRef(
        current.forbidsCapabilities,
        forbidsCapabilityMatch[1]?.trim() ?? "",
        location,
        violations,
        "forbidden capability"
      );
      continue;
    }

    const requiresMatch = line.match(/^requires\s+(.+)$/);
    if (requiresMatch) {
      addIdentifierRef(current.requires, requiresMatch[1]?.trim() ?? "", location, violations, "requirement");
      continue;
    }

    violations.push({
      code: "parse_error",
      message: `Unknown .axi statement '${line}'.`,
      location
    });
  }

  return { modules, layerOrders, violations };
}

function parseLayerOrder(
  value: string,
  location: SourceLocation,
  violations: Violation[]
): { name: string; location: SourceLocation }[] {
  const tokens = value.split(/\s+/).filter((token) => token !== "->");
  const seen = new Set<string>();

  if (tokens.length < 2) {
    violations.push({
      code: "parse_error",
      message: "Layer order must contain at least two layers.",
      location
    });
    return [];
  }

  const layers: { name: string; location: SourceLocation }[] = [];

  for (const token of tokens) {
    if (!isIdentifier(token)) {
      violations.push({
        code: "parse_error",
        message: `Invalid layer name '${token}'.`,
        location
      });
      continue;
    }

    if (seen.has(token)) {
      violations.push({
        code: "parse_error",
        message: `Duplicate layer '${token}' in layer order.`,
        location
      });
      continue;
    }

    seen.add(token);
    layers.push({ name: token, location });
  }

  return layers;
}

function addIdentifierRef(
  refs: { name: string; location: SourceLocation }[],
  name: string,
  location: SourceLocation,
  violations: Violation[],
  label: string
): void {
  if (!isIdentifier(name)) {
    violations.push({
      code: "parse_error",
      message: `Invalid ${label} name '${name}'.`,
      location
    });
    return;
  }

  refs.push({ name, location });
}

function isIdentifier(value: string): boolean {
  return identifierPattern.test(value);
}

function stripComment(line: string): string {
  let inQuote = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const previous = index > 0 ? line[index - 1] : undefined;

    if (char === '"' && previous !== "\\") {
      inQuote = !inQuote;
      continue;
    }

    if (char === "#" && !inQuote) {
      return line.slice(0, index);
    }
  }

  return line;
}
