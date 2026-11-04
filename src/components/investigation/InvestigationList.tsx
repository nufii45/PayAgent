import Link from "next/link";
import { investigationStatus, type InvestigationRow, type InvestigationStatus } from "@/lib/dashboard";
import { formatPeso } from "@/lib/money";

const date = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" });

const STATUS_STYLE: Record<InvestigationStatus, string> = {
  Analyzing: "bg-page text-muted border-line",
  "Not analysed": "bg-page text-muted border-line",
  "Analysis failed": "bg-danger-bg text-danger border-danger",
  "Needs clarification": "bg-warning-bg text-warning border-warning",
  "Ready for review": "bg-warning-bg text-warning border-warning",
  "Up to date": "bg-success-bg text-success border-success",
};

export function InvestigationStatusBadge({ status }: { status: InvestigationStatus }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-bold whitespace-nowrap ${STATUS_STYLE[status]}`}>{status}</span>;
}

export function InvestigationList({ rows }: { rows: InvestigationRow[] }) {
  const now = new Date();
  return (
    <ul className="tr-surface divide-y divide-line overflow-hidden">
      {rows.map((r) => {
        const a = r.latest?.analysis;
        const status = investigationStatus(r, now);
        return (
          <li key={r.id}>
            <Link href={`/investigations/${r.id}`} className="grid gap-1 p-4 hover:bg-page sm:grid-cols-[minmax(0,1fr)_9rem_10rem] sm:items-center sm:gap-4">
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-bold">{r.title}</span>
                <span className="text-sm text-muted">
                  {a?.summary.clientName ?? "Client not named"} · {r.latestAt ? `analysed ${date.format(new Date(r.latestAt))}` : `${r.evidenceCount} evidence`}
                  {a && a.summary.reviewCount > 0 ? ` · ${a.summary.reviewCount} unresolved` : ""}
                </span>
              </span>
              <span className="font-bold tabular-nums sm:text-right">{a && a.summary.agreedTotalCentavos > 0 ? formatPeso(a.summary.agreedTotalCentavos) : "—"}</span>
              <span className="sm:text-right">
                <InvestigationStatusBadge status={status} />
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
