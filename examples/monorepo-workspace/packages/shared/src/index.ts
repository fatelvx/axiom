import { normalizeLabel } from "./internal/normalize";

export function formatLabel(value: string): string {
  return normalizeLabel(value).toUpperCase();
}
