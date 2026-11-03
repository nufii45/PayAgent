"use client";

import { useState, useTransition } from "react";
import { approveDraft, rejectDraft } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { formatDate } from "@/lib/dates";
import type { InvoiceDraft } from "@/lib/invoice-schema";
import { formatMoney, parseAmount } from "@/lib/money";

const toAmountText = (centavos: number) => (centavos / 100).toFixed(2);

export function ReviewForm({
  requestId,
  draft,
  notice,
  onDiscarded,
}: {
  requestId: string;
  draft: InvoiceDraft;
  notice?: string;
  onDiscarded: () => void;
}) {
  const [clientName, setClientName] = useState(draft.clientName);
  const [items, setItems] = useState(draft.items.map((i) => ({ description: i.description, amountText: toAmountText(i.amountCentavos) })));
  const [dueDate, setDueDate] = useState(draft.dueDate);
  const [notes, setNotes] = useState(draft.notes ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [approving, startApprove] = useTransition();
  const [discarding, startDiscard] = useTransition();

  const parsed = items.map((i) => parseAmount(i.amountText));
  const total = parsed.every((p) => p.ok) ? parsed.reduce((s, p) => s + (p.ok ? p.centavos : 0), 0) : null;

  const updateItem = (idx: number, key: "description" | "amountText", value: string) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [key]: value } : it)));

  function approve(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    startApprove(async () => {
      const res = await approveDraft(requestId, { clientName, currency: draft.currency, items, dueDate, notes: notes || null });
      if (res?.errors) setErrors(res.errors);
      if (res?.error) setFormError(res.error);
    });
  }

  function discard() {
    startDiscard(async () => {
      await rejectDraft(requestId);
      onDiscarded();
    });
  }

  return (
    <form onSubmit={approve} className="flex flex-col gap-5" noValidate>
      {notice && (
        <p role="status" className="rounded-control border-2 border-warning bg-warning-bg p-3 font-semibold text-warning">
          {notice}
        </p>
      )}
      <TextField label="Client" value={clientName} onChange={(e) => setClientName(e.target.value)} error={errors.clientName} />

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-2 font-bold">Work and amounts ({draft.currency})</legend>
        {items.map((item, idx) => (
          <div key={idx} className="grid gap-3 sm:grid-cols-[1fr_10rem]">
            <TextField
              label={`Description${items.length > 1 ? ` (line ${idx + 1})` : ""}`}
              value={item.description}
              onChange={(e) => updateItem(idx, "description", e.target.value)}
              error={errors[`items.${idx}.description`]}
            />
            <TextField
              label="Amount"
              inputMode="decimal"
              value={item.amountText}
              onChange={(e) => updateItem(idx, "amountText", e.target.value)}
              error={errors[`items.${idx}.amountText`]}
            />
          </div>
        ))}
        <p className="text-lg font-extrabold" aria-live="polite">
          Total: {total != null ? formatMoney(total, draft.currency) : "check the amounts above"}
        </p>
      </fieldset>

      <TextField
        label="Due date"
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        hint={dueDate ? formatDate(dueDate) : undefined}
        error={errors.dueDate}
      />
      <TextAreaField label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

      {formError && (
        <p role="alert" className="font-semibold text-danger">
          {formError}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={approving} loadingLabel="Saving invoice…" disabled={discarding}>
          Approve and save invoice
        </Button>
        <Button type="button" variant="secondary" onClick={discard} loading={discarding} loadingLabel="Discarding…" disabled={approving}>
          Discard draft
        </Button>
      </div>
      <p className="text-sm text-muted">Nothing is saved as an invoice until you approve it.</p>
    </form>
  );
}
