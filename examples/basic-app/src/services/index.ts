import { formatUserName, type User } from "../domain";

export function getDashboardTitle(user: User): string {
  return `Dashboard for ${formatUserName(user)}`;
}
