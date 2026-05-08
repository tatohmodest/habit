export const SAVINGS_ACCESS_COOKIE = "savings_access";

export function accessCookieValue(userId: string) {
  return `ok:${userId}`;
}

