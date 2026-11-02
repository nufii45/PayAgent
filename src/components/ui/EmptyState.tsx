import type { ReactNode } from "react";

/** Says what's missing and offers exactly one next action. */
export function EmptyState({ title, description, action }: { title: string; description: string; action: ReactNode }) {
  return (
    <div className="tr-surface flex flex-col items-start gap-3 p-6">
      <h2 className="text-xl font-extrabold">{title}</h2>
      <p className="text-muted">{description}</p>
      {action}
    </div>
  );
}
