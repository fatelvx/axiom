import { normalizeUserName, type UserRecord } from "../../domain";

export function readUserRecord(): UserRecord {
  return {
    id: "user_1",
    name: normalizeUserName("Ada")
  };
}
