"use client";

import { useActionState } from "react";
import { updatePreferences } from "@/app/actions-workspace";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { ROLE_LABEL, type BusinessRole, type Preferences } from "@/lib/preferences";

export function PreferencesForm({ initial }: { initial: Preferences }) {
  const [state, action, pending] = useActionState(updatePreferences, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="font-bold">Business role</span>
        <select name="role" defaultValue={initial.role ?? ""} className="tr-input">
          <option value="">Not set</option>
          {(Object.keys(ROLE_LABEL) as BusinessRole[]).map((r) => (
            <option key={r} value={r}>{ROLE_LABEL[r]}</option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-bold">Preferred currency</span>
        <select name="currency" defaultValue={initial.currency ?? "PHP"} className="tr-input">
          <option value="PHP">Philippine peso (PHP)</option>
          <option value="USD">US dollar (USD)</option>
        </select>
      </label>
      <TextField label="Business or display name" hint="Shown as “From” on your invoices." name="displayName" defaultValue={initial.displayName ?? ""} maxLength={80} />
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" loading={pending} loadingLabel="Saving…">Save preferences</Button>
        {state?.saved && !pending && <p role="status" className="font-bold text-success">Saved.</p>}
      </div>
    </form>
  );
}
