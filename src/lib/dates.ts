// Due dates are resolved by code, never by the model. The model returns a token.
// The Philippines has no daylight saving time, so Manila is always UTC+8.

const MANILA_OFFSET_MS = 8 * 60 * 60 * 1000;
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

/** A calendar date with no time or zone, as "YYYY-MM-DD". */
export type IsoDate = string;

export type DueDateResult =
  | { ok: true; date: IsoDate; needsConfirmation: boolean }
  | { ok: false; error: string };

/** Today's calendar date in Manila, as a UTC-midnight Date for safe arithmetic. */
function manilaToday(now: Date): Date {
  const m = new Date(now.getTime() + MANILA_OFFSET_MS);
  return new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), m.getUTCDate()));
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86_400_000);
}

function iso(d: Date): IsoDate {
  return d.toISOString().slice(0, 10);
}

/**
 * Supported tokens: today, tomorrow, in_<n>_days, this_<weekday>, next_<weekday>,
 * end_of_month, absolute:YYYY-MM-DD.
 *
 * "this_friday" = the coming Friday (today if today is Friday).
 * "next_friday" = the Friday after the coming one is ambiguous in everyday speech,
 * so we resolve it to the first Friday strictly after today and flag it for
 * confirmation when asked on Thursday or Friday, where people disagree most.
 */
export function resolveDueDate(token: string, now: Date = new Date()): DueDateResult {
  const today = manilaToday(now);
  const t = token.trim().toLowerCase();

  if (t === "today") return { ok: true, date: iso(today), needsConfirmation: false };
  if (t === "tomorrow") return { ok: true, date: iso(addDays(today, 1)), needsConfirmation: false };

  const inDays = /^in_(\d{1,3})_days?$/.exec(t);
  if (inDays) return { ok: true, date: iso(addDays(today, Number(inDays[1]))), needsConfirmation: false };

  const weekday = /^(this|next)_([a-z]+)$/.exec(t);
  if (weekday) {
    const target = WEEKDAYS.indexOf(weekday[2] as Weekday);
    if (target === -1) return { ok: false, error: `Unknown weekday in "${token}"` };
    const current = today.getUTCDay();
    let diff = (target - current + 7) % 7;
    if (weekday[1] === "next" && diff === 0) diff = 7;
    const needsConfirmation = weekday[1] === "next" && (diff <= 1 || diff === 7);
    return { ok: true, date: iso(addDays(today, diff)), needsConfirmation };
  }

  if (t === "end_of_month") {
    const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0));
    return { ok: true, date: iso(end), needsConfirmation: false };
  }

  const absolute = /^absolute:(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (absolute) {
    const d = new Date(Date.UTC(+absolute[1], +absolute[2] - 1, +absolute[3]));
    if (iso(d) !== `${absolute[1]}-${absolute[2]}-${absolute[3]}`) {
      return { ok: false, error: `"${token}" is not a real date` };
    }
    if (d < today) return { ok: false, error: "Due date is in the past" };
    return { ok: true, date: iso(d), needsConfirmation: false };
  }

  return { ok: false, error: `Unsupported due date "${token}"` };
}

const displayFormatter = new Intl.DateTimeFormat("en-PH", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export function formatDate(date: IsoDate): string {
  return displayFormatter.format(new Date(`${date}T00:00:00Z`));
}
