import { readServiceStatus } from "../services/internal/agentLoop";

export function renderLegacyServiceBadge(): string {
  return readServiceStatus();
}
