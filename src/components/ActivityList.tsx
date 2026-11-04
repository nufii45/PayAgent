import Link from "next/link";
import { ACTIVITY_LABELS, activityDetail, activityHref, type ActivityEvent } from "@/lib/activity";

const time = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });

export function ActivityList({ events }: { events: ActivityEvent[] }) {
  return (
    <ol className="tr-surface divide-y divide-line">
      {events.map((e) => {
        const href = activityHref(e);
        const label = ACTIVITY_LABELS[e.eventType] ?? e.eventType;
        const d = activityDetail(e.eventType, e.payload as Record<string, unknown> | null);
        return (
          <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-2 p-4">
            <span>
              {href ? <Link href={href} className="font-bold underline">{label}</Link> : <span className="font-bold">{label}</span>}
              {d && <span className="text-muted"> · {d}</span>}
            </span>
            <time className="text-sm text-muted" dateTime={e.createdAt.toISOString()}>{time.format(e.createdAt)}</time>
          </li>
        );
      })}
    </ol>
  );
}
