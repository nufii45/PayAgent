"use client";

import Link from "next/link";
import { useState, useTransition, type ReactNode } from "react";
import { acknowledgePrivacyNow } from "@/app/actions-workspace";
import { BackButton } from "@/components/ui/BackLink";
import { Button } from "@/components/ui/Button";
import { InfoRow } from "@/components/ui/InfoRow";
import type { PrivacyFacts } from "@/lib/privacy";
import { Stage } from "./Stage";

/**
 * The disclosure shown before any evidence is sent for analysis. Continue records the acknowledgement
 * for this workspace; `checked` is kept by the parent so Back from the next step doesn't clear it.
 * Every statement here must stay true to the code: provider from MODEL_PROVIDER, retention from
 * GUEST_RETENTION_DAYS. See lib/privacy.ts.
 */
export function PrivacyStep({
  facts,
  checked,
  onCheckedChange,
  onContinue,
  onBack,
  markOnboarded,
  header,
}: {
  facts: PrivacyFacts;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  onContinue: () => void;
  onBack?: () => void;
  markOnboarded?: boolean;
  header?: ReactNode;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <Stage
      id="privacy-h"
      header={header}
      title="Before you upload"
      support="Only use conversations you have permission to process."
      aside={
        // A new tab, so reading the details doesn't lose the screenshots and text kept in this flow.
        <Link href="/privacy" target="_blank" className="inline-flex min-h-11 items-center gap-2 self-start font-bold underline underline-offset-2">
          Full privacy and data handling details
          <span className="sr-only">(opens in a new tab)</span>
          <svg aria-hidden="true" className="shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        </Link>
      }
    >
      <ul className="tr-surface flex flex-col divide-y divide-line p-4 sm:p-5">
        <InfoRow title="AI processing" icon={<><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" /></>}>
          Your evidence is sent to {facts.processor} for analysis.
        </InfoRow>
        <InfoRow title="Guest workspace" icon={<><path d="M3 10.5L12 4l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" /><path d="M9 21v-6h6v6" /></>}>
          Your workspace is deleted {facts.retentionDays} days after your last use. Clearing browser data makes it inaccessible.
        </InfoRow>
        <InfoRow title="Your control" icon={<><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" /><path d="M9 12l2 2 4-4" /></>}>
          Blur personal details before uploading. You can delete your workspace in Settings &amp; Privacy.
        </InfoRow>
        <InfoRow title="Payments" icon={<><rect x="3" y="6" width="18" height="13" rx="2" /><path d="M3 10h18M7 15h3" /></>}>
          No real payments are made in this version.
        </InfoRow>
      </ul>

      <label className="flex min-h-11 cursor-pointer items-center gap-3 font-bold">
        <input type="checkbox" className="size-6 shrink-0 accent-action" checked={checked} onChange={(e) => onCheckedChange(e.target.checked)} disabled={pending} />
        I understand how my evidence is processed and stored.
      </label>

      {error && (
        <p role="alert" className="font-semibold text-danger">
          {error}
        </p>
      )}

      {/* In the page flow, not pinned: Continue is only useful after reading down to the checkbox. */}
      <div className={`tr-action-bar tr-action-bar--flow ${onBack ? "tr-action-bar--with-back" : ""}`}>
        {onBack && <BackButton onClick={onBack} disabled={pending} />}
        <Button
          type="button"
          disabled={!checked}
          loading={pending}
          loadingLabel="Saving…"
          onClick={() =>
            start(async () => {
              setError(null);
              try {
                await acknowledgePrivacyNow({ onboarded: markOnboarded });
                onContinue();
              } catch {
                setError("We couldn't save your confirmation. Check your connection and try again.");
              }
            })
          }
        >
          Continue
        </Button>
      </div>
    </Stage>
  );
}
