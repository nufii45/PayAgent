import Link from "next/link";
import { db } from "@/db/client";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { formatDate } from "@/lib/dates";
import { listInvoices } from "@/lib/invoices";
import { formatPeso } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function Home() {
  const invoices = await listInvoices(db);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-measure flex-col gap-2">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Invoices</h1>
          <p className="text-muted">Paste a chat or describe the job. PayAgent drafts the invoice and nothing is saved until you approve it.</p>
        </div>
        {invoices.length > 0 && <ButtonLink href="/new">Draft an invoice</ButtonLink>}
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices yet"
          description="Describe a job you finished, or add a chat screenshot, and PayAgent will draft the invoice for you to check."
          action={<ButtonLink href="/new">Draft an invoice</ButtonLink>}
        />
      ) : (
        <ul className="tr-surface divide-y divide-line overflow-hidden">
          {invoices.map((inv) => (
            <li key={inv.id}>
              <Link href={`/invoices/${inv.id}`} className="grid gap-1 p-4 hover:bg-page sm:grid-cols-[7rem_1fr_9rem_9rem_8rem] sm:items-center sm:gap-4">
                <span className="font-mono text-sm text-muted">{inv.number}</span>
                <span className="font-bold">{inv.clientName}</span>
                <span className="font-bold tabular-nums sm:text-right">{formatPeso(inv.amountCentavos)}</span>
                <span className="text-muted">Due {formatDate(inv.dueDate)}</span>
                <span>
                  <StatusBadge status={inv.status} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
