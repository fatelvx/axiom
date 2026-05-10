export interface User {
  id: string;
  name: string;
}

export function formatUserName(user: User): string {
  return user.name.trim();
}
