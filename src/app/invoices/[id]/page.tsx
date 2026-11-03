import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { describeStep } from "@/lib/describe-step";
import { ReturnLink } from "@/components/ui/BackLink";
import { Card } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { AgentStep } from "@/lib/ai/agent";
import { formatDate } from "@/lib/dates";
import { getInvoiceWithTimeline } from "@/lib/invoices";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

const time = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "medium", timeZone: "Asia/Manila" });

type Payload = Record<string, unknown>;

function TimelineEntry({ eventType, payload }: { eventType: string; payload: Payload | null }) {
  const p = payload ?? {};
  switch (eventType) {
    case "agent.proposed": {
      const steps = (p.steps as AgentStep[]) ?? [];
      const turns = (p.turns as string[]) ?? [];
      return (
        <div className="flex flex-col gap-2">
          <p className="font-bold">
            PayAgent drafted the invoice <span className="font-normal text-muted">({String(p.model)}, {((Number(p.latencyMs) || 0) / 1000).toFixed(1)} s)</span>
          </p>
          {turns.map((t, i) => (
            <p key={i} className="rounded-control border-2 border-line bg-page p-2 text-sm whitespace-pre-wrap">
              {i > 0 && <span className="font-bold">Answer: </span>}
              {t}
            </p>
          ))}
          {steps.length > 0 && (
            <ul className="list-disc pl-5 text-sm text-muted">
              {steps.map((s, i) => (
                <li key={i}>{describeStep(s)}</li>
              ))}
            </ul>
          )}
        </div>
      );
    }
    case "draft.approved": {
      const edits = (p.edits as { field: string }[]) ?? [];
      return (
        <p className="font-bold">
          You approved the draft
          <span className="font-normal text-muted">{edits.length ? ` after changing ${edits.map((e) => e.field).join(", ")}` : " without changes"}</span>
        </p>
      );
    }
    case "invoice.created":
      return <p className="font-bold">Invoice {String(p.number)} saved</p>;
    default:
      return <p className="font-bold">{eventType}</p>;
  }
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const data = await getInvoiceWithTimeline(db, id);
  if (!data) notFound();
  const { invoice, items, timeline } = data;

  return (
    <div className="flex flex-col gap-6">
      <ReturnLink href="/" label="invoices" />
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-extrabold">Invoice {invoice.number}</h1>
        <StatusBadge status={invoice.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <Card className="flex flex-col gap-5">
          <dl className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-muted">Client</dt>
              <dd className="font-bold">{invoice.clientName}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Due</dt>
              <dd className="font-bold">{formatDate(invoice.dueDate)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Total</dt>
              <dd className="text-xl font-extrabold tabular-nums">{formatMoney(invoice.amountCentavos, invoice.currency)}</dd>
            </div>
          </dl>
          <table className="w-full text-left">
            <caption className="sr-only">Invoice lines</caption>
            <thead>
              <tr className="border-b-2 border-line text-sm text-muted">
                <th scope="col" className="py-2 font-semibold">Description</th>
                <th scope="col" className="py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-line">
                  <td className="py-2 pr-4">{item.description}</td>
                  <td className="py-2 text-right tabular-nums">{formatMoney(item.amountCentavos, invoice.currency)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {invoice.notes && <p className="text-muted">{invoice.notes}</p>}
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="text-xl font-extrabold">Activity</h2>
          {timeline.length === 0 ? (
            <p className="text-muted">This invoice was added directly, so there is no agent activity.</p>
          ) : (
            <ol className="flex flex-col gap-4 border-l-2 border-line pl-4">
              {timeline.map((e) => (
                <li key={e.id} className="flex flex-col gap-1">
                  <time className="text-sm text-muted" dateTime={e.createdAt.toISOString()}>
                    {time.format(e.createdAt)}
                  </time>
                  <TimelineEntry eventType={e.eventType} payload={e.payload as Payload | null} />
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>
    </div>
  );
}
