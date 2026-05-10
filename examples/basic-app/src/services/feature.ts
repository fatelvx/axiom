import { formatUserName, type User } from "../domain";

export function buildDashboardModel(user: User): { title: string } {
  return {
    title: `Internal model for ${formatUserName(user)}`
  };
}
