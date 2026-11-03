import { describe, expect, it } from "vitest";
import { formatPeso } from "../money";
import { clarificationMessage, followUpMessage } from "./messages";
import { reconcile } from "./reconcile";
import { Extraction } from "./schema";

const now = new Date("2026-11-03T02:00:00Z");
const m = (id: string, speaker: string, text: string) => ({ id, evidence: "E1", speaker, text });

describe("drafted messages", () => {
  it("asks about the exact conflict, with amounts from the analysis", () => {
    const a = reconcile(
      Extraction.parse({
        clientName: "Ana Reyes",
        messages: [m("m1", "you", "Logo is 8,000"), m("m2", "client", "ok"), m("m3", "client", "7k right?")],
        events: [
          { id: "e1", type: "offer", item: "logo", amountText: "8,000", messageIds: ["m1"] },
          { id: "e2", type: "acceptance", item: "logo", messageIds: ["m2"] },
          { id: "e3", type: "counteroffer", item: "logo", amountText: "7k", messageIds: ["m3"] },
        ],
      }),
      [{ id: "E1", label: "Screenshot 1" }],
      {},
      now,
    );
    const msg = clarificationMessage(a, formatPeso)!;
    expect(msg).toContain("Hi Ana!");
    expect(msg).toContain("For the logo, we agreed on ₱8,000.00, then ₱7,000.00 came up");
    expect(followUpMessage(a, formatPeso)).toContain("₱8,000.00 in total");
  });

  it("has nothing to clarify when everything is agreed", () => {
    const a = reconcile(
      Extraction.parse({
        messages: [m("m1", "you", "Logo is 8,000"), m("m2", "client", "ok, pay by end of month")],
        events: [
          { id: "e1", type: "offer", item: "logo", amountText: "8,000", messageIds: ["m1"] },
          { id: "e2", type: "acceptance", item: "logo", dueDateToken: "end_of_month", messageIds: ["m2"] },
        ],
      }),
      [{ id: "E1", label: "Screenshot 1" }],
      {},
      now,
    );
    expect(clarificationMessage(a, formatPeso)).toBeNull();
  });
});
