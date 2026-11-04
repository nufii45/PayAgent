import { db } from "@/db/client";
import { ActivityList } from "@/components/ActivityList";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { listActivity } from "@/lib/activity";
import { currentWorkspace } from "@/lib/current-workspace";

export const dynamic = "force-dynamic";
export const metadata = { title: "Activity · Traccoon PayAgent" };

export default async function ActivityPage() {
  const ws = await currentWorkspace();
  const events = await listActivity(db, ws.id);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-measure flex-col gap-2">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Activity</h1>
        <p className="text-muted">Every analysis, correction and approval in this workspace, newest first. AI results and your own corrections are listed separately. This log is append-only.</p>
      </div>
      {events.length === 0 ? (
        <EmptyState title="Nothing yet" description="Start an investigation and every step will be recorded here." action={<ButtonLink href="/investigations/new">Start an investigation</ButtonLink>} />
      ) : (
        <ActivityList events={events} />
      )}
    </div>
  );
}
