import Link from "next/link";
import { db } from "@/db/client";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { currentWorkspace } from "@/lib/current-workspace";
import { OPEN_INVOICE } from "@/lib/dashboard";
import { formatDate } from "@/lib/dates";
import { listInvoices, listPendingDrafts } from "@/lib/invoices";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoices · Traccoon PayAgent" };

const TABS = [
  { key: "all", label: "All" },
  { key: "drafts", label: "Drafts" },
  { key: "awaiting", label: "Awaiting payment" },
  { key: "paid", label: "Paid" },
  { key: "cancelled", label: "Cancelled" },
] as const;
type Tab = (typeof TABS)[number]["key"];

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const tab: Tab = TABS.some((t) => t.key === status) ? (status as Tab) : "all";
  const ws = await currentWorkspace();
  const [invoices, drafts] = await Promise.all([listInvoices(db, ws.id), listPendingDrafts(db, ws.id)]);
  const shown = invoices.filter((i) => tab === "all" || (tab === "awaiting" && OPEN_INVOICE.includes(i.status)) || (tab === "paid" && i.status === "paid") || (tab === "cancelled" && i.status === "void"));
  const showDrafts = tab === "all" || tab === "drafts";
  const nothing = invoices.length === 0 && drafts.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-measure flex-col gap-2">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Invoices</h1>
          <p className="text-muted">Drafts waiting for approval and the invoices you approved. Draft one from an investigation, or quickly from a message, voice note or screenshot.</p>
        </div>
        <ButtonLink href="/new">Create invoice</ButtonLink>
      </div>

      {nothing ? (
        <EmptyState
          title="No invoices yet"
          description="Draft one from an investigation's agreed items, or describe a finished job and PayAgent will draft it for you to check."
          action={<ButtonLink href="/new">Create invoice</ButtonLink>}
        />
      ) : (
        <>
          <nav aria-label="Filter invoices" className="flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={t.key === "all" ? "/invoices" : `/invoices?status=${t.key}`}
                aria-current={tab === t.key ? "page" : undefined}
                className={`rounded-control border px-3 py-2 font-bold whitespace-nowrap ${tab === t.key ? "border-ink bg-surface" : "border-transparent text-muted hover:bg-surface"}`}
              >
                {t.label}
                {t.key === "drafts" && drafts.length > 0 ? ` (${drafts.length})` : ""}
              </Link>
            ))}
          </nav>

          {showDrafts && drafts.length > 0 && (
            <section aria-labelledby="drafts-h" className="flex flex-col gap-3">
              <h2 id="drafts-h" className="text-xl font-extrabold">Drafts waiting for your approval</h2>
              <ul className="tr-surface divide-y divide-line overflow-hidden">
                {drafts.map((d) => (
                  <li key={d.id}>
                    <Link href={`/invoices/drafts/${d.id}`} className="grid gap-1 p-4 hover:bg-page sm:grid-cols-[7rem_1fr_9rem_9rem] sm:items-center sm:gap-4">
                      <span className="text-sm font-bold text-muted">Draft</span>
                      <span className="font-bold">{d.draft.clientName || "Client not named"}</span>
                      <span className="font-bold tabular-nums sm:text-right">{formatMoney(d.draft.totalCentavos, d.draft.currency)}</span>
                      <span className="text-muted">{d.investigationId ? "From an investigation" : "From a message"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {tab !== "drafts" &&
            (shown.length === 0 ? (
              <p className="tr-surface p-4 text-muted">No invoices in this list.</p>
            ) : (
              <ul className="tr-surface divide-y divide-line overflow-hidden">
                {shown.map((inv) => (
                  <li key={inv.id}>
                    <Link href={`/invoices/${inv.id}`} className="grid gap-1 p-4 hover:bg-page sm:grid-cols-[7rem_1fr_9rem_9rem_8rem] sm:items-center sm:gap-4">
                      <span className="font-mono text-sm text-muted">{inv.number}</span>
                      <span className="font-bold">{inv.clientName}</span>
                      <span className="font-bold tabular-nums sm:text-right">{formatMoney(inv.amountCentavos, inv.currency)}</span>
                      <span className="text-muted">Due {formatDate(inv.dueDate)}</span>
                      <span>
                        <StatusBadge status={inv.status} />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          {tab === "drafts" && drafts.length === 0 && <p className="tr-surface p-4 text-muted">No drafts are waiting.</p>}
        </>
      )}
    </div>
  );
}
