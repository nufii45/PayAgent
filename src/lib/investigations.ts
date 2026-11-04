// Database access for investigations. Every analysis is stored as a new version; nothing is overwritten.
import { createHash } from "node:crypto";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { agentRequests, analysisVersions, auditEvents, evidenceSources, investigations, workspaces } from "@/db/schema";
import { pickCurrency, type Currency } from "./currency";
import { resolveDueDate } from "./dates";
import type { InvoiceDraft } from "./invoice-schema";
import type { Preferences } from "./preferences";
import type { EvidenceInput, ExtractResult } from "./investigation/extract";
import { reconcile, type Analysis, type Corrections } from "./investigation/reconcile";
import type { Extraction } from "./investigation/schema";

export type NewEvidence = { kind: "image"; dataUrl: string; label?: string } | { kind: "text"; text: string; label?: string };
export type VersionEvidence = { eid: string; evidenceId: string; label: string; kind: "image" | "text" };
export type Trigger = "initial" | "new_evidence" | "correction" | "reorder" | "removed_evidence";
export type Extractor = (evidence: EvidenceInput[], instruction: string | null) => Promise<ExtractResult>;

/** Thrown when an id doesn't exist in the caller's workspace. Other workspaces' records look exactly like missing ones. */
export class NotFound extends Error {
  constructor() {
    super("This investigation doesn't exist in your workspace.");
  }
}

export const MAX_EVIDENCE_PER_INVESTIGATION = 20;

const own = (ws: string, id: string) => and(eq(investigations.id, id), eq(investigations.workspaceId, ws));

const hash = (e: NewEvidence) => createHash("sha256").update(e.kind === "image" ? e.dataUrl : e.text.trim()).digest("hex");

export async function createInvestigation(db: Db, ws: string, input: { title: string; instruction: string | null; evidence: NewEvidence[] }) {
  return db.transaction(async (tx) => {
    const [inv] = await tx.insert(investigations).values({ workspaceId: ws, title: input.title, instruction: input.instruction }).returning({ id: investigations.id });
    await tx.insert(auditEvents).values({ workspaceId: ws, entityType: "investigation", entityId: inv.id, eventType: "investigation.created", payload: { evidenceCount: input.evidence.length } });
    return inv.id;
  }).then(async (id) => {
    await addEvidence(db, ws, id, input.evidence);
    return id;
  });
}

/** Adds evidence at the end. Exact re-uploads are skipped and reported. */
export async function addEvidence(db: Db, ws: string, investigationId: string, evidence: NewEvidence[]) {
  return db.transaction(async (tx) => {
    const [inv] = await tx.select({ id: investigations.id }).from(investigations).where(own(ws, investigationId)).for("update");
    if (!inv) throw new NotFound();
    const existing = await tx.select({ hash: evidenceSources.contentHash, position: evidenceSources.position, kind: evidenceSources.kind }).from(evidenceSources).where(eq(evidenceSources.investigationId, investigationId));
    const hashes = new Set(existing.map((e) => e.hash));
    let position = existing.reduce((max, e) => Math.max(max, e.position), -1);
    let shots = existing.filter((e) => e.kind === "image").length;
    let texts = existing.filter((e) => e.kind === "text").length;
    const added: string[] = [];
    let skipped = 0;
    let tooMany = 0;
    for (const e of evidence) {
      const h = hash(e);
      if (hashes.has(h)) {
        skipped++;
        continue;
      }
      if (existing.length + added.length >= MAX_EVIDENCE_PER_INVESTIGATION) {
        tooMany++;
        continue;
      }
      hashes.add(h);
      const label = e.label?.trim() || (e.kind === "image" ? `Screenshot ${++shots}` : `Pasted text ${++texts}`);
      const [row] = await tx
        .insert(evidenceSources)
        .values({
          investigationId,
          kind: e.kind,
          label,
          position: ++position,
          contentHash: h,
          imageDataUrl: e.kind === "image" ? e.dataUrl : null,
          textContent: e.kind === "text" ? e.text.trim() : null,
        })
        .returning({ id: evidenceSources.id });
      added.push(row.id);
    }
    if (added.length) await tx.insert(auditEvents).values({ workspaceId: ws, entityType: "investigation", entityId: investigationId, eventType: "evidence.added", payload: { added: added.length, skippedDuplicates: skipped } });
    return { added, skipped, tooMany };
  });
}

export async function removeEvidence(db: Db, ws: string, investigationId: string, evidenceId: string) {
  const [inv] = await db.select({ id: investigations.id }).from(investigations).where(own(ws, investigationId));
  if (!inv) throw new NotFound();
  const removed = await db.delete(evidenceSources).where(and(eq(evidenceSources.id, evidenceId), eq(evidenceSources.investigationId, investigationId))).returning({ label: evidenceSources.label });
  if (removed.length) await db.insert(auditEvents).values({ workspaceId: ws, entityType: "investigation", entityId: investigationId, eventType: "evidence.removed", payload: { label: removed[0].label } });
  return removed.length > 0;
}

export async function reorderEvidence(db: Db, ws: string, investigationId: string, orderedIds: string[]) {
  await db.transaction(async (tx) => {
    const [inv] = await tx.select({ id: investigations.id }).from(investigations).where(own(ws, investigationId)).for("update");
    if (!inv) throw new NotFound();
    const rows = await tx.select({ id: evidenceSources.id }).from(evidenceSources).where(eq(evidenceSources.investigationId, investigationId));
    const ids = new Set(rows.map((r) => r.id));
    if (orderedIds.length !== ids.size || !orderedIds.every((id) => ids.has(id))) throw new Error("Evidence list changed. Reload and try again.");
    for (const [i, id] of orderedIds.entries()) await tx.update(evidenceSources).set({ position: i }).where(and(eq(evidenceSources.id, id), eq(evidenceSources.investigationId, investigationId)));
    await tx.insert(auditEvents).values({ workspaceId: ws, entityType: "investigation", entityId: investigationId, eventType: "evidence.reordered", payload: null });
  });
}

export async function listInvestigations(db: Db, ws: string) {
  const rows = await db
    .select({
      id: investigations.id,
      title: investigations.title,
      updatedAt: investigations.updatedAt,
      lastFailed: sql<boolean>`exists(select 1 from audit_events a where a.entity_id = "investigations"."id" and a.event_type = 'analysis.failed' and a.created_at > coalesce((select max(v.created_at) from analysis_versions v where v.investigation_id = "investigations"."id"), 'epoch'))`,
      previous: sql<Analysis | null>`(select v.analysis from analysis_versions v where v.investigation_id = "investigations"."id" and v.analysis is not null order by v.version desc offset 1 limit 1)`,
      latestTrigger: sql<string | null>`(select v.trigger from analysis_versions v where v.investigation_id = "investigations"."id" and v.analysis is not null order by v.version desc limit 1)`,
      latestAt: sql<string | null>`(select v.created_at from analysis_versions v where v.investigation_id = "investigations"."id" and v.analysis is not null order by v.version desc limit 1)`,
      // Fully qualified: drizzle renders column refs unqualified, which would bind to the subquery's own "id".
      evidenceCount: sql<number>`(select count(*)::int from evidence_sources e where e.investigation_id = "investigations"."id")`,
      latest: sql<{ version: number; analysis: Analysis | null } | null>`(select json_build_object('version', v.version, 'analysis', v.analysis) from analysis_versions v where v.investigation_id = "investigations"."id" and v.analysis is not null order by v.version desc limit 1)`,
    })
    .from(investigations)
    .where(eq(investigations.workspaceId, ws))
    .orderBy(desc(investigations.updatedAt))
    .limit(50);
  return rows;
}

export type VersionRow = typeof analysisVersions.$inferSelect & { analysis: Analysis | null; evidence: VersionEvidence[]; extraction: Extraction | null };

export async function getInvestigation(db: Db, ws: string, id: string) {
  const [inv] = await db.select().from(investigations).where(own(ws, id));
  if (!inv) return null;
  const [evidence, versions] = await Promise.all([
    db.select().from(evidenceSources).where(eq(evidenceSources.investigationId, id)).orderBy(asc(evidenceSources.position)),
    db.select().from(analysisVersions).where(eq(analysisVersions.investigationId, id)).orderBy(asc(analysisVersions.version)) as unknown as Promise<VersionRow[]>,
  ]);
  return { investigation: { ...inv, corrections: inv.corrections as Corrections }, evidence, versions };
}

/**
 * Runs an analysis and stores it as the next version.
 * With an extractor, the model reads all current evidence; without one (corrections), the latest reading is reused.
 * A failed model call stores nothing new, so the previous analysis stays current.
 */
export async function analyse(db: Db, ws: string, investigationId: string, trigger: Trigger, extract: Extractor | null, now = new Date()) {
  const data = await getInvestigation(db, ws, investigationId);
  if (!data) return { ok: false as const, error: "This investigation no longer exists." };
  const { investigation, evidence, versions } = data;
  const latest = versions.at(-1) ?? null;

  let extraction: Extraction;
  let used: VersionEvidence[];
  let model: string | null = latest?.model ?? null;
  let latencyMs: number | null = null;

  if (extract || !latest?.extraction) {
    if (!extract) return { ok: false as const, error: "Run the analysis first." };
    if (!evidence.length) return { ok: false as const, error: "Add at least one screenshot or pasted conversation." };
    used = evidence.map((e, i) => ({ eid: `E${i + 1}`, evidenceId: e.id, label: e.label, kind: e.kind }));
    const inputs: EvidenceInput[] = evidence.map((e, i) =>
      e.kind === "image"
        ? { id: `E${i + 1}`, label: e.label, kind: "image", dataUrl: e.imageDataUrl! }
        : { id: `E${i + 1}`, label: e.label, kind: "text", text: e.textContent! },
    );
    const r = await extract(inputs, investigation.instruction);
    if (!r.ok) {
      await db.insert(auditEvents).values({ workspaceId: ws, entityType: "investigation", entityId: investigationId, eventType: "analysis.failed", payload: { trigger, error: r.error, model: r.model, latencyMs: r.latencyMs } });
      return { ok: false as const, error: r.error };
    }
    extraction = r.extraction;
    model = r.model;
    latencyMs = r.latencyMs;
  } else {
    // Reuse the latest reading. Follow the current evidence order and drop removed evidence,
    // so reordering and removal don't need another model call.
    const position = new Map(evidence.map((e, i) => [e.id, i]));
    used = latest.evidence.filter((u) => position.has(u.evidenceId)).sort((a, b) => position.get(a.evidenceId)! - position.get(b.evidenceId)!);
    const kept = new Set(used.map((u) => u.eid));
    const keptMessages = latest.extraction.messages.filter((m) => kept.has(m.evidence));
    const keptIds = new Set(keptMessages.map((m) => m.id));
    extraction = {
      ...latest.extraction,
      messages: keptMessages,
      events: latest.extraction.events
        .map((e) => ({ ...e, messageIds: e.messageIds.filter((id) => keptIds.has(id)) }))
        .filter((e) => e.messageIds.length > 0),
      unreadable: latest.extraction.unreadable.filter((u) => kept.has(u.evidence)),
    };
  }

  // Later versions keep the first version's default, so changing the preference never relabels an investigation.
  const preferred = latest ? (latest.analysis?.currency ?? "PHP") : ((await db.select({ preferences: workspaces.preferences }).from(workspaces).where(eq(workspaces.id, ws)))[0]?.preferences as Preferences | undefined)?.currency;
  const analysis = reconcile(
    extraction,
    used.map((u) => ({ id: u.eid, label: u.label })),
    investigation.corrections,
    now,
    preferred,
  );

  const version = await db.transaction(async (tx) => {
    await tx.select({ id: investigations.id }).from(investigations).where(eq(investigations.id, investigationId)).for("update");
    const [{ max }] = await tx.select({ max: sql<number>`coalesce(max(${analysisVersions.version}), 0)::int` }).from(analysisVersions).where(eq(analysisVersions.investigationId, investigationId));
    const next = max + 1;
    await tx.insert(analysisVersions).values({ investigationId, version: next, trigger, evidence: used, extraction, analysis, corrections: investigation.corrections, model, latencyMs });
    await tx.update(investigations).set({ updatedAt: new Date() }).where(eq(investigations.id, investigationId));
    await tx.insert(auditEvents).values({
      workspaceId: ws,
      entityType: "investigation",
      entityId: investigationId,
      eventType: "analysis.completed",
      payload: { version: next, trigger, model, latencyMs, agreedTotalCentavos: analysis.summary.agreedTotalCentavos, reviewCount: analysis.summary.reviewCount },
    });
    return next;
  });
  return { ok: true as const, version, analysis };
}

/** Merge a correction into the investigation. The evidence and the model's reading are never edited. */
export async function saveCorrection(db: Db, ws: string, investigationId: string, patch: Corrections) {
  await db.transaction(async (tx) => {
    const [inv] = await tx.select({ corrections: investigations.corrections }).from(investigations).where(own(ws, investigationId)).for("update");
    if (!inv) throw new NotFound();
    const c = inv.corrections as Corrections;
    const merged: Corrections = {
      ...c,
      ...(patch.clientName !== undefined ? { clientName: patch.clientName } : {}),
      speakers: { ...c.speakers, ...patch.speakers },
      amounts: { ...c.amounts, ...patch.amounts },
      decisions: { ...c.decisions, ...patch.decisions },
    };
    await tx.update(investigations).set({ corrections: merged }).where(eq(investigations.id, investigationId));
    await tx.insert(auditEvents).values({ workspaceId: ws, entityType: "investigation", entityId: investigationId, eventType: "correction.saved", payload: patch });
  });
}

export async function deleteInvestigation(db: Db, ws: string, investigationId: string) {
  await db.transaction(async (tx) => {
    const deleted = await tx.delete(investigations).where(own(ws, investigationId)).returning({ id: investigations.id });
    // The audit log keeps that a deletion happened, but none of the conversation content.
    if (deleted.length) await tx.insert(auditEvents).values({ workspaceId: ws, entityType: "investigation", entityId: investigationId, eventType: "investigation.deleted", payload: null });
  });
}

/** Build an invoice draft from what the analysis supports. Unsupported items are left out and listed. */
export function draftFromAnalysis(
  analysis: Analysis,
  now = new Date(),
  { preferred = "PHP" }: { preferred?: Currency } = {},
) {
  const decisions = new Map(analysis.findings.map((f) => [f.id, f.decision]));
  const included = analysis.items.filter(
    (i) => (i.status === "agreed" || i.status === "change_proposed") && i.agreedCentavos != null && !["rejected", "unresolved"].includes(decisions.get(`item:${i.key}`) ?? ""),
  );
  const excluded = analysis.items.filter((i) => !included.includes(i) && i.status !== "rejected" && i.status !== "withdrawn");
  const fallbackDue = resolveDueDate("in_7_days", now);
  // The same currency the investigation page shows for these items.
  const { currency, conflict } = pickCurrency([[...new Set(included.map((i) => i.currency ?? "PHP"))]], preferred);
  const draft: InvoiceDraft = {
    clientName: analysis.summary.clientName ?? "",
    currency,
    items: included.map((i) => ({ description: i.label.charAt(0).toUpperCase() + i.label.slice(1), amountCentavos: i.agreedCentavos! })),
    totalCentavos: included.reduce((s, i) => s + i.agreedCentavos!, 0),
    dueDate: analysis.summary.dueDate ?? (fallbackDue.ok ? fallbackDue.date : ""),
    notes: null,
  };
  const warnings: string[] = [];
  if (conflict) warnings.push(`The agreed amounts name both pesos and dollars. ${currency} is filled in; check the currency below.`);
  if (!analysis.summary.clientName) warnings.push("No client name was visible. Enter it below.");
  if (!analysis.summary.dueDate) warnings.push("No due date was agreed in the conversation. 7 days from today is filled in; change it if needed.");
  for (const i of excluded) warnings.push(`Left out: ${i.label} (${i.status.replace("_", " ")}).`);
  for (const i of included.filter((x) => x.status === "change_proposed")) warnings.push(`${i.label}: a different price was proposed later. The agreed price is used.`);
  return { draft, warnings, includedKeys: included.map((i) => i.key) };
}

export async function saveInvoiceDraftRequest(db: Db, ws: string, investigationId: string, version: number, draft: InvoiceDraft, includedKeys: string[]) {
  return db.transaction(async (tx) => {
    const [inv] = await tx.select({ id: investigations.id }).from(investigations).where(own(ws, investigationId));
    if (!inv) throw new NotFound();
    const [req] = await tx
      .insert(agentRequests)
      .values({
        workspaceId: ws,
        investigationId,
        inputType: "image",
        rawInput: `Investigation analysis v${version}`,
        conversation: [],
        model: "reconcile",
        validationResult: { status: "ready", draft, source: { investigationId, version, items: includedKeys } },
      })
      .returning({ id: agentRequests.id });
    await tx.insert(auditEvents).values({ workspaceId: ws, entityType: "investigation", entityId: investigationId, eventType: "action.invoice_drafted", payload: { requestId: req.id, version, items: includedKeys } });
    return req.id;
  });
}

export async function investigationForRequests(db: Db, ws: string, requestIds: string[]) {
  if (!requestIds.length) return [];
  return db
    .select({ requestId: agentRequests.id, investigationId: agentRequests.investigationId })
    .from(agentRequests)
    .where(and(inArray(agentRequests.id, requestIds), eq(agentRequests.workspaceId, ws)));
}
