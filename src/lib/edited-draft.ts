import { z } from "zod";
import { parseAmount } from "./money";
import type { InvoiceDraft } from "./invoice-schema";

/** What the review form sends back. Amounts are text (as the user typed them), dates are YYYY-MM-DD. */
export const EditedDraftInput = z.object({
  clientName: z.string().trim().min(1, "Enter who the invoice is for"),
  currency: z.enum(["PHP", "USD"]),
  items: z
    .array(
      z.object({
        description: z.string().trim().min(1, "Describe the work"),
        amountText: z.string().trim().min(1, "Enter an amount"),
      }),
    )
    .min(1, "Add at least one line"),
  dueDate: z.iso.date("Pick a due date"),
  notes: z.string().trim().nullable(),
});
export type EditedDraftInput = z.infer<typeof EditedDraftInput>;

export type FieldErrors = Record<string, string>;

/** Server-side re-validation of whatever the user approved. Never trust the browser. */
export function validateEditedDraft(
  input: unknown,
  today: string,
): { ok: true; draft: InvoiceDraft } | { ok: false; errors: FieldErrors } {
  const parsed = EditedDraftInput.safeParse(input);
  if (!parsed.success) {
    return { ok: false, errors: Object.fromEntries(parsed.error.issues.map((i) => [i.path.join("."), i.message])) };
  }
  const v = parsed.data;
  const errors: FieldErrors = {};
  const items = v.items.map((item, idx) => {
    const amount = parseAmount(item.amountText);
    if (!amount.ok) errors[`items.${idx}.amountText`] = "Enter the amount as a number, for example 2,500";
    return { description: item.description, amountCentavos: amount.ok ? amount.centavos : 0 };
  });
  if (v.dueDate < today) errors.dueDate = "The due date can't be in the past";
  if (Object.keys(errors).length) return { ok: false, errors };

  return {
    ok: true,
    draft: {
      clientName: v.clientName,
      currency: v.currency,
      items,
      totalCentavos: items.reduce((s, i) => s + i.amountCentavos, 0),
      dueDate: v.dueDate,
      notes: v.notes || null,
    },
  };
}

/** Field-level differences between what the agent proposed and what the user approved. */
export function diffDrafts(before: InvoiceDraft, after: InvoiceDraft) {
  const changes: { field: string; before: unknown; after: unknown }[] = [];
  const cmp = (field: string, a: unknown, b: unknown) => {
    if (JSON.stringify(a) !== JSON.stringify(b)) changes.push({ field, before: a, after: b });
  };
  cmp("clientName", before.clientName, after.clientName);
  cmp("currency", before.currency, after.currency);
  cmp("items", before.items, after.items);
  cmp("dueDate", before.dueDate, after.dueDate);
  cmp("notes", before.notes, after.notes);
  return changes;
}
