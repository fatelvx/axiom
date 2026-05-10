import { getDashboardTitle } from "../services";
import { buildDashboardModel } from "../services/feature";
import { issueServiceToken } from "../services/internal/token";

export function renderDashboard(): string {
  const user = { id: "u_1", name: "Ada" };
  const title = getDashboardTitle(user);
  const model = buildDashboardModel(user);
  const token = issueServiceToken();

  return `${title} / ${model.title} / ${token}`;
}
