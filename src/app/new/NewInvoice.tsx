"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { proposeInvoice, type ProposeResponse } from "@/app/actions";
import { AgentSteps } from "@/components/AgentSteps";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { shrinkImage } from "@/lib/browser-media";
import { ReviewForm } from "./ReviewForm";
import { VoiceNote } from "./VoiceNote";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // before downscaling in the browser

export function NewInvoice() {
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [fromVoice, setFromVoice] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [turns, setTurns] = useState<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [response, setResponse] = useState<ProposeResponse | null>(null);
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);

  function run(nextTurns: string[]) {
    setTurns(nextTurns);
    startTransition(async () => {
      setResponse(await proposeInvoice({ turns: nextTurns, imageDataUrl: image ?? undefined, source: fromVoice ? "voice" : undefined }));
    });
  }

  function onImage(file: File | undefined) {
    setImageError(null);
    if (!file) return setImage(null);
    if (!/^image\/(png|jpeg|webp)$/.test(file.type)) return setImageError("Use a PNG, JPG or WebP screenshot.");
    if (file.size > MAX_IMAGE_BYTES) return setImageError("Use a screenshot under 15 MB.");
    shrinkImage(file).then(setImage, () => setImageError("That image couldn't be read. Try another screenshot."));
  }

  function reset() {
    setText("");
    setImage(null);
    setFromVoice(false);
    setTurns([]);
    setAnswer("");
    setResponse(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const result = response?.result;
  const started = turns.length > 0 || response;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:items-start">
      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-extrabold">{started ? "What you sent" : "Describe the job"}</h2>
        {!started ? (
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              run(text.trim() ? [text.trim()] : []);
            }}
          >
            <TextAreaField
              label="Message"
              hint="Any language you use with clients works, for example: Gawan mo ng invoice si Client A, 2.5k consulting, due next Friday."
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={4000}
            />
            {fromVoice && <p className="-mt-2 text-sm text-muted">Transcribed from your voice note. Fix anything it misheard, then draft.</p>}
            <VoiceNote
              disabled={pending}
              onTranscript={(t) => {
                setText(t);
                setFromVoice(true);
              }}
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="screenshot" className="font-bold">
                Chat screenshot (optional)
              </label>
              <p className="text-sm text-muted">A Messenger or Viber chat where you agreed the job and price.</p>
              <input
                ref={fileRef}
                id="screenshot"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => onImage(e.target.files?.[0])}
                className="tr-input py-2"
              />
              {imageError && <p className="text-sm font-semibold text-danger">{imageError}</p>}
            </div>
            <div className="tr-action-bar tr-action-bar--flow">
              <Button type="submit" loading={pending} loadingLabel="Drafting…" disabled={!text.trim() && !image}>
                Draft invoice
              </Button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col gap-3">
            {turns.map((t, i) => (
              <p key={i} className="rounded-control border-2 border-line bg-page p-3 whitespace-pre-wrap">
                {i > 0 && <span className="font-bold">Your answer: </span>}
                {i === 0 && fromVoice && <span className="font-bold">Voice note: </span>}
                {t}
              </p>
            ))}
            {/* eslint-disable-next-line @next/next/no-img-element -- local data URL preview */}
            {image && <img src={image} alt="The chat screenshot you uploaded" className="max-h-96 w-full rounded-control border-2 border-line object-contain" />}
            <div className="tr-action-bar tr-action-bar--flow">
              <Button variant="secondary" onClick={reset} disabled={pending}>
                Start over
              </Button>
            </div>
          </div>
        )}
      </Card>

      {started && (
        <Card className="flex flex-col gap-5" aria-live="polite" aria-busy={pending}>
          <h2 className="text-xl font-extrabold">Invoice draft</h2>
          {pending && <Working hasImage={!!image} />}

          {!pending && result?.status === "error" && (
            <div className="flex flex-col gap-3">
              <p role="alert" className="font-semibold text-danger">
                {result.error}
              </p>
              <div className="tr-action-bar tr-action-bar--flow">
                <Button onClick={() => run(turns)}>Try again</Button>
              </div>
            </div>
          )}

          {!pending && result?.status === "invalid" && (
            <div className="flex flex-col gap-3">
              <p role="alert" className="font-semibold text-danger">
                Some details couldn&apos;t be read: {result.errors.join("; ")}
              </p>
              <div className="tr-action-bar tr-action-bar--flow">
                <Button variant="secondary" onClick={reset}>
                  Start over
                </Button>
              </div>
            </div>
          )}

          {!pending && result?.status === "needs_info" && (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (!answer.trim()) return;
                const next = [...turns, answer.trim()];
                setAnswer("");
                run(next);
              }}
            >
              <TextField label={result.question} value={answer} onChange={(e) => setAnswer(e.target.value)} autoFocus />
              <div className="tr-action-bar tr-action-bar--flow">
                <Button type="submit" disabled={!answer.trim()}>
                  Send answer
                </Button>
              </div>
            </form>
          )}

          {!pending && response?.requestId && (result?.status === "ready" || result?.status === "needs_confirmation") && (
            <ReviewForm
              key={response.requestId}
              requestId={response.requestId}
              draft={result.draft}
              notice={result.status === "needs_confirmation" ? `${result.question} Change it below if not.` : undefined}
              onDiscarded={reset}
            />
          )}

          {!pending && response && (
            <AgentSteps steps={response.steps} model={"model" in response ? response.model : undefined} latencyMs={"latencyMs" in response ? response.latencyMs : undefined} />
          )}
        </Card>
      )}
    </div>
  );
}

/** Honest progress while the single agent call runs: what it does, and how long it has taken. */
function Working({ hasImage }: { hasImage: boolean }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col gap-1">
      <p className="font-semibold">PayAgent is working… {seconds}s</p>
      <p className="text-sm text-muted">
        {hasImage ? "Reading the screenshot, then checking" : "Checking"} the client, amounts and due date with its tools. This usually takes 10 to 20 seconds.
      </p>
    </div>
  );
}
