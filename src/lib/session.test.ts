import { describe, expect, it } from "vitest";
import { checkPassword, createSessionValue, verifySessionValue } from "./session";

describe("session", () => {
  it("accepts its own session and rejects tampered or expired ones", async () => {
    const now = 1_800_000_000_000;
    const { value } = await createSessionValue("hunter2", now);
    expect(await verifySessionValue("hunter2", value, now)).toBe(true);
    expect(await verifySessionValue("other", value, now)).toBe(false);
    expect(await verifySessionValue("hunter2", value.replace(/.$/, "x"), now)).toBe(false);
    expect(await verifySessionValue("hunter2", value, now + 8 * 86_400_000)).toBe(false);
    expect(await verifySessionValue("hunter2", undefined, now)).toBe(false);
  });

  it("checks passwords", async () => {
    expect(await checkPassword("hunter2", "hunter2")).toBe(true);
    expect(await checkPassword("hunter2", "hunter3")).toBe(false);
  });
});
