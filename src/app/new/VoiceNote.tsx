"use client";

import { useEffect, useRef, useState } from "react";
import { transcribeVoiceNote } from "@/app/actions";
import { Button } from "@/components/ui/Button";
import { MAX_VOICE_SECONDS, toTranscribableWav } from "@/lib/browser-media";

type State = { kind: "idle" } | { kind: "recording"; seconds: number } | { kind: "working" } | { kind: "error"; message: string };

/** Record or upload a voice note, convert it to WAV in the browser, and hand back the transcript. */
export function VoiceNote({ onTranscript, disabled }: { onTranscript: (text: string) => void; disabled?: boolean }) {
  const [state, setState] = useState<State>({ kind: "idle" });
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      recorder.current?.stream.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  async function send(blob: Blob) {
    setState({ kind: "working" });
    try {
      const { wav } = await toTranscribableWav(blob);
      const form = new FormData();
      form.append("audio", new Blob([wav as BlobPart], { type: "audio/wav" }), "voice-note.wav");
      const r = await transcribeVoiceNote(form);
      if ("error" in r) return setState({ kind: "error", message: r.error });
      setState({ kind: "idle" });
      onTranscript(r.transcript);
    } catch (err) {
      const message = err instanceof Error && err.message.startsWith("Keep") ? err.message : "That audio couldn't be read. Try an MP3, M4A or WAV file.";
      setState({ kind: "error", message });
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function start() {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return setState({ kind: "error", message: "Microphone access was blocked. Allow it in your browser, or upload a file instead." });
    }
    const chunks: Blob[] = [];
    const rec = new MediaRecorder(stream);
    rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    rec.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      if (timer.current) clearInterval(timer.current);
      void send(new Blob(chunks, { type: rec.mimeType }));
    };
    recorder.current = rec;
    rec.start();
    setState({ kind: "recording", seconds: 0 });
    const startedAt = Date.now();
    timer.current = setInterval(() => {
      const seconds = Math.floor((Date.now() - startedAt) / 1000);
      if (seconds >= MAX_VOICE_SECONDS) rec.stop();
      else setState({ kind: "recording", seconds });
    }, 250);
  }

  const busy = state.kind === "working";
  return (
    <div className="flex flex-col gap-2">
      <p className="font-bold">Voice note (optional)</p>
      <p className="text-sm text-muted">Say the job, amount and due date. You can check the text before drafting.</p>
      <div className="flex flex-wrap items-center gap-3">
        {state.kind === "recording" ? (
          <Button type="button" variant="secondary" onClick={() => recorder.current?.stop()}>
            Stop recording ({state.seconds}s)
          </Button>
        ) : (
          <Button type="button" variant="secondary" onClick={start} disabled={disabled || busy} loading={busy} loadingLabel="Transcribing…">
            Record voice note
          </Button>
        )}
        <label className={`tr-button tr-button--secondary has-[input:focus-visible]:outline-[length:var(--tr-focus-stroke)] has-[input:focus-visible]:outline-offset-[var(--tr-focus-offset)] has-[input:focus-visible]:outline-[var(--tr-color-focus)] has-[input:focus-visible]:outline-solid ${disabled || busy || state.kind === "recording" ? "pointer-events-none opacity-75" : ""}`}>
          Upload audio
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className="sr-only"
            disabled={disabled || busy || state.kind === "recording"}
            onChange={(e) => e.target.files?.[0] && void send(e.target.files[0])}
          />
        </label>
      </div>
      {state.kind === "error" && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {state.message}
        </p>
      )}
    </div>
  );
}
