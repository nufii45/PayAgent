import { StatusLabel, type StatusTone } from "./StatusLabel";

const STYLES = {
  draft: { label: "Draft", tone: "neutral" },
  approved: { label: "Approved", tone: "ink" },
  sent: { label: "Sent", tone: "warning" },
  paid: { label: "Paid", tone: "success" },
  partially_paid: { label: "Partly paid", tone: "warning" },
  void: { label: "Cancelled", tone: "danger" },
} as const satisfies Record<string, { label: string; tone: StatusTone }>;

export type InvoiceStatus = keyof typeof STYLES;

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  const s = STYLES[status];
  return <StatusLabel tone={s.tone}>{s.label}</StatusLabel>;
}
