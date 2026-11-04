import { AnalyzeFlow } from "@/components/onboarding/AnalyzeFlow";
import { ReturnLink } from "@/components/ui/BackLink";
import { currentWorkspace } from "@/lib/current-workspace";
import { aiProcessor, hasCurrentPrivacyAck } from "@/lib/privacy";
import { retentionDays } from "@/lib/session";

export const metadata = { title: "New investigation · Traccoon PayAgent" };
export const maxDuration = 120;

export const dynamic = "force-dynamic";

export default async function NewInvestigationPage() {
  const ws = await currentWorkspace();
  return (
    <div className="flex flex-col gap-6">
      <ReturnLink href="/" label="dashboard" />
      <AnalyzeFlow facts={{ processor: aiProcessor().short, retentionDays: retentionDays() }} acknowledged={hasCurrentPrivacyAck(ws)} />
    </div>
  );
}
