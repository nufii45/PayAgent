import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { ActivityList } from "@/components/ActivityList";
import { InvestigationList } from "@/components/investigation/InvestigationList";
import { Button, ButtonLink } from "@/components/ui/Button";
import { listActivity } from "@/lib/activity";
import { currentWorkspace } from "@/lib/current-workspace";
import { buildDashboard, receivableText } from "@/lib/dashboard";
import { listInvestigations } from "@/lib/investigations";
import { listInvoices, listPendingDrafts } from "@/lib/invoices";
import { formatMoney } from "@/lib/money";
import { retentionDays } from "@/lib/session";
import { dismissExpired, dismissProfilePrompt } from "./actions-workspace";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dashboard · Traccoon PayAgent" };

function Metric({ href, label, value, children }: { href: string; label: string; value: string; children?: React.ReactNode }) {
  return (
    <Link href={href} className="tr-surface flex flex-col gap-1 p-5 hover:bg-page">
      <span className="text-sm font-bold text-muted">{label}</span>
      <span className="text-2xl font-extrabold tabular-nums">{value}</span>
      {children && <span className="flex flex-col text-sm text-muted">{children}</span>}
    </Link>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/** Small, dismissible nudge to add the name shown as "From" on invoices. Never blocks anything. */
function ProfilePrompt() {
  return (
    <aside aria-labelledby="profile-h" className="tr-surface flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-col gap-1">
        <h2 id="profile-h" className="text-lg font-extrabold">Make invoices yours</h2>
        <p className="text-muted">Add your business name. It appears as “From” on your invoices.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <ButtonLink href="/settings#preferences" variant="secondary">Set up profile →</ButtonLink>
        <form action={dismissProfilePrompt}>
          <button type="submit" className="min-h-11 px-2 font-bold text-muted underline underline-offset-2 hover:text-ink">Not now</button>
        </form>
      </div>
    </aside>
  );
}

export default async function Dashboard() {
  const ws = await currentWorkspace();
  if (!ws.onboardedAt) redirect("/welcome");
  const [investigations, invoices, drafts, activity] = await Promise.all([listInvestigations(db, ws.id), listInvoices(db, ws.id), listPendingDrafts(db, ws.id), listActivity(db, ws.id, 8)]);
  const d = buildDashboard({ investigations, invoices, drafts });
  const empty = investigations.length === 0 && invoices.length === 0 && drafts.length === 0;
  const name = ws.preferences.displayName;
  const showProfilePrompt = !name && !ws.preferences.profilePromptDismissed;

  const expiredNotice = ws.replacedExpired && (
    <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-warning bg-warning-bg p-4 text-warning">
      <p className="max-w-measure">
        <strong>Your earlier workspace is no longer available.</strong> Guest workspaces are deleted after {retentionDays()} days without use, or when you delete them. This is a new, empty
        workspace.
      </p>
      <form action={dismissExpired}>
        <Button type="submit" variant="secondary">OK</Button>
      </form>
    </div>
  );

  // A brand-new workspace: one clear next action instead of a page of zeros.
  if (empty)
    return (
      <div className="flex max-w-measure flex-col gap-6">
        {expiredNotice}
        <section aria-labelledby="empty-h" className="flex flex-col items-start gap-4 py-4">
          <h1 id="empty-h" className="text-3xl font-extrabold sm:text-4xl">Welcome to PayAgent</h1>
          <p className="text-lg text-muted">Your agreements and invoices will appear here.</p>
          <ButtonLink href="/investigations/new" className="w-full sm:w-auto">
            <PlusIcon />
            Analyze a conversation
          </ButtonLink>
        </section>
        {showProfilePrompt && <ProfilePrompt />}
      </div>
    );

  return (
    <div className="flex flex-col gap-8">
      {expiredNotice}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-measure flex-col gap-2">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Financial Overview{name ? <span className="sr-only"> for {name}</span> : null}</h1>
          <p className="text-muted">Understand your agreements, track financial activity, and see what needs your attention.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/investigations/new">New Investigation</ButtonLink>
          <ButtonLink href="/new" variant="secondary">Create Invoice</ButtonLink>
        </div>
      </div>

      {showProfilePrompt && <ProfilePrompt />}

      <section id="overview" aria-label="Summary" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric href="/investigations" label="Investigations" value={String(d.investigationCount)}>
          {d.investigationCount === 0 ? "None yet" : `${investigations.filter((r) => r.latest?.analysis).length} analysed`}
        </Metric>
        <Metric href="/investigations" label="Potential receivables" value={receivableText(d.receivables.totals, "agreed") || formatMoney(0, ws.preferences.currency)}>
          <span>{d.receivables.count
              ? `Agreed in ${d.receivables.count} conversation${d.receivables.count === 1 ? "" : "s"}, not yet invoiced`
              : investigations.some((r) => r.latest?.analysis?.summary.agreedTotalCentavos)
                ? "Everything agreed has been invoiced"
                : "Nothing agreed yet"}</span>
          {receivableText(d.receivables.totals, "disputed") && <span>{receivableText(d.receivables.totals, "disputed")} of it disputed</span>}
          {receivableText(d.receivables.totals, "claimed") && <span>{receivableText(d.receivables.totals, "claimed")} client says paid (unverified)</span>}
          {receivableText(d.receivables.totals, "promised") && <span>{receivableText(d.receivables.totals, "promised")} promised, not paid</span>}
        </Metric>
        <Metric
          href="/invoices?status=awaiting"
          label="Invoices awaiting payment"
          value={d.awaiting.length === 0 ? "0" : String(d.awaiting.reduce((n, a) => n + a.count, 0))}
        >
          {d.awaiting.length === 0 ? "No approved invoices are unpaid" : d.awaiting.map((a) => <span key={a.currency}>{formatMoney(a.total, a.currency)} in {a.count} invoice{a.count === 1 ? "" : "s"}</span>)}
          {d.awaiting.length > 0 && <span>Not marked paid yet</span>}
        </Metric>
        <Metric href="#attention" label="Needs review" value={String(d.needsReview.total)}>
          {d.needsReview.total === 0
            ? "Nothing waiting on you"
            : [
                d.needsReview.findings && `${d.needsReview.findings} finding${d.needsReview.findings === 1 ? "" : "s"}`,
                d.needsReview.drafts && `${d.needsReview.drafts} draft${d.needsReview.drafts === 1 ? "" : "s"} to approve`,
                d.needsReview.failed && `${d.needsReview.failed} failed analysis`,
              ]
                .filter(Boolean)
                .join(" · ")}
        </Metric>
      </section>

      <section id="attention" aria-labelledby="attention-h" className="flex flex-col gap-3">
        <h2 id="attention-h" className="text-xl font-extrabold">Attention required</h2>
        {d.attention.length === 0 ? (
          <p className="tr-surface p-4 text-muted">{empty ? "Nothing here yet. Issues PayAgent finds in your conversations will show up here." : "Nothing needs your attention right now."}</p>
        ) : (
          <ul className="tr-surface divide-y divide-line overflow-hidden">
            {d.attention.slice(0, 8).map((a) => (
              <li key={a.key} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex min-w-0 flex-col gap-1">
                  <span className="font-bold">{a.issue}</span>
                  <span className="text-sm text-muted">
                    <span className="font-bold">{a.status}</span>
                    {a.investigation && <> · {a.investigation.title}</>} · Next: {a.next}
                  </span>
                </span>
                <ButtonLink href={a.href} variant="secondary" className="shrink-0 self-start sm:self-center">
                  Resolve
                </ButtonLink>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <section aria-labelledby="recent-h" className="flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="recent-h" className="text-xl font-extrabold">Recent investigations</h2>
            {investigations.length > 0 && <Link href="/investigations" className="font-bold underline">See all</Link>}
          </div>
          {investigations.length === 0 ? (
            <div className="tr-surface flex flex-col items-start gap-3 p-5">
              <h3 className="text-lg font-extrabold">Your financial workspace starts here.</h3>
              <p className="text-muted">Upload your first conversation and PayAgent will help identify agreements, amounts, and next actions.</p>
              <ButtonLink href="/investigations/new">Analyze a conversation</ButtonLink>
            </div>
          ) : (
            <InvestigationList rows={investigations.slice(0, 5)} />
          )}
        </section>

        <div className="flex flex-col gap-8">
          {d.insights.length > 0 && (
            <section aria-labelledby="insights-h" className="flex flex-col gap-3">
              <h2 id="insights-h" className="text-xl font-extrabold">Insights</h2>
              <ul className="tr-surface flex list-disc flex-col gap-2 p-5 pl-9">
                {d.insights.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </section>
          )}
          <section aria-labelledby="activity-h" className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-3">
              <h2 id="activity-h" className="text-xl font-extrabold">Financial activity</h2>
              {activity.length > 0 && <Link href="/activity" className="font-bold underline">See all</Link>}
            </div>
            {activity.length === 0 ? <p className="tr-surface p-4 text-muted">No activity yet.</p> : <ActivityList events={activity} />}
          </section>
        </div>
      </div>
    </div>
  );
}
