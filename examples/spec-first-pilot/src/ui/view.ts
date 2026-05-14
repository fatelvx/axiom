import { getDashboardUser } from "../application";

export function renderDashboard(): string {
  const user = getDashboardUser();
  return `Hello ${user.name}`;
}
