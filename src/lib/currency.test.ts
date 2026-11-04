import { describe, expect, it } from "vitest";
import { currenciesInAmounts, currenciesInText, pickCurrency } from "./currency";
import type { Analysis } from "./investigation/reconcile";
import { draftFromAnalysis } from "./investigations";

describe("currenciesInAmounts", () => {
  it.each([
    ["₱2,500", "PHP"],
    ["PHP 2500", "PHP"],
    ["P3000", "PHP"],
    ["tatlong libong piso", "PHP"],
    ["500 pesos", "PHP"],
    ["$300", "USD"],
    ["US$300", "USD"],
    ["USD 300", "USD"],
    ["two thousand dollars", "USD"],
  ])("%s is %s", (text, currency) => {
    expect(currenciesInAmounts([text])).toEqual([currency]);
  });

  it("finds nothing in a bare amount", () => {
    expect(currenciesInAmounts(["2.5k", "3,000", null])).toEqual([]);
  });
});

describe("currenciesInText", () => {
  it.each([
    ["Bill Ana ₱5,000 for the logo", "PHP"],
    ["Bill Ana 5k php", "PHP"],
    ["Bill Ana P5,000", "PHP"],
    ["bayad in pesos, 5000", "PHP"],
    ["Bill Ana $500", "USD"],
    ["Bill Ana 500 usd", "USD"],
    ["dollars ang bayad, 300", "USD"],
  ])("%s is %s", (text, currency) => {
    expect(currenciesInText([text])).toEqual([currency]);
  });

  it.each(["2,500 for a PHP website", "P2 priority bug, 5k", "logo for a dollar store, 500", "Invoice Ana 2,500 due Friday"])("%s names none", (text) => {
    expect(currenciesInText([text])).toEqual([]);
  });
});

describe("pickCurrency", () => {
  it("uses the first source that names one", () => {
    expect(pickCurrency([["PHP"], ["USD"]], "USD")).toEqual({ currency: "PHP", conflict: false, isNamed: true });
    expect(pickCurrency([[], ["USD"]], "PHP")).toEqual({ currency: "USD", conflict: false, isNamed: true });
  });

  it("falls back to the preference when nothing is named", () => {
    expect(pickCurrency([[], []], "USD")).toEqual({ currency: "USD", conflict: false, isNamed: false });
  });

  it("doesn't guess when a source names both", () => {
    expect(pickCurrency([["PHP", "USD"], ["PHP"]], "USD")).toEqual({ currency: "USD", conflict: true, isNamed: true });
  });
});

describe("draftFromAnalysis currency", () => {
  const item = (key: string, currency?: "PHP" | "USD") => ({ key, label: key, status: "agreed", agreedCentavos: 100, proposedCentavos: null, affectedCentavos: null, eventIds: [], messageIds: [], currency });
  const analysis = (...items: ReturnType<typeof item>[]) => ({ messages: [], items, findings: [], summary: { clientName: "Ana", dueDate: "2026-12-01" } }) as unknown as Analysis;

  it("uses the currency the page shows for the agreed items, not the preference", () => {
    expect(draftFromAnalysis(analysis(item("logo", "USD")), undefined, { preferred: "PHP" }).draft.currency).toBe("USD");
    expect(draftFromAnalysis(analysis(item("logo", "PHP")), undefined, { preferred: "USD" }).draft.currency).toBe("PHP");
  });

  it("keeps an analysis from before currencies were tracked in pesos, like the page", () => {
    expect(draftFromAnalysis(analysis(item("logo")), undefined, { preferred: "USD" }).draft.currency).toBe("PHP");
  });

  it("uses the preference and warns when agreed items are in both", () => {
    const r = draftFromAnalysis(analysis(item("logo", "PHP"), item("hosting", "USD")), undefined, { preferred: "USD" });
    expect(r.draft.currency).toBe("USD");
    expect(r.warnings.join(" ")).toContain("pesos and dollars");
  });
});
