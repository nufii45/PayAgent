import { describe, expect, it } from "vitest";
import { guestCookieOptions, isWorkspaceId, retentionDays } from "./session";

describe("guest session", () => {
  it("accepts only random v4 uuids as workspace ids", () => {
    expect(isWorkspaceId(crypto.randomUUID())).toBe(true);
    expect(isWorkspaceId("00000000-0000-0000-0000-000000000000")).toBe(false);
    expect(isWorkspaceId("1 or 1=1")).toBe(false);
    expect(isWorkspaceId(undefined)).toBe(false);
  });

  it("reads the retention period, defaulting to 7 days", () => {
    expect(retentionDays({})).toBe(7);
    expect(retentionDays({ GUEST_RETENTION_DAYS: "3" })).toBe(3);
    expect(retentionDays({ GUEST_RETENTION_DAYS: "0" })).toBe(7);
    expect(retentionDays({ GUEST_RETENTION_DAYS: "abc" })).toBe(7);
  });

  it("issues an httpOnly cookie that lasts the retention period", () => {
    const o = guestCookieOptions({ GUEST_RETENTION_DAYS: "2", NODE_ENV: "production" });
    expect(o).toMatchObject({ httpOnly: true, secure: true, sameSite: "lax", maxAge: 2 * 86_400 });
  });
});
