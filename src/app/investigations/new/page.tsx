import { NewInvestigationForm } from "@/components/investigation/NewInvestigationForm";
import { ReturnLink } from "@/components/ui/BackLink";
import { Card } from "@/components/ui/Card";
import { PrivacyPoints } from "@/components/PrivacyPoints";
import { currentWorkspace } from "@/lib/current-workspace";
import { retentionDays } from "@/lib/session";

export const metadata = { title: "New investigation · Traccoon PayAgent" };
export const maxDuration = 120;

export const dynamic = "force-dynamic";

export default async function NewInvestigationPage() {
  const ws = await currentWorkspace();
  return (
    <div className="flex flex-col gap-6">
      <ReturnLink href="/investigations" label="investigations" />
      <div className="flex max-w-measure flex-col gap-2">
        <h1 className="text-3xl font-extrabold">New investigation</h1>
        <p className="text-muted">Add the conversation. PayAgent works out what was agreed, what was paid and what&apos;s unclear, and shows the message behind every conclusion.</p>
      </div>
      <Card>
        <NewInvestigationForm needsAcknowledgement={!ws.privacyAcknowledgedAt} privacy={<PrivacyPoints retentionDays={retentionDays()} />} />
      </Card>
    </div>
  );
}
