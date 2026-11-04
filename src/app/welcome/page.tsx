import { PrivacyPoints } from "@/components/PrivacyPoints";
import { currentWorkspace } from "@/lib/current-workspace";
import { retentionDays } from "@/lib/session";
import { Onboarding } from "./Onboarding";

export const dynamic = "force-dynamic";
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
      <Onboarding initial={ws.preferences} privacy={<PrivacyPoints retentionDays={retentionDays()} />} />
    </>
  );
}
