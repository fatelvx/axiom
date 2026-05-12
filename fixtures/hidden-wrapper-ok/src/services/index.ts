import { issueServiceToken } from "./internal/token";

export function issuePublicToken(): string {
  return issueServiceToken();
}
