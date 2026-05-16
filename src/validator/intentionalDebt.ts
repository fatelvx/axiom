import path from "node:path";
import type {
  AxiomSpec,
  SuppressedViolation,
  SuppressionInfo,
  SuppressionRule,
  Violation,
  ViolationCode
} from "../axi/types.js";
import { globToRegExp, normalizePathForMatch } from "./glob.js";

const suppressibleCodes = new Set<ViolationCode>([
  "forbidden_dependency",
  "hidden_reexport",
  "hidden_import",
  "layer_breach",
  "undeclared_dependency",
  "unexposed_import"
]);
const expiringSuppressionWarningDays = 30;

export interface IntentionalDebtOptions {
  root?: string;
  today?: string;
  intentionalViolationExpiryWarningDays?: number;
}

// Owns visible intentional-debt lifecycle behavior; hard validation remains defined by observed violations.
export function validateSuppressionRules(spec: AxiomSpec, options: IntentionalDebtOptions = {}): Violation[] {
  const violations: Violation[] = [];
  const moduleNames = new Set(spec.modules.map((module) => module.name));

  for (const module of spec.modules) {
    for (const suppression of module.suppressions) {
      if (!suppressibleCodes.has(suppression.code as ViolationCode)) {
        violations.push({
          code: "invalid_suppression",
          message: `${module.name} accepts unsupported violation code ${suppression.code}.`,
          location: suppression.location,
          details: {
            module: module.name,
            suppressedCode: suppression.code,
            suppressibleCodes: [...suppressibleCodes].sort(),
            suggestion: "Use intentional violations only for observed dependency and visibility violations."
          }
        });
      }

      if (!moduleNames.has(suppression.target.name)) {
        violations.push({
          code: "unknown_module",
          message: `${module.name} accepts a violation to unknown module ${suppression.target.name}.`,
          location: suppression.target.location,
          details: {
            module: module.name,
            target: suppression.target.name,
            suggestion: `Declare module ${suppression.target.name}, or remove the intentional violation from module ${module.name}.`
          }
        });
      }

      if (!isValidIsoDate(suppression.expiresOn) || suppression.reason.trim().length === 0) {
        violations.push({
          code: "invalid_suppression",
          message: `${module.name} has an invalid intentional violation for ${suppression.target.name}.`,
          location: suppression.location,
          details: {
            module: module.name,
            target: suppression.target.name,
            suppressedCode: suppression.code,
            expiresOn: suppression.expiresOn,
            reason: suppression.reason,
            suggestion: 'Use a real YYYY-MM-DD date and a non-empty because "reason".'
          }
        });
        continue;
      }

      if (isExpiredDate(suppression.expiresOn, options.today)) {
        violations.push({
          code: "expired_suppression",
          message: `${module.name} has an expired intentional violation for ${suppression.target.name}.`,
          location: suppression.location,
          details: {
            module: module.name,
            target: suppression.target.name,
            suppressedCode: suppression.code,
            expiresOn: suppression.expiresOn,
            reason: suppression.reason,
            suggestion: "Remove the intentional violation if the architecture debt is fixed, or extend it with a fresh reason."
          }
        });
      }
    }
  }

  return violations;
}

export function applySuppressions(
  spec: AxiomSpec,
  violations: Violation[],
  options: IntentionalDebtOptions = {}
): { violations: Violation[]; suppressedViolations: SuppressedViolation[] } {
  const remainingViolations: Violation[] = [];
  const suppressedViolations: SuppressedViolation[] = [];
  const modulesByName = new Map(spec.modules.map((module) => [module.name, module]));

  for (const violation of violations) {
    const suppression = findActiveSuppression(modulesByName, violation, options);

    if (!suppression) {
      remainingViolations.push(violation);
      continue;
    }

    suppressedViolations.push({
      violation,
      suppression
    });
  }

  return {
    violations: remainingViolations,
    suppressedViolations
  };
}

export function findUnusedSuppressions(
  spec: AxiomSpec,
  suppressedViolations: SuppressedViolation[],
  options: IntentionalDebtOptions = {}
): Violation[] {
  const usedSuppressionLocations = new Set(
    suppressedViolations.map((suppressedViolation) => locationKey(suppressedViolation.suppression.location))
  );
  const knownModules = new Set(spec.modules.map((module) => module.name));
  const warnings: Violation[] = [];

  for (const module of spec.modules) {
    for (const suppression of module.suppressions) {
      if (
        !isActiveValidSuppression(suppression, knownModules, options) ||
        usedSuppressionLocations.has(locationKey(suppression.location))
      ) {
        continue;
      }

      warnings.push({
        code: "unused_suppression",
        message: `${module.name} has an unused intentional violation for ${suppression.target.name}.`,
        location: suppression.location,
        details: {
          module: module.name,
          target: suppression.target.name,
          suppressedCode: suppression.code,
          expiresOn: suppression.expiresOn,
          ...(suppression.pathScope ? { pathScope: suppression.pathScope.pattern } : {}),
          reason: suppression.reason,
          rule: formatSuppressionRule(module.name, suppression),
          ruleLocation: suppression.location,
          suggestion:
            "Remove the intentional violation if the architecture debt is gone, or keep it only while a matching violation is expected."
        }
      });
    }
  }

  return warnings;
}

export function findExpiringSuppressions(
  suppressedViolations: SuppressedViolation[],
  options: IntentionalDebtOptions = {}
): Violation[] {
  const warnings: Violation[] = [];
  const seenLocations = new Set<string>();

  for (const suppressedViolation of suppressedViolations) {
    const suppression = suppressedViolation.suppression;
    const key = locationKey(suppression.location);
    if (seenLocations.has(key)) {
      continue;
    }
    seenLocations.add(key);

    const daysUntilExpiration = daysUntilDate(suppression.expiresOn, options.today);
    if (
      daysUntilExpiration === undefined ||
      daysUntilExpiration < 0 ||
      daysUntilExpiration > (options.intentionalViolationExpiryWarningDays ?? expiringSuppressionWarningDays)
    ) {
      continue;
    }

    warnings.push({
      code: "expiring_suppression",
      message: `${suppression.fromModule} has an intentional violation to ${suppression.toModule} that expires ${formatExpirationDistance(daysUntilExpiration)}.`,
      location: suppression.location,
      details: {
        module: suppression.fromModule,
        target: suppression.toModule,
        suppressedCode: suppression.code,
        expiresOn: suppression.expiresOn,
        daysUntilExpiration,
        ...(suppression.pathScope ? { pathScope: suppression.pathScope } : {}),
        reason: suppression.reason,
        rule: formatSuppressionInfoRule(suppression),
        ruleLocation: suppression.location,
        suggestion:
          "Review this intentional violation before it expires; remove it if the debt is fixed, or extend it with a fresh reason if the debt remains."
      }
    });
  }

  return warnings;
}

function findActiveSuppression(
  modulesByName: Map<string, AxiomSpec["modules"][number]>,
  violation: Violation,
  options: IntentionalDebtOptions
): SuppressionInfo | undefined {
  if (!suppressibleCodes.has(violation.code)) {
    return undefined;
  }

  const fromModule = readString(violation.details?.fromModule);
  const toModule = readString(violation.details?.toModule);
  if (!fromModule || !toModule) {
    return undefined;
  }

  const module = modulesByName.get(fromModule);
  if (!module) {
    return undefined;
  }

  const rule = module.suppressions.find(
    (suppression) =>
      suppression.code === violation.code &&
      suppression.target.name === toModule &&
      suppression.reason.trim().length > 0 &&
      isValidIsoDate(suppression.expiresOn) &&
      !isExpiredDate(suppression.expiresOn, options.today) &&
      suppressionMatchesViolationScope(suppression, violation, options.root)
  );

  if (!rule) {
    return undefined;
  }

  return toSuppressionInfo(fromModule, toModule, violation.code, rule);
}

function toSuppressionInfo(
  fromModule: string,
  toModule: string,
  code: ViolationCode,
  rule: SuppressionRule
): SuppressionInfo {
  return {
    fromModule,
    toModule,
    code,
    ...(rule.pathScope ? { pathScope: rule.pathScope.pattern } : {}),
    expiresOn: rule.expiresOn,
    reason: rule.reason,
    location: rule.location
  };
}

function suppressionMatchesViolationScope(
  suppression: SuppressionRule,
  violation: Violation,
  root: string | undefined
): boolean {
  if (!suppression.pathScope) {
    return true;
  }

  if (!root || !violation.location) {
    return false;
  }

  return pathRuleMatches(root, violation.location.filePath, suppression.pathScope);
}

function formatSuppressionInfoRule(suppression: SuppressionInfo): string {
  return `${suppression.fromModule} accepts ${suppression.code} to ${suppression.toModule}${formatPathScopeText(
    suppression.pathScope
  )} until ${suppression.expiresOn}`;
}

function formatSuppressionRule(moduleName: string, suppression: SuppressionRule): string {
  return `${moduleName} accepts ${suppression.code} to ${suppression.target.name}${formatPathScopeText(
    suppression.pathScope?.pattern
  )} until ${suppression.expiresOn}`;
}

function formatPathScopeText(pathScope: string | undefined): string {
  return pathScope ? ` at "${pathScope}"` : "";
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function isActiveValidSuppression(
  suppression: SuppressionRule,
  knownModules: Set<string>,
  options: IntentionalDebtOptions
): boolean {
  return (
    suppressibleCodes.has(suppression.code as ViolationCode) &&
    knownModules.has(suppression.target.name) &&
    suppression.reason.trim().length > 0 &&
    isValidIsoDate(suppression.expiresOn) &&
    !isExpiredDate(suppression.expiresOn, options.today)
  );
}

function locationKey(location: { filePath: string; line: number }): string {
  return `${path.resolve(location.filePath)}:${location.line}`;
}

function isValidIsoDate(value: string): boolean {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function isExpiredDate(value: string, today?: string): boolean {
  return isValidIsoDate(value) && value < resolveTodayIsoDate(today);
}

function daysUntilDate(value: string, today?: string): number | undefined {
  const todayDate = parseIsoDate(resolveTodayIsoDate(today));
  const targetDate = parseIsoDate(value);
  if (!todayDate || !targetDate) {
    return undefined;
  }

  const todayMs = Date.UTC(todayDate.year, todayDate.month - 1, todayDate.day);
  const targetMs = Date.UTC(targetDate.year, targetDate.month - 1, targetDate.day);
  return Math.round((targetMs - todayMs) / (24 * 60 * 60 * 1000));
}

function formatExpirationDistance(daysUntilExpiration: number): string {
  if (daysUntilExpiration === 0) {
    return "today";
  }

  if (daysUntilExpiration === 1) {
    return "in 1 day";
  }

  return `in ${daysUntilExpiration} days`;
}

function resolveTodayIsoDate(today?: string): string {
  return today && isValidIsoDate(today) ? today : todayIsoDate();
}

function parseIsoDate(value: string): { year: number; month: number; day: number } | undefined {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return undefined;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  return { year, month, day };
}

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function pathRuleMatches(root: string, filePath: string, rule: { pattern: string }): boolean {
  return globToRegExp(rule.pattern).test(relativePath(root, filePath));
}

function relativePath(root: string, filePath: string): string {
  return normalizePathForMatch(path.relative(root, filePath));
}
