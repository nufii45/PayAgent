import { describe, expect, it } from "vitest";
import { buildDashboard, investigationStatus, type InvestigationRow } from "./dashboard";
import { reconcile } from "./investigation/reconcile";
import { Extraction } from "./investigation/schema";

const now = new Date("2026-11-04T02:00:00Z");
const m = (id: string, evidence: string, speaker: string, text: string) => ({ id, evidence, speaker, text });
const ana = {
  clientName: "Ana Reyes",
  messages: [m("m1", "E1", "you", "Website is ₱15,000"), m("m2", "E1", "client", "Sige, go. 5k deposit tomorrow"), m("m3", "E2", "you", "Dashboard ₱3,000"), m("m4", "E2", "client", "Yes proceed")],
  events: [
    { id: "e1", type: "offer", item: "website", amountText: "₱15,000", messageIds: ["m1"] },
    { id: "e2", type: "acceptance", item: "website", messageIds: ["m2"] },
    { id: "e3", type: "payment_promise", amountText: "5k", messageIds: ["m2"] },
    { id: "e4", type: "offer", item: "dashboard", amountText: "₱3,000", messageIds: ["m3"] },
    { id: "e5", type: "acceptance", item: "dashboard", messageIds: ["m4"] },
  ],
};
const v1 = reconcile(Extraction.parse(ana), [{ id: "E1", label: "S1" }, { id: "E2", label: "S2" }], {}, now);
const v2 = reconcile(
  Extraction.parse({ ...ana, messages: [...ana.messages, m("m5", "E3", "client", "Cancel the dashboard")], events: [...ana.events, { id: "e6", type: "cancellation", item: "dashboard", messageIds: ["m5"] }] }),
  [{ id: "E1", label: "S1" }, { id: "E2", label: "S2" }, { id: "E3", label: "S3" }],
  {},
  now,
);

const row = (over: Partial<InvestigationRow>): InvestigationRow => ({
  id: "i1",
  title: "Ana website",
  updatedAt: now,
  evidenceCount: 3,
  lastFailed: false,
  latestTrigger: "new_evidence",
  latestAt: now.toISOString(),
  previous: v1,
  latest: { version: 2, analysis: v2 },
  ...over,
});

describe("dashboard", () => {
  it("shows an honest empty state", () => {
    const d = buildDashboard({ investigations: [], invoices: [], drafts: [], now });
    expect(d.investigationCount).toBe(0);
    expect(d.receivables.agreed).toBe(0);
    expect(d.awaiting).toEqual([]);
    expect(d.needsReview.total).toBe(0);
    expect(d.attention).toEqual([]);
    expect(d.insights).toEqual([]);
  });

  it("counts agreed amounts as potential receivables, keeps promises apart, and flags what new evidence changed", () => {
    const d = buildDashboard({ investigations: [row({})], invoices: [], drafts: [], now });
    expect(d.receivables).toMatchObject({ agreed: 1_500_000, promised: 500_000, claimed: 0, count: 1 });
    expect(d.attention.some((a) => a.status === "Changed by new evidence")).toBe(true);
    expect(d.insights.some((i) => i.includes("promised payment"))).toBe(true);
  });

  it("moves an investigation out of receivables once invoiced, and never adds currencies together", () => {
    const d = buildDashboard({
      investigations: [row({})],
      invoices: [
        { id: "v1", number: "INV-1", clientName: "Ana", amountCentavos: 1_500_000, currency: "PHP", status: "approved", investigationId: "i1" },
        { id: "v2", number: "INV-2", clientName: "Bo", amountCentavos: 30_000, currency: "USD", status: "approved", investigationId: null },
        { id: "v3", number: "INV-3", clientName: "Cy", amountCentavos: 99_900, currency: "PHP", status: "paid", investigationId: null },
      ],
      drafts: [{ id: "r1", investigationId: null, draft: { clientName: "Dee", totalCentavos: 100, currency: "PHP" }, createdAt: now }],
      now,
    });
    expect(d.receivables.agreed).toBe(0);
    expect(d.awaiting).toEqual([
      { currency: "PHP", count: 1, total: 1_500_000 },
      { currency: "USD", count: 1, total: 30_000 },
    ]);
    expect(d.needsReview.drafts).toBe(1);
    expect(d.attention.find((a) => a.status === "Awaiting approval")?.href).toBe("/invoices/drafts/r1");
  });

  it("derives statuses from the stored analysis", () => {
    expect(investigationStatus(row({ latest: null, lastFailed: true }), now)).toBe("Analysis failed");
    expect(investigationStatus(row({ latest: null, updatedAt: new Date(now.getTime() - 30_000) }), now)).toBe("Analyzing");
    expect(investigationStatus(row({}), now)).not.toBe("Analysis failed");
  });
});
