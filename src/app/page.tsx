import Link from "next/link";
import { db } from "@/db/client";
import { InvestigationList } from "@/components/investigation/InvestigationList";
import { NewInvestigationForm } from "@/components/investigation/NewInvestigationForm";
import { Card } from "@/components/ui/Card";
import { listInvestigations } from "@/lib/investigations";
import { listInvoices } from "@/lib/invoices";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export default async function Workspace() {
  const [investigations, invoices] = await Promise.all([listInvestigations(db), listInvoices(db)]);
  const toReview = investigations.filter((i) => (i.latest?.analysis?.summary.reviewCount ?? 0) > 0);
  return (
    <div className="flex flex-col gap-8">
      <div className="flex max-w-measure flex-col gap-2">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Your Financial Workspace</h1>
        <p className="text-muted">Turn conversations and business records into clear financial actions.</p>
      </div>

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-extrabold">Investigate a conversation</h2>
        <p className="max-w-measure text-muted">
          Upload the chat where you and a client worked things out. PayAgent rebuilds what was offered, agreed, changed, promised and paid, flags what doesn&apos;t add up, and links every
          conclusion to the message behind it. Nothing is invoiced or sent without you.
        </p>
        <NewInvestigationForm />
        <p className="text-sm text-muted">
          Just need a quick invoice from a message or voice note? <Link href="/new" className="font-bold underline">Draft one directly</Link>.
        </p>
      </Card>

      {toReview.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="review-h">
          <h2 id="review-h" className="text-xl font-extrabold">Waiting for your review</h2>
          <InvestigationList rows={toReview.slice(0, 5)} />
        </section>
      )}

      {investigations.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="recent-h">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="recent-h" className="text-xl font-extrabold">Recent investigations</h2>
            <Link href="/investigations" className="font-bold underline">See all</Link>
          </div>
          <InvestigationList rows={investigations.slice(0, 5)} />
        </section>
      )}

      {invoices.length > 0 && (
        <section className="flex flex-col gap-3" aria-labelledby="inv-h">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="inv-h" className="text-xl font-extrabold">Recent invoices</h2>
            <Link href="/invoices" className="font-bold underline">See all</Link>
          </div>
          <ul className="tr-surface divide-y divide-line overflow-hidden">
            {invoices.slice(0, 5).map((inv) => (
              <li key={inv.id}>
                <Link href={`/invoices/${inv.id}`} className="flex flex-wrap justify-between gap-2 p-4 hover:bg-page">
                  <span>
                    <span className="font-mono text-sm text-muted">{inv.number}</span> <span className="font-bold">{inv.clientName}</span>
                  </span>
                  <span className="font-bold tabular-nums">{formatMoney(inv.amountCentavos, inv.currency)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
