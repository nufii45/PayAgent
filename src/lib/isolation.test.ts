// Guest isolation against a real Postgres. Runs only when TEST_DATABASE_URL is set (a throwaway database
// with migrations applied), e.g. TEST_DATABASE_URL=postgresql://postgres@localhost:5433/postgres pnpm test
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createDb, type Db } from "@/db";
import { auditEvents, investigations, modelCalls, workspaces } from "@/db/schema";
import type { Extraction } from "./investigation/schema";
import { NotFound, addEvidence, analyse, createInvestigation, deleteInvestigation, getInvestigation, listInvestigations, saveCorrection, saveInvoiceDraftRequest, draftFromAnalysis } from "./investigations";
import { approveRequest, getInvoiceWithTimeline, listInvoices, listPendingDrafts, rejectRequest, setInvoiceStatus } from "./invoices";
import { reserveModelCall } from "./limits";
import { deleteWorkspace, ensureWorkspace, purgeExpired } from "./workspaces";

const url = process.env.TEST_DATABASE_URL;
const run = url ? describe : describe.skip;

const extraction: Extraction = {
  clientName: "Ana Reyes",
  speakersClear: true,
  messages: [
    { id: "m1", evidence: "E1", speaker: "you", text: "Website is ₱15,000", timestamp: null, box: null },
    { id: "m2", evidence: "E1", speaker: "client", text: "Sige, go!", timestamp: null, box: null },
  ],
  events: [
    { id: "e1", type: "offer", item: "website", amountText: "₱15,000", dueDateToken: null, messageIds: ["m1"], note: null },
    { id: "e2", type: "acceptance", item: "website", amountText: null, dueDateToken: null, messageIds: ["m2"], note: null },
  ],
  unreadable: [],
};
const extract = async () => ({ ok: true as const, extraction, model: "test", latencyMs: 1, retried: false });

run("guest workspace isolation", () => {
  let db: Db;
  const a = crypto.randomUUID();
  const b = crypto.randomUUID();
  let invId = "";

  beforeAll(async () => {
    db = createDb(url!);
    await ensureWorkspace(db, a, { isNew: true, retentionDays: 7 });
    await ensureWorkspace(db, b, { isNew: true, retentionDays: 7 });
    invId = await createInvestigation(db, a, { title: "Ana", instruction: null, evidence: [{ kind: "text", text: "Me: Website is ₱15,000\nAna: Sige, go!" }] });
    const r = await analyse(db, a, invId, "initial", extract);
    expect(r.ok).toBe(true);
  });

  afterAll(async () => {
    await db.delete(workspaces).where(eq(workspaces.id, a));
    await db.delete(workspaces).where(eq(workspaces.id, b));
  });

  it("only lists and opens investigations in the visitor's own workspace", async () => {
    expect((await listInvestigations(db, a)).map((r) => r.id)).toEqual([invId]);
    expect(await listInvestigations(db, b)).toEqual([]);
    expect(await getInvestigation(db, a, invId)).not.toBeNull();
    expect(await getInvestigation(db, b, invId)).toBeNull();
  });

  it("refuses every change from another workspace", async () => {
    await expect(addEvidence(db, b, invId, [{ kind: "text", text: "injected" }])).rejects.toBeInstanceOf(NotFound);
    await expect(saveCorrection(db, b, invId, { clientName: "Mallory" })).rejects.toBeInstanceOf(NotFound);
    expect((await analyse(db, b, invId, "initial", extract)).ok).toBe(false);
    await deleteInvestigation(db, b, invId);
    expect(await getInvestigation(db, a, invId)).not.toBeNull();
  });

  it("keeps invoice drafts, invoices and activity private", async () => {
    const data = (await getInvestigation(db, a, invId))!;
    const latest = data.versions.at(-1)!;
    const { draft, includedKeys } = draftFromAnalysis(latest.analysis!);
    await expect(saveInvoiceDraftRequest(db, b, invId, latest.version, draft, includedKeys)).rejects.toBeInstanceOf(NotFound);
    const reqId = await saveInvoiceDraftRequest(db, a, invId, latest.version, draft, includedKeys);
    expect((await listPendingDrafts(db, b)).length).toBe(0);
    expect((await approveRequest(db, b, reqId, draft)).ok).toBe(false);
    await rejectRequest(db, b, reqId);
    expect((await listPendingDrafts(db, a)).map((d) => d.id)).toEqual([reqId]);

    const approved = await approveRequest(db, a, reqId, { ...draft, dueDate: "2099-01-01" });
    expect(approved.ok).toBe(true);
    const invoiceId = approved.ok ? approved.invoiceId : "";
    expect(await listInvoices(db, b)).toEqual([]);
    expect(await getInvoiceWithTimeline(db, b, invoiceId)).toBeNull();
    expect(await setInvoiceStatus(db, b, invoiceId, "paid")).toBe(false);
    expect((await listInvoices(db, a))[0]).toMatchObject({ status: "approved", investigationId: invId });

    const bEvents = await db.select().from(auditEvents).where(eq(auditEvents.workspaceId, b));
    expect(bEvents.filter((e) => e.eventType !== "workspace.preferences_updated")).toEqual([]);
  });

  it("deleting a workspace removes everything in it", async () => {
    const c = crypto.randomUUID();
    await ensureWorkspace(db, c, { isNew: true, retentionDays: 7 });
    const id = await createInvestigation(db, c, { title: "C", instruction: null, evidence: [{ kind: "text", text: "hello" }] });
    await analyse(db, c, id, "initial", extract);
    const data = (await getInvestigation(db, c, id))!;
    const { draft, includedKeys } = draftFromAnalysis(data.versions.at(-1)!.analysis!);
    const req = await saveInvoiceDraftRequest(db, c, id, 1, draft, includedKeys);
    await approveRequest(db, c, req, { ...draft, dueDate: "2099-01-01" });
    await deleteWorkspace(db, c);
    expect(await db.select().from(investigations).where(eq(investigations.id, id))).toEqual([]);
    expect(await db.select().from(auditEvents).where(eq(auditEvents.workspaceId, c))).toEqual([]);
    expect(await listInvoices(db, c)).toEqual([]);
  });

  it("expires unused workspaces and tells the returning visitor", async () => {
    const old = crypto.randomUUID();
    const now = new Date();
    await ensureWorkspace(db, old, { isNew: true, retentionDays: 7, now: new Date(now.getTime() - 10 * 86_400_000) });
    await createInvestigation(db, old, { title: "Old", instruction: null, evidence: [{ kind: "text", text: "old" }] });
    const ws = await ensureWorkspace(db, old, { isNew: false, retentionDays: 7, now });
    expect(ws.replacedExpired).toBe(true);
    expect(await listInvestigations(db, old)).toEqual([]);
    expect(await purgeExpired(db, 7, now)).toBeGreaterThanOrEqual(0);
    await deleteWorkspace(db, old);
  });

  it("enforces the per-workspace limit", async () => {
    const limits = { perWorkspaceHour: 2, perNetworkHour: 100, globalDay: 100_000 };
    expect((await reserveModelCall(db, b, "203.0.113.9", "investigation", limits)).ok).toBe(true);
    expect((await reserveModelCall(db, b, "203.0.113.9", "investigation", limits)).ok).toBe(true);
    expect((await reserveModelCall(db, b, "203.0.113.9", "investigation", limits)).ok).toBe(false);
    expect((await reserveModelCall(db, a, "203.0.113.10", "investigation", limits)).ok).toBe(true);
    await db.delete(modelCalls).where(eq(modelCalls.workspaceId, b));
    await db.delete(modelCalls).where(eq(modelCalls.workspaceId, a));
  });
});
