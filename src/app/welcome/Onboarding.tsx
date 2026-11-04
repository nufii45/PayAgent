"use client";

import { useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { finishOnboarding, skipOnboarding } from "@/app/actions-workspace";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/Field";
import { ROLE_LABEL, type BusinessRole, type Preferences } from "@/lib/preferences";

function Submit({ children, disabled, variant, formAction }: { children: ReactNode; disabled?: boolean; variant?: "primary" | "secondary"; formAction?: () => Promise<void> }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant={variant} disabled={disabled} loading={pending} formAction={formAction}>
      {children}
    </Button>
  );
}

const STEPS = 3;

export function Onboarding({ initial, privacy }: { initial: Preferences; privacy: ReactNode }) {
  const [step, setStep] = useState(1);
  const [role, setRole] = useState<BusinessRole | "">(initial.role ?? "");
  const [currency, setCurrency] = useState(initial.currency ?? "PHP");
  const [displayName, setDisplayName] = useState(initial.displayName ?? "");
  const [acknowledged, setAcknowledged] = useState(false);

  return (
    <form action={finishOnboarding} className="tr-surface flex flex-col gap-6 p-6 sm:p-8">
      <p className="text-sm font-bold text-muted" aria-live="polite">
        Step {step} of {STEPS}
      </p>

      <section hidden={step !== 1} className="flex flex-col gap-5">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Your conversations hold more than messages.</h1>
        <p className="text-lg text-muted">PayAgent helps uncover agreements, financial commitments, and missing information from your business conversations.</p>
        <ul className="grid gap-3 sm:grid-cols-3">
          {["Understand business conversations.", "Reconstruct financial agreements.", "Turn findings into actionable workflows."].map((t) => (
            <li key={t} className="rounded-control border border-line bg-page p-4 font-bold">{t}</li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => setStep(2)}>Set up workspace</Button>
          <Submit variant="secondary" formAction={skipOnboarding}>Explore workspace</Submit>
        </div>
        <p className="text-sm text-muted">No sign-up. This is a private guest workspace in this browser.</p>
      </section>

      <section hidden={step !== 2} className="flex flex-col gap-5">
        <h1 className="text-3xl font-extrabold">Make this workspace yours.</h1>
        <p className="text-muted">All optional. It fills in your invoice drafts and helps PayAgent read your conversations in context.</p>
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-1 font-bold">What best describes you?</legend>
          {(Object.keys(ROLE_LABEL) as BusinessRole[]).map((r) => (
            <label key={r} className="flex items-center gap-3 rounded-control border border-line p-3 has-[:checked]:border-ink has-[:checked]:bg-page">
              <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="size-5" />
              {ROLE_LABEL[r]}
            </label>
          ))}
        </fieldset>
        <label className="flex flex-col gap-1">
          <span className="font-bold">Preferred currency</span>
          <select name="currency" value={currency} onChange={(e) => setCurrency(e.target.value as "PHP" | "USD")} className="tr-input">
            <option value="PHP">Philippine peso (PHP)</option>
            <option value="USD">US dollar (USD)</option>
          </select>
        </label>
        <TextField label="Business or display name (optional)" hint="Shown as “From” on your invoices." name="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} />
        <div className="flex flex-wrap gap-3">
          <Button type="button" onClick={() => setStep(3)}>Continue</Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setRole("");
              setDisplayName("");
              setStep(3);
            }}
          >
            Skip for now
          </Button>
        </div>
      </section>

      <section hidden={step !== 3} className="flex flex-col gap-5">
        <h1 className="text-3xl font-extrabold">Your conversations stay under your control.</h1>
        {privacy}
        <label className="flex items-start gap-3 font-bold">
          <input type="checkbox" name="acknowledge" className="mt-1 size-5" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} />
          I understand how my evidence is processed and stored.
        </label>
        <div className="flex flex-wrap gap-3">
          <Submit disabled={!acknowledged}>Enter workspace</Submit>
          <Button type="button" variant="secondary" onClick={() => setStep(2)}>Back</Button>
        </div>
      </section>
    </form>
  );
}
