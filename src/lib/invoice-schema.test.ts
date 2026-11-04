import { describe, expect, it } from "vitest";
import { InvoiceProposal, proposalToDraft } from "./invoice-schema";

const MON = new Date("2026-11-02T02:00:00Z");
const base = {
  clientName: "Client A",
  items: [{ description: "Consulting", amountText: "2.5k" }],
  dueDateToken: "this_friday",
};

describe("proposalToDraft", () => {
  it("computes amounts and dates in code", () => {
    const result = proposalToDraft(InvoiceProposal.parse(base), MON);
    expect(result).toEqual({
      status: "ready",
      draft: {
        clientName: "Client A",
        currency: "PHP",
        items: [{ description: "Consulting", amountCentavos: 250_000 }],
        totalCentavos: 250_000,
        dueDate: "2026-11-06",
        notes: null,
      },
    });
  });

  it("sums multiple items", () => {
    const p = InvoiceProposal.parse({ ...base, items: [...base.items, { description: "Travel", amountText: "₱350.50" }] });
    const result = proposalToDraft(p, MON);
    expect(result.status === "ready" && result.draft.totalCentavos).toBe(285_050);
  });

  it("asks instead of guessing when fields are missing", () => {
    const result = proposalToDraft(InvoiceProposal.parse({ ...base, items: [], dueDateToken: null }), MON);
    expect(result).toMatchObject({ status: "needs_info", missing: ["amount", "dueDate"] });
  });

  it("uses the model's question when it gives one", () => {
    const p = InvoiceProposal.parse({ ...base, clientName: null, question: "Sino ang client?" });
    expect(proposalToDraft(p, MON)).toMatchObject({ status: "needs_info", question: "Sino ang client?" });
  });

  it("flags ambiguous dates for confirmation", () => {
    const THU = new Date("2026-11-05T02:00:00Z");
    const result = proposalToDraft(InvoiceProposal.parse({ ...base, dueDateToken: "next_friday" }), THU);
    expect(result).toMatchObject({ status: "needs_confirmation", draft: { dueDate: "2026-11-06" } });
  });

  it("rejects unreadable amounts and dates", () => {
    const p = InvoiceProposal.parse({ ...base, items: [{ description: "x", amountText: "a lot" }], dueDateToken: "soon" });
    const result = proposalToDraft(p, MON);
    expect(result.status).toBe("invalid");
    expect(result.status === "invalid" && result.errors).toHaveLength(2);
  });
});

describe("proposals with gaps", () => {
  const now = new Date("2026-11-03T02:00:00Z");
  const base = { clientName: "Client A", currency: "PHP", dueDateToken: "tomorrow", notes: null, missingFields: [], question: null };

  it("treats an item with a null amount as a missing amount, not a format error", () => {
    const parsed = InvoiceProposal.parse({ ...base, items: [{ description: "consulting", amountText: null }] });
    const r = proposalToDraft(parsed, now);
    expect(r.status).toBe("needs_info");
    if (r.status === "needs_info") expect(r.missing).toContain("amount");
  });

  it("treats a blank description as missing", () => {
    const parsed = InvoiceProposal.parse({ ...base, items: [{ description: " ", amountText: "2.5k" }] });
    const r = proposalToDraft(parsed, now);
    expect(r.status).toBe("needs_info");
    if (r.status === "needs_info") expect(r.missing).toContain("description");
  });
});

describe("proposalToDraft currency", () => {
  const usd = { preferred: "USD" as const };
  const proposal = (amountText: string, currency: string | null = "PHP") =>
    InvoiceProposal.parse({ clientName: "Client A", currency, items: [{ description: "Logo", amountText }], dueDateToken: "tomorrow", notes: null, missingFields: [], question: null });
  const currency = (r: ReturnType<typeof proposalToDraft>) => ("draft" in r ? r.draft.currency : null);

  it("uses the preference when nothing names a currency, whatever the model said", () => {
    expect(currency(proposalToDraft(proposal("2.5k", "PHP"), MON, { ...usd, turns: ["Invoice Client A 2.5k due tomorrow"] }))).toBe("USD");
    expect(currency(proposalToDraft(proposal("2.5k", "USD"), MON, { preferred: "PHP", turns: ["Invoice Client A 2.5k due tomorrow"] }))).toBe("PHP");
  });

  it("lets an amount's own mark beat the preference, in both directions", () => {
    expect(currency(proposalToDraft(proposal("₱2,500", "USD"), MON, usd))).toBe("PHP");
    expect(currency(proposalToDraft(proposal("$300", "PHP"), MON, { preferred: "PHP" }))).toBe("USD");
  });

  it("reads the user's words when the model dropped the mark", () => {
    expect(currency(proposalToDraft(proposal("2500"), MON, { ...usd, turns: ["Invoice Client A ₱2,500"] }))).toBe("PHP");
    expect(currency(proposalToDraft(proposal("300"), MON, { preferred: "PHP", turns: ["Invoice Client A $300"] }))).toBe("USD");
  });

  it("isn't fooled by a word that only looks like a currency", () => {
    expect(currency(proposalToDraft(proposal("2500"), MON, { ...usd, turns: ["2500 for a PHP website"] }))).toBe("USD");
  });

  it("trusts the model's reading only for a screenshot it can see and code can't", () => {
    expect(currency(proposalToDraft(proposal("2500", "USD"), MON, { preferred: "PHP", hasImage: true }))).toBe("USD");
    expect(currency(proposalToDraft(proposal("2500", null), MON, { ...usd, hasImage: true }))).toBe("USD");
    expect(currency(proposalToDraft(proposal("₱2500", "USD"), MON, { preferred: "USD", hasImage: true }))).toBe("PHP");
  });

  it("uses the preference and asks when amounts name both", () => {
    const p = { ...proposal("₱5,000"), items: [{ description: "Logo", amountText: "₱5,000" }, { description: "Hosting", amountText: "$20" }] };
    const r = proposalToDraft(p, MON, usd);
    expect(r).toMatchObject({ status: "needs_confirmation", draft: { currency: "USD" } });
    expect(r.status === "needs_confirmation" && r.question).toContain("both pesos and dollars");
  });
});
