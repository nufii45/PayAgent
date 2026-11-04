import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { ReturnLink } from "@/components/ui/BackLink";
import { Card } from "@/components/ui/Card";
import { currentWorkspace } from "@/lib/current-workspace";
import { getPendingDraft } from "@/lib/invoices";
import { DraftReview } from "./DraftReview";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoice draft · Traccoon PayAgent" };

export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const ws = await currentWorkspace();
  const d = await getPendingDraft(db, ws.id, id);
  if (!d) notFound();
  const source = (d.validationResult as { source?: { investigationId: string; version: number } }).source;
  return (
    <div className="flex flex-col gap-6">
      <ReturnLink href="/invoices?status=drafts" label="drafts" />
      <div className="flex max-w-measure flex-col gap-2">
        <h1 className="text-3xl font-extrabold">Invoice draft</h1>
        <p className="text-muted">
          {source ? (
            <>
              Drafted from <Link href={`/investigations/${source.investigationId}`} className="font-bold underline">investigation analysis v{source.version}</Link>. Check the evidence there before approving.
            </>
          ) : (
            "Drafted by PayAgent from your message. Check every field before approving."
          )}
        </p>
      </div>
      <Card>
        <DraftReview requestId={d.id} draft={d.draft} />
      </Card>
    </div>
  );
}
