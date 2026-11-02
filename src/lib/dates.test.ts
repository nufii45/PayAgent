import { describe, expect, it } from "vitest";
import { resolveDueDate } from "./dates";

// Times are UTC; Manila is UTC+8.
const MON = new Date("2026-11-02T02:00:00Z"); // Mon 2 Nov, 10:00 Manila
const THU = new Date("2026-11-05T02:00:00Z"); // Thu 5 Nov
const FRI = new Date("2026-11-06T02:00:00Z"); // Fri 6 Nov
const LATE_SUNDAY_UTC = new Date("2026-11-01T17:00:00Z"); // already Mon 2 Nov, 01:00 in Manila

const ok = (date: string, needsConfirmation = false) => ({ ok: true, date, needsConfirmation });

describe("resolveDueDate", () => {
  it("uses Manila's calendar day, not UTC's", () => {
    expect(resolveDueDate("today", LATE_SUNDAY_UTC)).toEqual(ok("2026-11-02"));
  });

  it.each([
    ["today", MON, ok("2026-11-02")],
    ["tomorrow", MON, ok("2026-11-03")],
    ["in_7_days", MON, ok("2026-11-09")],
    ["in_1_day", MON, ok("2026-11-03")],
    ["this_friday", MON, ok("2026-11-06")],
    ["next_friday", MON, ok("2026-11-06")],
    ["this_monday", MON, ok("2026-11-02")],
    ["next_monday", MON, ok("2026-11-09", true)],
    ["next_friday", THU, ok("2026-11-06", true)],
    ["next_friday", FRI, ok("2026-11-13", true)],
    ["this_friday", FRI, ok("2026-11-06")],
    ["end_of_month", MON, ok("2026-11-30")],
    ["absolute:2026-12-15", MON, ok("2026-12-15")],
    ["NEXT_FRIDAY", MON, ok("2026-11-06")],
  ])("%s", (token, now, expected) => {
    expect(resolveDueDate(token, now)).toEqual(expected);
  });

  it.each(["yesterday", "next_funday", "absolute:2026-02-30", "absolute:2020-01-01", "soon"])("rejects %s", (token) => {
    expect(resolveDueDate(token, MON).ok).toBe(false);
  });
});
