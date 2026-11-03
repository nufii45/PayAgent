import { and, asc, desc, eq, inArray, notInArray, or, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { agentRequests, approvals, auditEvents, clients, invoiceItems, invoices } from "@/db/schema";
import type { AgentStep } from "./ai/agent";
import type { DraftResult, InvoiceDraft } from "./invoice-schema";
import type { ClientMatch, OpenInvoice } from "./ai/tools";
import { diffDrafts } from "./edited-draft";

// All database access for the invoice flow. Every write also appends to the audit log.

export async function findClients(db: Db, name: string): Promise<ClientMatch[]> {
  const q = name.trim().toLowerCase();
  if (!q) return [];
  return db
    .select({ id: clients.id, name: clients.name, email: clients.email })
    .from(clients)
    .where(or(sql`lower(${clients.name}) = ${q}`, sql`${q} = any(${clients.aliases})`, sql`lower(${clients.name}) like ${"%" + q + "%"}`))
    .limit(5);
}

export async function listOpenInvoicesForClient(db: Db, clientName: string): Promise<OpenInvoice[]> {
  const matches = await findClients(db, clientName);
  if (!matches.length) return [];
  return db
    .select({ number: invoices.number, currency: invoices.currency, amountCentavos: invoices.amountCentavos, dueDate: invoices.dueDate, status: invoices.status })
    .from(invoices)
    .where(and(inArray(invoices.clientId, matches.map((m) => m.id)), notInArray(invoices.status, ["paid", "void"])))
    .orderBy(desc(invoices.createdAt))
    .limit(10);
}

export async function saveAgentRun(
  db: Db,
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
      entityType: "agent_request",
      entityId: req.id,
      eventType: "agent.proposed",
      payload: { model: run.model, latencyMs: run.latencyMs, steps: run.steps, outcome: run.result.status, turns: run.turns },
    });
    return req.id;
  });
}

export type ApproveOutcome = { ok: true; invoiceId: string; alreadyApproved: boolean } | { ok: false; error: string };

export async function approveRequest(db: Db, requestId: string, draft: InvoiceDraft): Promise<ApproveOutcome> {
  return db.transaction(async (tx) => {
    const [req] = await tx.select().from(agentRequests).where(eq(agentRequests.id, requestId)).for("update");
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
      .where(sql`lower(${clients.name}) = ${draft.clientName.toLowerCase()}`)
      .limit(1);
    const clientId = match?.id ?? (await tx.insert(clients).values({ name: draft.clientName }).returning({ id: clients.id }))[0].id;

    const [invoice] = await tx
      .insert(invoices)
      .values({
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
      { entityType: "approval", entityId: approval.id, eventType: "draft.approved", payload: { requestId, invoiceId: invoice.id, edits } },
      { entityType: "invoice", entityId: invoice.id, eventType: "invoice.created", payload: { number: invoice.number, requestId, draft } },
    ]);
    return { ok: true, invoiceId: invoice.id, alreadyApproved: false };
  });
}

export async function rejectRequest(db: Db, requestId: string) {
  return db.transaction(async (tx) => {
    const [existing] = await tx.select().from(approvals).where(eq(approvals.requestId, requestId));
    if (existing) return;
    const [approval] = await tx.insert(approvals).values({ requestId, action: "reject" }).returning({ id: approvals.id });
    await tx.insert(auditEvents).values({ entityType: "approval", entityId: approval.id, eventType: "draft.rejected", payload: { requestId } });
  });
}

export async function listInvoices(db: Db) {
  return db
    .select({
      id: invoices.id,
      number: invoices.number,
      clientName: clients.name,
      amountCentavos: invoices.amountCentavos,
      currency: invoices.currency,
      dueDate: invoices.dueDate,
      status: invoices.status,
    })
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .orderBy(desc(invoices.createdAt))
    .limit(100);
}

export async function getInvoiceWithTimeline(db: Db, id: string) {
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
    .where(eq(invoices.id, id));
  if (!invoice) return null;

  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id));
  const requestId = invoice.createdFromRequestId;
  const approvalIds = requestId
    ? (await db.select({ id: approvals.id }).from(approvals).where(eq(approvals.requestId, requestId))).map((a) => a.id)
    : [];
  const entityIds = [id, ...(requestId ? [requestId] : []), ...approvalIds];
  const timeline = await db.select().from(auditEvents).where(inArray(auditEvents.entityId, entityIds)).orderBy(asc(auditEvents.createdAt));
  const [request] = requestId ? await db.select().from(agentRequests).where(eq(agentRequests.id, requestId)) : [];
  return { invoice, items, timeline, request: request ?? null };
}
