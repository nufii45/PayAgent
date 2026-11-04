"use client";

import { useState, useTransition, type FormEvent } from "react";
import { updatePreferences } from "@/app/actions-workspace";
import { Button, ButtonLink } from "@/components/ui/Button";
import { SelectField, TextField } from "@/components/ui/Field";
import { ROLE_LABEL, type BusinessRole, type Preferences } from "@/lib/preferences";

export function PreferencesForm({ initial }: { initial: Preferences }) {
  // Controlled, so a failed save keeps what was typed.
  const [values, setValues] = useState({ displayName: initial.displayName ?? "", role: initial.role ?? "", currency: initial.currency ?? "PHP" });
  const [baseline, setBaseline] = useState(values);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSave] = useTransition();
  const dirty = JSON.stringify(values) !== JSON.stringify(baseline);

  const set = (patch: Partial<typeof values>) => {
    setValues((v) => ({ ...v, ...patch }));
    setJustSaved(false);
  };

  function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const sent = { ...values, displayName: values.displayName.trim() };
    setError(null);
    setJustSaved(false);
    startSave(async () => {
      try {
        await updatePreferences(form);
        setBaseline(sent);
        setValues((v) => (JSON.stringify(v) === JSON.stringify(values) ? sent : v));
        setJustSaved(true);
      } catch {
        setError("We couldn't save your changes. They're still here, so check your connection and try again.");
      }
    });
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-4">
      <TextField
        label="Business or display name"
        hint="Shown on your invoices."
        name="displayName"
        value={values.displayName}
        onChange={(e) => set({ displayName: e.target.value })}
        maxLength={80}
      />
      <div className="grid items-start gap-4 md:grid-cols-2">
        <SelectField label="Business role" name="role" value={values.role} onChange={(e) => set({ role: e.target.value as BusinessRole | "" })}>
          <option value="">Not set</option>
          {(Object.keys(ROLE_LABEL) as BusinessRole[]).map((r) => (
            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
          ))}
        </SelectField>
        <div className="flex flex-col gap-1.5">
          <SelectField label="Preferred currency" name="currency" value={values.currency} onChange={(e) => set({ currency: e.target.value as "PHP" | "USD" })} aria-describedby="currency-hint">
            <option value="PHP">Philippine peso (PHP)</option>
            <option value="USD">US dollar (USD)</option>
          </SelectField>
          {/* Below the control, so the two selects still line up. */}
          <p id="currency-hint" className="text-sm text-muted">Used for new invoices when the conversation doesn&apos;t name a currency.</p>
        </div>
      </div>
      {error && <p role="alert" className="font-semibold text-danger">{error}</p>}
      <div className="tr-action-bar tr-action-bar--flow">
        <p role="status" className={`text-sm font-bold empty:hidden sm:me-auto ${justSaved && !dirty ? "text-success" : "text-muted"}`}>
          {saving ? "" : dirty ? "Unsaved changes" : justSaved ? "Changes saved" : ""}
        </p>
        <ButtonLink
          href="/welcome"
          variant="secondary"
          onClick={(e) => {
            if (dirty && !window.confirm("Leave without saving your changes?")) e.preventDefault();
          }}
        >
          View onboarding
        </ButtonLink>
        <Button type="submit" loading={saving} loadingLabel="Saving…" disabled={!dirty}>Save changes</Button>
      </div>
    </form>
  );
}
