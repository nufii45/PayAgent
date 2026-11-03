"use client";

import { useState, useTransition } from "react";
import { startInvestigation } from "@/app/investigations/actions";
import { Button, ButtonLink } from "@/components/ui/Button";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { EvidencePicker, Working, type PickedEvidence } from "./EvidencePicker";

export function NewInvestigationForm() {
  const [title, setTitle] = useState("");
  const [instruction, setInstruction] = useState("");
  const [evidence, setEvidence] = useState<PickedEvidence>({ images: [], text: "" });
  const [error, setError] = useState<{ message: string; id?: string } | null>(null);
  const [pending, start] = useTransition();
  const empty = evidence.images.length === 0 && !evidence.text.trim();

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await startInvestigation({ title, instruction, images: evidence.images.map((i) => i.dataUrl), texts: [evidence.text] });
          if (r?.error) setError({ message: r.error, id: r.id });
        });
      }}
    >
      <TextAreaField
        label="What do you want to find out?"
        hint="For example: What did my client and I agree on, and what's still unpaid?"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
        maxLength={1000}
        disabled={pending}
      />
      <EvidencePicker value={evidence} onChange={setEvidence} disabled={pending} />
      <TextField label="Name this investigation (optional)" hint="For example: Ana Reyes website" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} disabled={pending} />
      {pending && <Working label="Analysing the conversation…" />}
      {error && (
        <div role="alert" className="flex flex-col items-start gap-2 rounded-control border-2 border-danger bg-danger-bg p-4 text-danger">
          <p className="font-semibold">{error.message}</p>
          {error.id && <ButtonLink href={`/investigations/${error.id}`} variant="secondary">Open the saved investigation</ButtonLink>}
        </div>
      )}
      <Button type="submit" loading={pending} loadingLabel="Analysing…" disabled={empty} className="self-start">
        Analyse conversation
      </Button>
    </form>
  );
}
