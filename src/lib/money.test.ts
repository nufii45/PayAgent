import { describe, expect, it } from "vitest";
import { formatPeso, parseAmount } from "./money";

describe("parseAmount", () => {
  it.each([
    ["2500", 250_000],
    ["2,500", 250_000],
    ["2.5k", 250_000],
    ["2.5K", 250_000],
    ["₱2,500.50", 250_050],
    ["P2500", 250_000],
    ["PHP 2500", 250_000],
    ["php2500", 250_000],
    ["2500 pesos", 250_000],
    ["1.2m", 120_000_000],
    ["0.5", 50],
    ["1.23456k", 123_456],
    ["12,345,678.9", 1_234_567_890],
  ])("%s -> %i centavos", (input, expected) => {
    expect(parseAmount(input)).toEqual({ ok: true, centavos: expected });
  });

  it.each(["", "abc", "-500", "0", "2.555", "2,50", "1.2.3", "2500 usd", "1.234567k"])("rejects %s", (input) => {
    expect(parseAmount(input).ok).toBe(false);
  });
});

describe("formatPeso", () => {
  it("formats centavos as pesos", () => {
    expect(formatPeso(250_050)).toBe("₱2,500.50");
  });
});
