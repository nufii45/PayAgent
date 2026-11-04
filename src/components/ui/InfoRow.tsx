import type { ReactNode } from "react";

/** One fact in a hairline-separated list. The parent is a <ul> with `divide-y divide-line`. */
export function InfoRow({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <li className="flex gap-3 py-3 first:pt-0 last:pb-0">
      <svg aria-hidden="true" className="mt-0.5 shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {icon}
      </svg>
      <p className="flex flex-col">
        <strong className="font-extrabold">{title}</strong>
        <span className="text-muted">{children}</span>
      </p>
    </li>
  );
}
