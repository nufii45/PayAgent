const STYLES = {
  draft: { label: "Draft", className: "bg-page text-muted border-line" },
  approved: { label: "Approved", className: "bg-surface text-ink border-line" },
  sent: { label: "Sent", className: "bg-warning-bg text-warning border-warning" },
  paid: { label: "Paid", className: "bg-success-bg text-success border-success" },
  partially_paid: { label: "Partly paid", className: "bg-warning-bg text-warning border-warning" },
  void: { label: "Void", className: "bg-danger-bg text-danger border-danger" },
} as const;

export type InvoiceStatus = keyof typeof STYLES;

/** Status is always shown as text, never by color alone. */
export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const s = STYLES[status];
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm font-bold ${s.className}`}>{s.label}</span>;
}
