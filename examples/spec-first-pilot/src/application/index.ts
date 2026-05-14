import { readUserRecord } from "./internal/persistence";

export function getDashboardUser() {
  return readUserRecord();
}
