"use client";

import { useRouter } from "next/navigation";
import { ReviewForm } from "@/app/new/ReviewForm";
import type { InvoiceDraft } from "@/lib/invoice-schema";

export function DraftReview({ requestId, draft }: { requestId: string; draft: InvoiceDraft }) {
  const router = useRouter();
  return <ReviewForm requestId={requestId} draft={draft} onDiscarded={() => router.push("/invoices?status=drafts")} />;
}
