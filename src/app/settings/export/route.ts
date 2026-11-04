import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { analysisVersions, evidenceSources, invoiceItems, investigations } from "@/db/schema";
import { listActivity } from "@/lib/activity";
import { currentWorkspace } from "@/lib/current-workspace";
import { listInvoices } from "@/lib/invoices";

export const dynamic = "force-dynamic";

/** Everything in the visitor's workspace as JSON. Screenshot images are left out to keep the file small. */
export async function GET() {
  const ws = await currentWorkspace();
  const invs = await db.select().from(investigations).where(eq(investigations.workspaceId, ws.id)).orderBy(asc(investigations.createdAt));
  const ids = invs.map((i) => i.id);
  const [evidence, versions, invoiceRows, activity] = await Promise.all([
    ids.length
      ? db.select({ investigationId: evidenceSources.investigationId, label: evidenceSources.label, kind: evidenceSources.kind, position: evidenceSources.position, text: evidenceSources.textContent, addedAt: evidenceSources.createdAt }).from(evidenceSources).where(inArray(evidenceSources.investigationId, ids))
      : [],
    ids.length
      ? db.select({ investigationId: analysisVersions.investigationId, version: analysisVersions.version, trigger: analysisVersions.trigger, model: analysisVersions.model, analysis: analysisVersions.analysis, corrections: analysisVersions.corrections, createdAt: analysisVersions.createdAt }).from(analysisVersions).where(inArray(analysisVersions.investigationId, ids))
      : [],
    listInvoices(db, ws.id),
    listActivity(db, ws.id, 1000),
  ]);
  const items = invoiceRows.length ? await db.select().from(invoiceItems).where(inArray(invoiceItems.invoiceId, invoiceRows.map((i) => i.id))) : [];
  const body = {
    exportedAt: new Date().toISOString(),
    note: "Amounts are integer centavos. Screenshot images are not included; their labels and order are.",
    preferences: ws.preferences,
    investigations: invs.map((i) => ({
      title: i.title,
      question: i.instruction,
      createdAt: i.createdAt,
      corrections: i.corrections,
      evidence: evidence.filter((e) => e.investigationId === i.id).sort((a, b) => a.position - b.position).map((e) => ({ label: e.label, kind: e.kind, position: e.position, text: e.text, addedAt: e.addedAt })),
      analyses: versions.filter((v) => v.investigationId === i.id).sort((a, b) => a.version - b.version).map((v) => ({ version: v.version, trigger: v.trigger, model: v.model, analysis: v.analysis, corrections: v.corrections, createdAt: v.createdAt })),
    })),
    invoices: invoiceRows.map((inv) => ({ ...inv, items: items.filter((it) => it.invoiceId === inv.id).map((it) => ({ description: it.description, amountCentavos: it.amountCentavos })) })),
    activity: activity.map((a) => ({ event: a.eventType, at: a.createdAt })),
  };
  return new Response(JSON.stringify(body, null, 2), {
    headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="payagent-export-${new Date().toISOString().slice(0, 10)}.json"`, "cache-control": "no-store" },
  });
}
