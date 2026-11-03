import Link from "next/link";
import type { listInvestigations } from "@/lib/investigations";
import { formatPeso } from "@/lib/money";

export function InvestigationList({ rows }: { rows: Awaited<ReturnType<typeof listInvestigations>> }) {
  return (
    <ul className="tr-surface divide-y divide-line overflow-hidden">
      {rows.map((r) => {
        const a = r.latest?.analysis;
        return (
          <li key={r.id}>
            <Link href={`/investigations/${r.id}`} className="grid gap-1 p-4 hover:bg-page sm:grid-cols-[1fr_10rem_12rem] sm:items-center sm:gap-4">
              <span className="font-bold">{r.title}</span>
              <span className="tabular-nums sm:text-right">{a ? `${formatPeso(a.summary.agreedTotalCentavos)} agreed` : "Not analysed"}</span>
              <span className="text-muted sm:text-right">
                {r.evidenceCount} evidence · {a ? (a.summary.reviewCount ? `${a.summary.reviewCount} to review` : "nothing to review") : "—"}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
