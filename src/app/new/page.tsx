import { PrivacyGate } from "@/components/onboarding/AnalyzeFlow";
import { ReturnLink } from "@/components/ui/BackLink";
import { currentWorkspace } from "@/lib/current-workspace";
import { aiProcessor, hasCurrentPrivacyAck } from "@/lib/privacy";
import { retentionDays } from "@/lib/session";
import { NewInvoice } from "./NewInvoice";

export const metadata = { title: "Draft an invoice · Traccoon PayAgent" };
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const ws = await currentWorkspace();
  return (
    <div className="flex flex-col gap-6">
      <ReturnLink href="/invoices" label="invoices" />
      <PrivacyGate facts={{ processor: aiProcessor().short, retentionDays: retentionDays() }} acknowledged={hasCurrentPrivacyAck(ws)}>
        <div className="flex max-w-measure flex-col gap-2">
          <h1 className="text-3xl font-extrabold">Draft an invoice</h1>
          <p className="text-muted">Describe the job or add a chat screenshot. You&apos;ll check every detail before anything is saved.</p>
        </div>
        <NewInvoice />
      </PrivacyGate>
    </div>
  );
}
