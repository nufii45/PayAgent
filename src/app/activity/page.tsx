import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db/client";
import { auditEvents } from "@/db/schema";
import { EmptyState } from "@/components/ui/EmptyState";
import { ButtonLink } from "@/components/ui/Button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activity · Traccoon PayAgent" };

const time = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });

const LABELS: Record<string, string> = {
  "investigation.created": "Investigation started",
  "investigation.deleted": "Investigation deleted with all its evidence",
  "evidence.added": "Evidence added",
  "evidence.removed": "Evidence removed",
  "evidence.reordered": "Evidence reordered",
  "analysis.completed": "Analysis completed",
  "analysis.failed": "Analysis failed (previous result kept)",
  "correction.saved": "You corrected the analysis",
  "action.invoice_drafted": "Invoice drafted from an investigation",
  "agent.proposed": "PayAgent drafted an invoice",
  "draft.approved": "You approved an invoice draft",
  "draft.rejected": "You discarded an invoice draft",
  "invoice.created": "Invoice saved",
};

function detail(type: string, p: Record<string, unknown> | null) {
  if (!p) return null;
  if (type === "analysis.completed") return `Version ${p.version}${p.model ? ` · ${p.model}` : ""}${p.reviewCount ? ` · ${p.reviewCount} to review` : ""}`;
  if (type === "evidence.added") return `${p.added} added${p.skippedDuplicates ? `, ${p.skippedDuplicates} duplicate skipped` : ""}`;
  if (type === "invoice.created") return String(p.number ?? "");
  return null;
}

export default async function ActivityPage() {
  const events = await db.select().from(auditEvents).orderBy(desc(auditEvents.createdAt)).limit(100);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-measure flex-col gap-2">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Activity</h1>
        <p className="text-muted">Every analysis, correction and approval, newest first. This log is append-only.</p>
      </div>
      {events.length === 0 ? (
        <EmptyState title="Nothing yet" description="Start an investigation and every step will be recorded here." action={<ButtonLink href="/">Go to your workspace</ButtonLink>} />
      ) : (
        <ol className="tr-surface divide-y divide-line">
          {events.map((e) => {
            const href = e.entityType === "investigation" && e.eventType !== "investigation.deleted" ? `/investigations/${e.entityId}` : e.entityType === "invoice" ? `/invoices/${e.entityId}` : null;
            const d = detail(e.eventType, e.payload as Record<string, unknown> | null);
            return (
              <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 p-4">
                <span>
                  {href ? <Link href={href} className="font-bold underline">{LABELS[e.eventType] ?? e.eventType}</Link> : <span className="font-bold">{LABELS[e.eventType] ?? e.eventType}</span>}
                  {d && <span className="text-muted"> · {d}</span>}
                </span>
                <time className="text-sm text-muted" dateTime={e.createdAt.toISOString()}>{time.format(e.createdAt)}</time>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
