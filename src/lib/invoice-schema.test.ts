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
