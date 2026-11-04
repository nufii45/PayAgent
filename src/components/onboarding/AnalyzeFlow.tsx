"use client";

import { useState, type ReactNode } from "react";
import type { PrivacyFacts } from "@/lib/privacy";
import { PrivacyStep } from "./PrivacyStep";
import { focusStage } from "./Stage";
import { StepProgress } from "./StepProgress";
import { UploadStep, emptyUpload, type UploadDraft } from "./UploadStep";

/** New investigation: the privacy step first if this workspace hasn't accepted it yet, then upload. */
export function AnalyzeFlow({ facts, acknowledged: ackOnLoad }: { facts: PrivacyFacts; acknowledged: boolean }) {
  const [acknowledged] = useState(ackOnLoad); // see WelcomeFlow
  const [step, setStep] = useState<"privacy" | "upload">(acknowledged ? "upload" : "privacy");
  const [checked, setChecked] = useState(false);
  const [draft, setDraft] = useState<UploadDraft>(emptyUpload);
  const go = (s: "privacy" | "upload") => {
    setStep(s);
    focusStage(`${s}-h`);
  };

  if (step === "privacy")
    return <PrivacyStep facts={facts} checked={checked} onCheckedChange={setChecked} onContinue={() => go("upload")} header={<StepProgress step={1} of={2} />} />;

  return (
    <UploadStep
      draft={draft}
      onDraftChange={setDraft}
      header={!acknowledged && <StepProgress step={2} of={2} />}
      onBack={acknowledged ? undefined : () => go("privacy")}
    />
  );
}

/** Shows the privacy step before anything that sends evidence to the model, e.g. drafting an invoice from a screenshot. */
export function PrivacyGate({ facts, acknowledged, children }: { facts: PrivacyFacts; acknowledged: boolean; children: ReactNode }) {
  const [done, setDone] = useState(acknowledged);
  const [checked, setChecked] = useState(false);
  if (done) return <>{children}</>;
  return <PrivacyStep facts={facts} checked={checked} onCheckedChange={setChecked} onContinue={() => setDone(true)} />;
}
