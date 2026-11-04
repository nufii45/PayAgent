import type { ReactNode } from "react";

const DOT = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  neutral: "bg-muted",
  ink: "bg-ink",
} as const;

export type StatusTone = keyof typeof DOT;

/** A status in a row or heading. The words carry it; the dot only helps scanning, so it's hidden from screen readers. */
export function StatusLabel({ tone, children }: { tone: StatusTone; children: ReactNode }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2 text-sm font-bold whitespace-nowrap text-ink">
      <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${DOT[tone]}`} />
      {children}
    </span>
  );
}
