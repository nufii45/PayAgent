import { describe, expect, it } from "vitest";
import { formatPeso } from "../money";
import { diffAnalyses, messageKey, reconcile } from "./reconcile";
import { Extraction } from "./schema";

const now = new Date("2026-11-03T02:00:00Z");
const E = (n: number) => ({ id: `E${n}`, label: `Screenshot ${n}` });

const m = (id: string, evidence: string, speaker: string, text: string) => ({ id, evidence, speaker, text });

// The PRD scenario: website ₱15,000 agreed, deposit promised, dashboard ₱3,000 added and accepted.
const base = {
  clientName: "Ana Reyes",
  messages: [
    m("m1", "E1", "client", "How much for the website?"),
    m("m2", "E1", "you", "Website is ₱15,000, 3 pages"),
    m("m3", "E1", "client", "Sige, go. I'll send the 5k deposit tomorrow"),
    m("m4", "E2", "client", "Can you add a dashboard too?"),
    m("m5", "E2", "you", "I can add it for ₱3,000"),
    m("m6", "E2", "client", "Yes, please proceed for 3k. Pay by end of month"),
  ],
  events: [
    { id: "e1", type: "offer", item: "website", amountText: "₱15,000", messageIds: ["m2"] },
    { id: "e2", type: "acceptance", item: "website", messageIds: ["m3"] },
    { id: "e3", type: "payment_promise", amountText: "5k", messageIds: ["m3"] },
    { id: "e4", type: "scope_request", item: "dashboard add-on", messageIds: ["m4"] },
    { id: "e5", type: "offer", item: "dashboard add-on", amountText: "₱3,000", messageIds: ["m5"] },
    { id: "e6", type: "acceptance", item: "dashboard add-on", amountText: "3k", dueDateToken: "end_of_month", messageIds: ["m6"] },
  ],
};

const v1 = () => reconcile(Extraction.parse(base), [E(1), E(2)], {}, now);

describe("reconcile", () => {
  it("adds an accepted scope change to the agreed total and keeps promises separate", () => {
    const a = v1();
    expect(a.summary.agreedTotalCentavos).toBe(1_800_000);
    expect(a.summary.promisedCentavos).toBe(500_000);
    expect(a.summary.claimedCentavos).toBe(0);
    expect(a.summary.verifiedCentavos).toBe(0);
    expect(a.summary.dueDate).toBe("2026-11-30");
    expect(a.items.map((i) => [i.key, i.status, i.agreedCentavos])).toEqual([
      ["website", "agreed", 1_500_000],
      ["dashboard", "agreed", 300_000],
    ]);
    expect(a.findings.find((f) => f.id === "item:dashboard")?.messageIds).toEqual(["m4", "m5", "m6"]);
    expect(a.summary.recommendedAction).toBe("follow_up");
  });

  it("treats a cancellation from new evidence as superseding, and the diff explains it", () => {
    const withCancel = Extraction.parse({
      ...base,
      messages: [...base.messages, m("m7", "E3", "client", "Let's cancel the additional dashboard. Don't work on that part anymore.")],
      events: [...base.events, { id: "e7", type: "cancellation", item: "dashboard", messageIds: ["m7"] }],
    });
    const v2 = reconcile(withCancel, [E(1), E(2), E(3)], {}, now);
    expect(v2.summary.agreedTotalCentavos).toBe(1_500_000);
    const dash = v2.items.find((i) => i.key === "dashboard")!;
    expect(dash.status).toBe("cancelled");
    expect(dash.affectedCentavos).toBe(300_000);
    expect(v2.findings.find((f) => f.id === "item:dashboard")?.needsReview).toBe(true);

    const changes = diffAnalyses(v1(), v2, formatPeso);
    expect(changes[0]).toMatchObject({ title: "Dashboard add-on", before: "agreed, ₱3,000.00", after: "cancelled, ₱3,000.00", messageIds: ["m7"] });
    expect(changes.find((c) => c.kind === "total")).toMatchObject({ before: "₱18,000.00", after: "₱15,000.00" });
  });

  it("keeps the charge disputed when work was reported done before the cancellation", () => {
    const x = Extraction.parse({
      ...base,
      messages: [...base.messages, m("m7", "E3", "you", "Dashboard is done na"), m("m8", "E3", "client", "Actually cancel the dashboard")],
      events: [...base.events, { id: "e7", type: "completion_claim", item: "dashboard", messageIds: ["m7"] }, { id: "e8", type: "cancellation", item: "dashboard", messageIds: ["m8"] }],
    });
    const a = reconcile(x, [E(1), E(2), E(3)], {}, now);
    expect(a.items.find((i) => i.key === "dashboard")?.status).toBe("disputed");
    expect(a.summary.agreedTotalCentavos).toBe(1_500_000);
    expect(a.summary.disputedCentavos).toBe(300_000);
    expect(a.summary.recommendedAction).toBe("clarify");
  });

  it("does not count a request or an unaccepted price", () => {
    const x = Extraction.parse({
      messages: [m("m1", "E1", "client", "Can you add another dashboard?"), m("m2", "E1", "you", "I can add it for ₱3,000")],
      events: [
        { id: "e1", type: "scope_request", item: "dashboard", messageIds: ["m1"] },
        { id: "e2", type: "offer", item: "dashboard", amountText: "3000", messageIds: ["m2"] },
      ],
    });
    const a = reconcile(x, [E(1)], {}, now);
    expect(a.items[0]).toMatchObject({ status: "proposed", agreedCentavos: null, proposedCentavos: 300_000 });
    expect(a.summary.agreedTotalCentavos).toBe(0);
  });

  it("flags a price change proposed after agreement and keeps the agreed price", () => {
    const x = Extraction.parse({
      messages: [m("m1", "E1", "you", "Logo is 8,000"), m("m2", "E1", "client", "Ok deal"), m("m3", "E1", "client", "We said 7k right?")],
      events: [
        { id: "e1", type: "offer", item: "logo", amountText: "8,000", messageIds: ["m1"] },
        { id: "e2", type: "acceptance", item: "logo", messageIds: ["m2"] },
        { id: "e3", type: "counteroffer", item: "logo", amountText: "7k", messageIds: ["m3"] },
      ],
    });
    const a = reconcile(x, [E(1)], {}, now);
    expect(a.items[0]).toMatchObject({ status: "change_proposed", agreedCentavos: 800_000, proposedCentavos: 700_000 });
    expect(a.findings[0].needsReview).toBe(true);
    expect(a.summary.recommendedAction).toBe("clarify");
  });

  it("never treats a payment claim as verified", () => {
    const x = Extraction.parse({
      messages: [m("m1", "E1", "you", "Logo is 8,000"), m("m2", "E1", "client", "Ok, paid already via GCash")],
      events: [
        { id: "e1", type: "offer", item: "logo", amountText: "8,000", messageIds: ["m1"] },
        { id: "e2", type: "acceptance", item: "logo", messageIds: ["m2"] },
        { id: "e3", type: "payment_claim", amountText: "8,000", messageIds: ["m2"] },
      ],
    });
    const a = reconcile(x, [E(1)], {}, now);
    expect(a.summary).toMatchObject({ claimedCentavos: 800_000, verifiedCentavos: 0, balanceIfClaimsTrueCentavos: 0 });
    expect(a.findings.find((f) => f.id === "payment:claimed")).toMatchObject({ classification: "unresolved", needsReview: true });
  });

  it("counts overlapping screenshots once", () => {
    const x = Extraction.parse({
      messages: [m("m1", "E1", "you", "Website is ₱15,000, 3 pages"), m("m2", "E2", "you", "Website is ₱15,000, 3 pages"), m("m3", "E2", "client", "Go!")],
      events: [
        { id: "e1", type: "offer", item: "website", amountText: "15000", messageIds: ["m1"] },
        { id: "e2", type: "offer", item: "website", amountText: "15000", messageIds: ["m2"] },
        { id: "e3", type: "acceptance", item: "website", messageIds: ["m3"] },
      ],
    });
    const a = reconcile(x, [E(1), E(2)], {}, now);
    expect(a.messages[1].duplicateOf).toBe("m1");
    expect(a.timeline).toHaveLength(2);
    expect(a.summary.agreedTotalCentavos).toBe(1_500_000);
  });

  it("asks for help with speakers instead of guessing, and applies the answer", () => {
    const x = Extraction.parse({
      speakersClear: false,
      messages: [m("m1", "E1", "unknown", "Website is 15k"), m("m2", "E1", "unknown", "ok")],
      events: [
        { id: "e1", type: "offer", item: "website", amountText: "15k", messageIds: ["m1"] },
        { id: "e2", type: "acceptance", item: "website", messageIds: ["m2"] },
      ],
    });
    const a = reconcile(x, [E(1)], {}, now);
    expect(a.needsSpeakerHelp).toBe(true);
    expect(a.items[0].classification).toBe("inferred");

    const fixed = reconcile({ ...x, speakersClear: true }, [E(1)], {
      speakers: { [messageKey("E1", "Website is 15k")]: "you", [messageKey("E1", "ok")]: "client" },
    }, now);
    expect(fixed.needsSpeakerHelp).toBe(false);
    expect(fixed.items[0].classification).toBe("conversation");
  });

  it("applies the user's amount corrections and verdicts", () => {
    const a = reconcile(Extraction.parse(base), [E(1), E(2)], { amounts: { dashboard: 250_000 }, decisions: { "item:website": "rejected" } }, now);
    expect(a.items.find((i) => i.key === "dashboard")).toMatchObject({ agreedCentavos: 250_000, classification: "user" });
    expect(a.summary.agreedTotalCentavos).toBe(250_000);
  });

  it("only trusts screenshot boxes that are in range and in order", () => {
    const good = Extraction.parse({
      messages: [
        { ...m("m1", "E1", "you", "a"), box: [0.5, 0.1, 0.4, 0.05] },
        { ...m("m2", "E1", "client", "b"), box: [0.05, 0.2, 0.4, 0.05] },
        { ...m("m3", "E2", "client", "c"), box: [0.05, 0.6, 0.4, 0.05] },
        { ...m("m4", "E2", "client", "d"), box: [0.05, 0.2, 0.4, 0.05] },
      ],
    });
    expect(reconcile(good, [E(1), E(2)], {}, now).trustedBoxes).toEqual(["m1", "m2"]);
  });
});
