import { describe, expect, it } from "vitest";
import { diffDrafts, validateEditedDraft } from "./edited-draft";

const input = {
  clientName: "Client A",
  currency: "PHP",
  items: [{ description: "Consulting", amountText: "2,500" }],
  dueDate: "2026-11-06",
  notes: "",
};

describe("validateEditedDraft", () => {
  it("recomputes centavos and totals on the server", () => {
    const r = validateEditedDraft({ ...input, items: [...input.items, { description: "Travel", amountText: "₱350.50" }] }, "2026-11-02");
    expect(r).toMatchObject({ ok: true, draft: { totalCentavos: 285_050, notes: null } });
  });
  it("rejects past dates, bad amounts and empty fields with field-level messages", () => {
    const r = validateEditedDraft({ ...input, clientName: " ", dueDate: "2026-11-01" }, "2026-11-02");
    expect(r).toMatchObject({ ok: false, errors: { clientName: "Enter who the invoice is for" } });
    const r2 = validateEditedDraft({ ...input, items: [{ description: "x", amountText: "a lot" }], dueDate: "2026-11-01" }, "2026-11-02");
    expect(r2).toMatchObject({ ok: false, errors: { "items.0.amountText": expect.any(String), dueDate: expect.any(String) } });
  });
  it("rejects a tampered currency", () => {
    expect(validateEditedDraft({ ...input, currency: "BTC" }, "2026-11-02").ok).toBe(false);
  });
});

describe("diffDrafts", () => {
  it("lists only changed fields", () => {
    const a = { clientName: "Client A", currency: "PHP" as const, items: [{ description: "x", amountCentavos: 1 }], totalCentavos: 1, dueDate: "2026-11-06", notes: null };
    expect(diffDrafts(a, { ...a, dueDate: "2026-11-13" })).toEqual([{ field: "dueDate", before: "2026-11-06", after: "2026-11-13" }]);
  });
});
