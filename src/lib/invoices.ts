import { and, asc, desc, eq, inArray, isNull, notInArray, or, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { agentRequests, approvals, auditEvents, clients, invoiceItems, invoices } from "@/db/schema";
import type { AgentStep } from "./ai/agent";
import type { DraftResult, InvoiceDraft } from "./invoice-schema";
import type { ClientMatch, OpenInvoice } from "./ai/tools";
import { diffDrafts } from "./edited-draft";

// All database access for the invoice flow. Every write also appends to the audit log.

export async function findClients(db: Db, ws: string, name: string): Promise<ClientMatch[]> {
  const q = name.trim().toLowerCase();
  if (!q) return [];
  return db
    .select({ id: clients.id, name: clients.name, email: clients.email })
    .from(clients)
    .where(and(eq(clients.workspaceId, ws), or(sql`lower(${clients.name}) = ${q}`, sql`${q} = any(${clients.aliases})`, sql`lower(${clients.name}) like ${"%" + q + "%"}`)))
    .limit(5);
}

export async function listOpenInvoicesForClient(db: Db, ws: string, clientName: string): Promise<OpenInvoice[]> {
  const matches = await findClients(db, ws, clientName);
  if (!matches.length) return [];
  return db
    .select({ number: invoices.number, currency: invoices.currency, amountCentavos: invoices.amountCentavos, dueDate: invoices.dueDate, status: invoices.status })
    .from(invoices)
    .where(and(eq(invoices.workspaceId, ws), inArray(invoices.clientId, matches.map((m) => m.id)), notInArray(invoices.status, ["paid", "void"])))
    .orderBy(desc(invoices.createdAt))
    .limit(10);
}

export async function saveAgentRun(
  db: Db,
  ws: string,
  run: {
    inputType: "text" | "image" | "voice";
    turns: string[];
    model: string;
    latencyMs: number;
    steps: AgentStep[];
    proposal: unknown;
    result: DraftResult | { status: "error"; error: string };
  },
) {
  return db.transaction(async (tx) => {
    const [req] = await tx
      .insert(agentRequests)
      .values({
        workspaceId: ws,
        inputType: run.inputType,
        rawInput: run.turns[0] ?? "",
        conversation: run.turns,
        model: run.model,
        latencyMs: run.latencyMs,
        proposal: run.proposal ?? null,
        validationResult: run.result,
      })
      .returning({ id: agentRequests.id });
    await tx.insert(auditEvents).values({
      workspaceId: ws,
      entityType: "agent_request",
      entityId: req.id,
      eventType: "agent.proposed",
      payload: { model: run.model, latencyMs: run.latencyMs, steps: run.steps, outcome: run.result.status, turns: run.turns },
    });
    return req.id;
  });
}

export type ApproveOutcome = { ok: true; invoiceId: string; alreadyApproved: boolean } | { ok: false; error: string };

export async function approveRequest(db: Db, ws: string, requestId: string, draft: InvoiceDraft): Promise<ApproveOutcome> {
  return db.transaction(async (tx) => {
    const [req] = await tx.select().from(agentRequests).where(and(eq(agentRequests.id, requestId), eq(agentRequests.workspaceId, ws))).for("update");
    if (!req) return { ok: false, error: "This draft no longer exists. Start a new one." };

    const [existing] = await tx.select({ id: invoices.id }).from(invoices).where(eq(invoices.createdFromRequestId, requestId));
    if (existing) return { ok: true, invoiceId: existing.id, alreadyApproved: true };
    const [decided] = await tx.select().from(approvals).where(eq(approvals.requestId, requestId));
    if (decided) return { ok: false, error: "This draft was already rejected. Start a new one." };

    const original = req.validationResult as DraftResult | null;
    const before = original && "draft" in original ? original.draft : null;
    const edits = before ? diffDrafts(before, draft) : [];

    const [match] = await tx
      .select({ id: clients.id })
      .from(clients)
      .where(and(eq(clients.workspaceId, ws), sql`lower(${clients.name}) = ${draft.clientName.toLowerCase()}`))
      .limit(1);
    const clientId = match?.id ?? (await tx.insert(clients).values({ workspaceId: ws, name: draft.clientName }).returning({ id: clients.id }))[0].id;

    const [invoice] = await tx
      .insert(invoices)
      .values({
        workspaceId: ws,
        clientId,
        currency: draft.currency,
        amountCentavos: draft.totalCentavos,
        dueDate: draft.dueDate,
        notes: draft.notes,
        status: "approved",
        createdFromRequestId: requestId,
      })
      .returning({ id: invoices.id, number: invoices.number });
    await tx.insert(invoiceItems).values(draft.items.map((i) => ({ invoiceId: invoice.id, ...i })));
    const [approval] = await tx
      .insert(approvals)
      .values({ requestId, action: "approve", edits: edits.length ? edits : null })
      .returning({ id: approvals.id });
    await tx.insert(auditEvents).values([
      { workspaceId: ws, entityType: "approval", entityId: approval.id, eventType: "draft.approved", payload: { requestId, invoiceId: invoice.id, edits } },
      { workspaceId: ws, entityType: "invoice", entityId: invoice.id, eventType: "invoice.created", payload: { number: invoice.number, requestId, draft, investigationId: req.investigationId } },
    ]);
    return { ok: true, invoiceId: invoice.id, alreadyApproved: false };
  });
}

export async function rejectRequest(db: Db, ws: string, requestId: string) {
  return db.transaction(async (tx) => {
    const [req] = await tx.select({ id: agentRequests.id }).from(agentRequests).where(and(eq(agentRequests.id, requestId), eq(agentRequests.workspaceId, ws)));
    if (!req) return;
    const [existing] = await tx.select().from(approvals).where(eq(approvals.requestId, requestId));
    if (existing) return;
    const [approval] = await tx.insert(approvals).values({ requestId, action: "reject" }).returning({ id: approvals.id });
    await tx.insert(auditEvents).values({ workspaceId: ws, entityType: "approval", entityId: approval.id, eventType: "draft.rejected", payload: { requestId } });
  });
}

export async function listInvoices(db: Db, ws: string) {
  return db
    .select({
      id: invoices.id,
      number: invoices.number,
      clientName: clients.name,
      amountCentavos: invoices.amountCentavos,
      currency: invoices.currency,
      dueDate: invoices.dueDate,
      status: invoices.status,
      investigationId: agentRequests.investigationId,
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(agentRequests, eq(invoices.createdFromRequestId, agentRequests.id))
    .where(eq(invoices.workspaceId, ws))
    .orderBy(desc(invoices.createdAt))
    .limit(200);
}

export async function getInvoiceWithTimeline(db: Db, ws: string, id: string) {
  const [invoice] = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      clientName: clients.name,
      clientEmail: clients.email,
      amountCentavos: invoices.amountCentavos,
      currency: invoices.currency,
      dueDate: invoices.dueDate,
      status: invoices.status,
      notes: invoices.notes,
      createdFromRequestId: invoices.createdFromRequestId,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .where(and(eq(invoices.id, id), eq(invoices.workspaceId, ws)));
  if (!invoice) return null;

  const requestId = invoice.createdFromRequestId;
  const [items, approvalRows, [request]] = await Promise.all([
    db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id)),
    requestId ? db.select({ id: approvals.id }).from(approvals).where(eq(approvals.requestId, requestId)) : [],
    requestId ? db.select().from(agentRequests).where(eq(agentRequests.id, requestId)) : [],
  ]);
  const entityIds = [id, ...(requestId ? [requestId] : []), ...approvalRows.map((a) => a.id)];
  const timeline = await db.select().from(auditEvents).where(and(eq(auditEvents.workspaceId, ws), inArray(auditEvents.entityId, entityIds))).orderBy(asc(auditEvents.createdAt));
  return { invoice, items, timeline, request: request ?? null };
}

/** Invoice drafts that were proposed but never approved or discarded. */
export async function listPendingDrafts(db: Db, ws: string) {
  const rows = await db
    .select({ id: agentRequests.id, investigationId: agentRequests.investigationId, validationResult: agentRequests.validationResult, createdAt: agentRequests.createdAt })
    .from(agentRequests)
    .leftJoin(approvals, eq(approvals.requestId, agentRequests.id))
    .where(and(eq(agentRequests.workspaceId, ws), isNull(approvals.id), sql`${agentRequests.validationResult}->>'status' in ('ready', 'needs_confirmation')`))
    .orderBy(desc(agentRequests.createdAt))
    .limit(50);
  return rows.map((r) => ({ ...r, draft: (r.validationResult as { draft: InvoiceDraft }).draft }));
}

export async function getPendingDraft(db: Db, ws: string, requestId: string) {
  const [row] = (await listPendingDrafts(db, ws)).filter((d) => d.id === requestId);
  return row ?? null;
}

export type InvoiceStatusChange = "paid" | "void";

/** The user records that an invoice was paid (their own confirmation, not verified by a payment provider) or cancels it. */
export async function setInvoiceStatus(db: Db, ws: string, id: string, status: InvoiceStatusChange) {
  return db.transaction(async (tx) => {
    const [inv] = await tx.select({ status: invoices.status, number: invoices.number }).from(invoices).where(and(eq(invoices.id, id), eq(invoices.workspaceId, ws))).for("update");
    if (!inv) return false;
    if (inv.status === status) return true;
    await tx.update(invoices).set({ status }).where(eq(invoices.id, id));
    await tx.insert(auditEvents).values({
      workspaceId: ws,
      entityType: "invoice",
      entityId: id,
      eventType: status === "paid" ? "invoice.marked_paid" : "invoice.cancelled",
      payload: { number: inv.number, from: inv.status, source: "user_confirmed" },
    });
    return true;
  });
}
