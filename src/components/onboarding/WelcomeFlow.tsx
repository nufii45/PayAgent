"use client";

import { useState, useTransition } from "react";
import { skipOnboarding } from "@/app/actions-workspace";
import { BackButton } from "@/components/ui/BackLink";
import { Button } from "@/components/ui/Button";
import type { PrivacyFacts } from "@/lib/privacy";
import { PrivacyStep } from "./PrivacyStep";
import { Stage, focusStage } from "./Stage";
import { StepProgress } from "./StepProgress";
import { UploadStep, emptyUpload, type UploadDraft } from "./UploadStep";
import { WelcomeDemo } from "./WelcomeDemo";

type Step = "welcome" | "choose" | "privacy" | "upload";

const Chevron = () => (
  <svg aria-hidden="true" className="shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18l6-6-6-6" />
  </svg>
);

/**
 * First-run flow: see the value, choose where to start, privacy, upload. Everything entered is kept
 * in this component, so Back never loses it. "Explore dashboard" exits to a real, empty workspace.
 */
export function WelcomeFlow({ facts, acknowledged: ackOnLoad }: { facts: PrivacyFacts; acknowledged: boolean }) {
  // Fixed for this visit: accepting the note re-renders the page with acknowledged=true, but the
  // user's path (and Back) should still include the privacy step they just saw.
  const [acknowledged] = useState(ackOnLoad);
  const [step, setStep] = useState<Step>("welcome");
  const [checked, setChecked] = useState(false);
  const [draft, setDraft] = useState<UploadDraft>(emptyUpload);
  const [exploring, startExplore] = useTransition();

  // Always four steps. A workspace that already accepted the privacy note skips step 3, which then shows as done.
  const path: Step[] = ["welcome", "choose", "privacy", "upload"];
  const go = (s: Step) => {
    setStep(s);
    window.scrollTo({ top: 0 });
    focusStage(`${s}-h`);
  };
  const progress = <StepProgress step={path.indexOf(step) + 1} of={path.length} />;
  const explore = () => startExplore(() => skipOnboarding());

  if (step === "welcome")
    return (
      <Stage
        id="welcome-h"
        header={progress}
        title="Turn conversations into clear agreements."
        support="Find payment terms, spot missing details, and prepare an invoice."
        aside={
          <div className="tr-action-bar tr-action-bar--flow tr-action-bar--start mt-2">
            <Button type="button" onClick={() => go("choose")}>
              Get started
            </Button>
            <Button type="button" variant="secondary" onClick={explore} loading={exploring} loadingLabel="Opening…">
              Explore dashboard
            </Button>
            <p className="text-center text-sm text-muted sm:text-start">No account required.</p>
          </div>
        }
      >
        <WelcomeDemo />
      </Stage>
    );

  if (step === "choose")
    return (
      <Stage id="choose-h" header={progress} title="How would you like to start?" support="Choose an option to continue.">
        <div className="grid gap-4">
          <button type="button" className="tr-choice tr-choice--strong flex-row items-center gap-4" onClick={() => go(acknowledged ? "upload" : "privacy")}>
            <svg aria-hidden="true" className="shrink-0" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
              <path d="M8.5 12h7M12 8.5v7" />
            </svg>
            <span className="flex flex-1 flex-col gap-1">
              <span className="text-lg font-extrabold">Analyze a conversation</span>
              <span className="text-on-action-muted">Upload screenshots or paste messages.</span>
            </span>
            <Chevron />
          </button>
          <button type="button" className="tr-choice flex-row items-center gap-4" onClick={explore} disabled={exploring} aria-busy={exploring || undefined}>
            <svg aria-hidden="true" className="shrink-0" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="9" rx="1.5" />
              <rect x="14" y="3" width="7" height="5" rx="1.5" />
              <rect x="14" y="12" width="7" height="9" rx="1.5" />
              <rect x="3" y="16" width="7" height="5" rx="1.5" />
            </svg>
            <span className="flex flex-1 flex-col gap-1">
              <span className="text-lg font-extrabold">{exploring ? "Opening…" : "Explore the dashboard"}</span>
              <span className="text-muted">Take a look around first.</span>
            </span>
            <Chevron />
          </button>
        </div>
        <div className="tr-action-bar tr-action-bar--flow">
          <BackButton onClick={() => go("welcome")} />
        </div>
      </Stage>
    );

  if (step === "privacy")
    return <PrivacyStep facts={facts} checked={checked} onCheckedChange={setChecked} markOnboarded onContinue={() => go("upload")} onBack={() => go("choose")} header={progress} />;

  return <UploadStep draft={draft} onDraftChange={setDraft} header={progress} onBack={() => go(acknowledged ? "choose" : "privacy")} />;
}
