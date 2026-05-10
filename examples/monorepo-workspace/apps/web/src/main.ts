import { formatLabel } from "@example/shared";
import { normalizeLabel } from "@example/shared/internal/normalize";

export function render(): string {
  return `${formatLabel("Dashboard")} / ${normalizeLabel("Internal")}`;
}
