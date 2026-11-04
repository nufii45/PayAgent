// Guest sessions. Each browser gets a random, unguessable workspace id in an httpOnly cookie.
// There are no accounts: whoever holds the cookie is the workspace's owner, so the id must never be shown in URLs or logs.
// Edge-safe (used by the middleware), so no Node or database imports here.

export const GUEST_COOKIE = "pa_ws";
/** Set by the middleware on the request when it has just issued a new workspace id. */
export const NEW_WORKSPACE_HEADER = "x-pa-new-workspace";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export function isWorkspaceId(value: string | undefined | null): value is string {
  return !!value && UUID.test(value);
}

export function retentionDays(env: Record<string, string | undefined> = process.env) {
  const n = Number(env.GUEST_RETENTION_DAYS);
  return Number.isInteger(n) && n >= 1 && n <= 365 ? n : 7;
}

export function guestCookieOptions(env: Record<string, string | undefined> = process.env) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    // Refreshed on every visit, so it lasts as long as the workspace's retention period after the last visit.
    maxAge: retentionDays(env) * 86_400,
  };
}
