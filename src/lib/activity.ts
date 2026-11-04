import { desc, eq } from "drizzle-orm";
import type { Db } from "@/db";
import { auditEvents } from "@/db/schema";

export const ACTIVITY_LABELS: Record<string, string> = {
  "investigation.created": "Investigation started",
  "investigation.deleted": "Investigation deleted with all its evidence",
  "evidence.added": "Evidence added",
  "evidence.removed": "Evidence removed",
  "evidence.reordered": "Evidence reordered",
  "analysis.completed": "Conversation analysed",
  "analysis.failed": "Analysis failed (previous result kept)",
  "correction.saved": "You corrected the analysis",
  "action.invoice_drafted": "Invoice drafted from an investigation",
  "agent.proposed": "PayAgent drafted an invoice",
  "draft.approved": "You approved an invoice draft",
  "draft.rejected": "You discarded an invoice draft",
  "invoice.created": "Invoice saved",
  "invoice.marked_paid": "You marked an invoice as paid",
  "invoice.cancelled": "You cancelled an invoice",
  "workspace.preferences_updated": "Workspace preferences updated",
};

export type ActivityEvent = typeof auditEvents.$inferSelect;

export function activityDetail(type: string, p: Record<string, unknown> | null) {
  if (!p) return null;
  if (type === "analysis.completed") {
    const what = p.trigger === "new_evidence" ? "reanalysed with new evidence" : p.trigger === "correction" ? "after your correction" : null;
    return [`Version ${p.version}`, what, p.reviewCount ? `${p.reviewCount} to review` : null].filter(Boolean).join(" · ");
  }
  if (type === "workspace.preferences_updated") return p.acknowledgedPrivacy ? "privacy note acknowledged" : null;
  if (type === "evidence.added") return `${p.added} added${p.skippedDuplicates ? `, ${p.skippedDuplicates} duplicate skipped` : ""}`;
  if (type === "invoice.created" || type === "invoice.marked_paid" || type === "invoice.cancelled") return String(p.number ?? "");
  return null;
}

export function activityHref(e: Pick<ActivityEvent, "entityType" | "entityId" | "eventType" | "payload">) {
  if (e.entityType === "investigation" && e.eventType !== "investigation.deleted") return `/investigations/${e.entityId}`;
  if (e.entityType === "invoice") return `/invoices/${e.entityId}`;
  const p = e.payload as { invoiceId?: string } | null;
  if (e.entityType === "approval" && p?.invoiceId) return `/invoices/${p.invoiceId}`;
  return null;
}

export function listActivity(db: Db, ws: string, limit = 100) {
  return db.select().from(auditEvents).where(eq(auditEvents.workspaceId, ws)).orderBy(desc(auditEvents.createdAt)).limit(limit);
}
