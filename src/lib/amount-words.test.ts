import { describe, expect, it } from "vitest";
import { parseAmountWords } from "./amount-words";
import { parseAmount } from "./money";

describe("parseAmountWords", () => {
  it.each([
    ["tatlong libong piso", 3_000],
    ["tatlong libo", 3_000],
    ["sanlibo", 1_000],
    ["isang daan at limampu", 150],
    ["limang daan", 500],
    ["apat na raan", 400],
    ["dalawampu't lima", 25],
    ["labing-isa", 11],
    ["labinlimang libo", 15_000],
    ["dalawang libo at limang daang piso", 2_500],
    ["isang daang libo", 100_000],
    ["isang milyong piso", 1_000_000],
    ["two thousand five hundred", 2_500],
    ["twenty-five thousand", 25_000],
    ["one hundred fifteen pesos", 115],
    ["5 libo", 5_000],
    ["3 thousand", 3_000],
  ])("%s → %d", (text, pesos) => {
    expect(parseAmountWords(text)).toBe(pesos);
  });

  it.each(["", "piso", "at", "lima lima", "twenty twenty", "3 000", "logo design", "tatlong libo para sa logo", "sampu sentimo"])(
    "rejects %j",
    (text) => {
      expect(parseAmountWords(text)).toBeNull();
    },
  );
});

describe("parseAmount with words", () => {
  it("returns centavos for an amount in Filipino words", () => {
    expect(parseAmount("tatlong libong piso")).toEqual({ ok: true, centavos: 300_000 });
  });
  it("still rejects unreadable text", () => {
    expect(parseAmount("logo design").ok).toBe(false);
  });
});
