import { z } from "zod";
import { parseAmount } from "./money";
import { resolveDueDate, type IsoDate } from "./dates";

/** What the model is allowed to return. Raw strings and tokens only: no maths. */
export const InvoiceProposal = z.object({
  clientName: z.string().trim().min(1).nullable(),
  currency: z.enum(["PHP", "USD"]).default("PHP"),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1),
        amountText: z.string().trim().min(1),
      }),
    )
    .default([]),
  dueDateToken: z.string().trim().min(1).nullable(),
  notes: z.string().trim().nullable().default(null),
  missingFields: z.array(z.enum(["client", "amount", "dueDate", "description"])).default([]),
  question: z.string().trim().nullable().default(null),
});
export type InvoiceProposal = z.infer<typeof InvoiceProposal>;

export type InvoiceDraft = {
  clientName: string;
  currency: "PHP" | "USD";
  items: { description: string; amountCentavos: number }[];
  totalCentavos: number;
  dueDate: IsoDate;
  notes: string | null;
};

export type DraftResult =
  | { status: "ready"; draft: InvoiceDraft }
  | { status: "needs_confirmation"; draft: InvoiceDraft; question: string }
  | { status: "needs_info"; question: string; missing: string[] }
  | { status: "invalid"; errors: string[] };

/** Turn a model proposal into a validated draft. All amounts and dates are computed here. */
export function proposalToDraft(proposal: InvoiceProposal, now: Date = new Date()): DraftResult {
  const missing = new Set(proposal.missingFields);
  if (!proposal.clientName) missing.add("client");
  if (proposal.items.length === 0) missing.add("amount");
  if (!proposal.dueDateToken) missing.add("dueDate");
  if (missing.size > 0) {
    return {
      status: "needs_info",
      missing: [...missing],
      question: proposal.question ?? defaultQuestion([...missing]),
    };
  }

  const errors: string[] = [];
  const items = proposal.items.map((item) => {
    const amount = parseAmount(item.amountText);
    if (!amount.ok) errors.push(amount.error);
    return { description: item.description, amountCentavos: amount.ok ? amount.centavos : 0 };
  });
  const due = resolveDueDate(proposal.dueDateToken!, now);
  if (!due.ok) errors.push(due.error);
  if (errors.length > 0 || !due.ok) return { status: "invalid", errors };

  const draft: InvoiceDraft = {
    clientName: proposal.clientName!,
    currency: proposal.currency,
    items,
    totalCentavos: items.reduce((sum, i) => sum + i.amountCentavos, 0),
    dueDate: due.date,
    notes: proposal.notes,
  };
  if (due.needsConfirmation) {
    return { status: "needs_confirmation", draft, question: `Should the due date be ${due.date}?` };
  }
  return { status: "ready", draft };
}

function defaultQuestion(missing: string[]): string {
  const labels: Record<string, string> = {
    client: "who the invoice is for",
    amount: "the amount",
    dueDate: "when it's due",
    description: "what the work was",
  };
  return `Tell me ${missing.map((m) => labels[m] ?? m).join(" and ")}.`;
}
