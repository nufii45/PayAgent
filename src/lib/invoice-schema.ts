import { z } from "zod";
import { currenciesInAmounts, currenciesInText, pickCurrency, type Currency } from "./currency";
import { parseAmount } from "./money";
import { formatDate, resolveDueDate, type IsoDate } from "./dates";

/** Missing or blank text becomes null. */
const optionalText = z
  .string()
  .nullish()
  .transform((s) => (s?.trim() ? s.trim() : null));

/** What the model is allowed to return. Raw strings and tokens only: no maths. */
export const InvoiceProposal = z.object({
  clientName: z.string().trim().min(1).nullable(),
  currency: z.enum(["PHP", "USD"]).nullable().default(null),
  items: z
    .array(
      // Nullable so a reply with a known item but no amount (or vice versa) is a
      // follow-up question, not a format error that costs a whole extra model round.
      z.object({
        description: optionalText,
        amountText: optionalText,
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
  currency: Currency;
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
export function proposalToDraft(
  proposal: InvoiceProposal,
  now: Date = new Date(),
  { preferred = "PHP", turns = [], hasImage = false }: { preferred?: Currency; turns?: string[]; hasImage?: boolean } = {},
): DraftResult {
  const missing = new Set(proposal.missingFields);
  if (!proposal.clientName) missing.add("client");
  if (proposal.items.length === 0 || proposal.items.some((i) => !i.amountText)) missing.add("amount");
  if (proposal.items.some((i) => !i.description)) missing.add("description");
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
    const amount = parseAmount(item.amountText!);
    if (!amount.ok) errors.push(amount.error);
    return { description: item.description!, amountCentavos: amount.ok ? amount.centavos : 0 };
  });
  const due = resolveDueDate(proposal.dueDateToken!, now);
  if (!due.ok) errors.push(due.error);
  if (errors.length > 0 || !due.ok) return { status: "invalid", errors };

  // Code decides, not the model: an amount's own mark, then the user's words, then the preference.
  const picked = pickCurrency([currenciesInAmounts(proposal.items.map((i) => i.amountText)), currenciesInText(turns)], preferred);
  // Only a screenshot can name a currency the code can't see, so that's the one case the model's reading counts.
  const currency = !picked.isNamed && hasImage && proposal.currency ? proposal.currency : picked.currency;
  const notices: string[] = [];
  if (picked.conflict) notices.push(`This names both pesos and dollars. I used ${currency} for the whole invoice.`);
  if (due.needsConfirmation) notices.push(`"${proposal.dueDateToken!.replace(/_/g, " ")}" can mean different days. I used ${formatDate(due.date)}.`);

  const draft: InvoiceDraft = {
    clientName: proposal.clientName!,
    currency,
    items,
    totalCentavos: items.reduce((sum, i) => sum + i.amountCentavos, 0),
    dueDate: due.date,
    notes: proposal.notes,
  };
  return notices.length ? { status: "needs_confirmation", draft, question: notices.join(" ") } : { status: "ready", draft };
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
