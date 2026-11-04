import { WelcomeFlow } from "@/components/onboarding/WelcomeFlow";
import { currentWorkspace } from "@/lib/current-workspace";
import { aiProcessor, hasCurrentPrivacyAck } from "@/lib/privacy";
import { retentionDays } from "@/lib/session";

export const dynamic = "force-dynamic";
export const maxDuration = 120;
export const metadata = { title: "Welcome · Traccoon PayAgent" };

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  const ws = await currentWorkspace();
  return (
    <>
      <p className="text-lg font-extrabold">Traccoon PayAgent</p>
      {deleted && (
        <p role="status" className="rounded-card border border-success bg-success-bg p-4 font-bold text-success">
          Your workspace and everything in it were deleted. This is a new, empty workspace.
        </p>
      )}
      <WelcomeFlow facts={{ processor: aiProcessor().short, retentionDays: retentionDays() }} acknowledged={hasCurrentPrivacyAck(ws)} />
    </>
  );
}
