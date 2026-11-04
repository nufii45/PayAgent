import Link from "next/link";
import { investigationStatus, type InvestigationRow, type InvestigationStatus } from "@/lib/dashboard";
import { moneyText } from "@/lib/investigation/reconcile";
import { formatMoney } from "@/lib/money";
import { StatusLabel, type StatusTone } from "@/components/ui/StatusLabel";

const date = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeZone: "Asia/Manila" });

const STATUS_TONE: Record<InvestigationStatus, StatusTone> = {
  Analyzing: "neutral",
  "Not analysed": "neutral",
  "Analysis failed": "danger",
  "Needs clarification": "warning",
  "Ready for review": "warning",
  "Up to date": "success",
};

export function InvestigationStatusBadge({ status }: { status: InvestigationStatus }) {
  return <StatusLabel tone={STATUS_TONE[status]}>{status}</StatusLabel>;
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
              <span className="font-bold tabular-nums sm:text-right">{a && a.summary.agreedTotalCentavos > 0 ? moneyText(a, "agreed", formatMoney) : "—"}</span>
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
