"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition, type Dispatch, type KeyboardEvent, type ReactNode, type SetStateAction } from "react";
import { rerunAnalysis, startInvestigation } from "@/app/investigations/actions";
import { EvidencePicker, Working, type PickedEvidence } from "@/components/investigation/EvidencePicker";
import { BackButton } from "@/components/ui/BackLink";
import { Button, ButtonLink } from "@/components/ui/Button";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { Stage } from "./Stage";

type Tab = "screenshots" | "text";
export type UploadDraft = { tab: Tab; evidence: PickedEvidence; instruction: string; title: string };
export const emptyUpload: UploadDraft = { tab: "screenshots", evidence: { images: [], text: "" }, instruction: "", title: "" };

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  {
    id: "screenshots",
    label: "Screenshots",
    icon: (
      <>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <circle cx="9" cy="9" r="2" />
        <path d="M21 15l-5-5L5 21" />
      </>
    ),
  },
  { id: "text", label: "Paste text", icon: <path d="M4 6h16M4 12h16M4 18h10" /> },
];

/**
 * Add a conversation and start the first analysis. The draft lives in the parent so Back and forward
 * between steps keeps it. On success the server redirects to the agreement review.
 */
export function UploadStep({ draft, onDraftChange, header, onBack }: { draft: UploadDraft; onDraftChange: Dispatch<SetStateAction<UploadDraft>>; header?: ReactNode; onBack?: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  // A failure with an id means the evidence was saved and only the analysis failed.
  const [failure, setFailure] = useState<{ message: string; id?: string } | null>(null);
  const { evidence, tab } = draft;
  const ready = tab === "screenshots" ? evidence.images.length > 0 : !!evidence.text.trim();
  const locked = pending || !!failure?.id;
  const statusRef = useRef<HTMLDivElement>(null);
  // Bring the loading or error message into view; on a phone the sticky actions can cover it.
  useEffect(() => {
    if (pending || failure) statusRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [pending, failure]);

  function analyze() {
    setFailure(null);
    start(async () => {
      try {
        // Only what's on the active tab: never send content the user can't currently see.
        const r = await startInvestigation({
          title: draft.title,
          instruction: draft.instruction,
          images: tab === "screenshots" ? evidence.images.map((i) => i.dataUrl) : [],
          texts: tab === "text" ? [evidence.text] : [],
        });
        if (r?.error) setFailure({ message: r.error, id: r.id });
      } catch {
        setFailure({ message: "Check your connection and try again." });
      }
    });
  }

  function retry(id: string) {
    start(async () => {
      try {
        const r = await rerunAnalysis(id);
        if (r.error) setFailure({ message: r.error, id });
        else router.push(`/investigations/${id}`);
      } catch {
        setFailure({ message: "Check your connection and try again.", id });
      }
    });
  }

  const selectTab = (t: Tab) => onDraftChange((d) => ({ ...d, tab: t }));
  function onTabKey(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    const next = tab === "screenshots" ? "text" : "screenshots";
    selectTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  }

  return (
    <Stage
      id="upload-h"
      header={header}
      title="Add your conversation"
      support="Upload screenshots or paste your messages."
      aside={
        <p className="flex gap-2 text-sm text-muted">
          <svg aria-hidden="true" className="mt-0.5 shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8h.01M11 12h1v4h1" />
          </svg>
          Remove or blur personal details if needed.
        </p>
      }
    >
      <div className="tr-surface flex flex-col gap-4 p-4 sm:p-5">
        <div role="tablist" aria-label="How to add your conversation" className="tr-tabs" onKeyDown={onTabKey}>
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab === t.id} aria-controls={`panel-${t.id}`} tabIndex={tab === t.id ? 0 : -1} className="tr-tab" onClick={() => selectTab(t.id)}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {t.icon}
              </svg>
              {t.label}
            </button>
          ))}
        </div>

        {/* Both stay mounted so switching tabs keeps previews, errors and text. They share one grid cell so the page doesn't jump. */}
        <div className="grid">
          <div role="tabpanel" id="panel-screenshots" aria-labelledby="tab-screenshots" className={`[grid-area:1/1] ${tab === "screenshots" ? "" : "invisible"}`}>
            <EvidencePicker
              value={evidence}
              onChange={(e) => onDraftChange((d) => ({ ...d, evidence: { ...d.evidence, images: e.images } }))}
              disabled={locked}
              allowText={false}
              onImagePaste={tab === "text" ? () => selectTab("screenshots") : undefined}
            />
          </div>
          <div role="tabpanel" id="panel-text" aria-labelledby="tab-text" className={`[grid-area:1/1] ${tab === "text" ? "" : "invisible"}`}>
            <TextAreaField
              label="Conversation"
              hint="Use “Me:” to label your messages if needed. Up to 20,000 characters."
              placeholder="Paste your conversation here…"
              rows={8}
              value={evidence.text}
              onChange={(e) => {
                const text = e.target.value;
                onDraftChange((d) => ({ ...d, evidence: { ...d.evidence, text } }));
              }}
              maxLength={20000}
              disabled={locked}
            />
          </div>
        </div>

        <details open={!!(draft.instruction || draft.title) || undefined} className="group border-t border-line pt-2">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-bold [&::-webkit-details-marker]:hidden">
            <svg aria-hidden="true" className="shrink-0 group-open:rotate-90" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
            <span>
              Add a question or name <span className="font-normal text-muted">(optional)</span>
            </span>
          </summary>
          <div className="flex flex-col gap-4 pt-2">
            <TextAreaField
              label="What do you want to find out?"
              hint="For example: What did we agree on, and what's still unpaid?"
              value={draft.instruction}
              onChange={(e) => onDraftChange({ ...draft, instruction: e.target.value })}
              maxLength={1000}
              disabled={locked}
            />
            <TextField label="Name this investigation" hint="For example: Ana Reyes website" value={draft.title} onChange={(e) => onDraftChange({ ...draft, title: e.target.value })} maxLength={120} disabled={locked} />
          </div>
        </details>
      </div>

      <div ref={statusRef} className="scroll-mb-32 empty:hidden">
        {pending && <Working label="Reading your conversation…" detail="" />}
        {failure && !pending && (
          <div role="alert" className="flex flex-col gap-1 rounded-control border-2 border-danger bg-danger-bg p-4 text-danger">
            <p className="font-extrabold">We couldn&apos;t analyze this conversation.</p>
            <p className="font-semibold">{failure.message}</p>
            {failure.id && <p className="text-ink">Your conversation is saved, so you can try again without adding it again.</p>}
          </div>
        )}
      </div>

      <div className={`tr-action-bar ${onBack && !failure?.id ? "tr-action-bar--with-back" : ""}`}>
        {failure?.id ? (
          <>
            <ButtonLink href={`/investigations/${failure.id}`} variant="secondary">
              Open saved investigation
            </ButtonLink>
            <Button type="button" onClick={() => retry(failure.id!)} loading={pending} loadingLabel="Analyzing…">
              Try again
            </Button>
          </>
        ) : (
          <>
            {onBack && <BackButton onClick={onBack} disabled={pending} />}
            <Button type="button" onClick={analyze} disabled={!ready} loading={pending} loadingLabel="Analyzing…">
              {failure ? "Try again" : "Analyze conversation"}
            </Button>
          </>
        )}
      </div>
    </Stage>
  );
}
