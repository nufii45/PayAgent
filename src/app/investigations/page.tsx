import { db } from "@/db/client";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { listInvestigations } from "@/lib/investigations";
import { InvestigationList } from "@/components/investigation/InvestigationList";

export const dynamic = "force-dynamic";
export const metadata = { title: "Investigations · Traccoon PayAgent" };

export default async function InvestigationsPage() {
  const rows = await listInvestigations(db);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-measure flex-col gap-2">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Investigations</h1>
          <p className="text-muted">Each one reconstructs what you and a client agreed from your conversation.</p>
        </div>
        {rows.length > 0 && <ButtonLink href="/investigations/new">New investigation</ButtonLink>}
      </div>
      {rows.length === 0 ? (
        <EmptyState
          title="No investigations yet"
          description="Upload screenshots of a client conversation. PayAgent builds a timeline of what was offered, agreed, changed and paid, with the message behind each point."
          action={<ButtonLink href="/investigations/new">Start an investigation</ButtonLink>}
        />
      ) : (
        <InvestigationList rows={rows} />
      )}
    </div>
  );
}
