"use client";

import { useEffect, useRef, useState } from "react";
import { TextAreaField } from "@/components/ui/Field";
import { shrinkImage } from "@/lib/browser-media";

export type PickedEvidence = { images: { name: string; dataUrl: string }[]; text: string };

/** Screenshots (with preview, reorder and remove before analysis) plus optional pasted text. */
export function EvidencePicker({ value, onChange, disabled, max = 8 }: { value: PickedEvidence; onChange: (v: PickedEvidence) => void; disabled?: boolean; max?: number }) {
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function addFiles(files: FileList | null) {
    setError(null);
    if (!files?.length) return;
    const list = [...files];
    if (list.some((f) => !/^image\/(png|jpeg|webp)$/.test(f.type))) return setError("Use PNG, JPG or WebP screenshots.");
    if (value.images.length + list.length > max) return setError(`Add up to ${max} screenshots at a time.`);
    setReading(true);
    try {
      const shrunk = await Promise.all(list.map(async (f) => ({ name: f.name, dataUrl: await shrinkImage(f) })));
      onChange({ ...value, images: [...value.images, ...shrunk] });
    } catch {
      setError("One of the images couldn't be read. Try another file.");
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  const move = (i: number, d: -1 | 1) => {
    const images = [...value.images];
    [images[i], images[i + d]] = [images[i + d], images[i]];
    onChange({ ...value, images });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="evidence-files" className="font-bold">
          Conversation screenshots
        </label>
        <p className="text-sm text-muted">Messenger, WhatsApp, Viber or Telegram. Put them in the order the chat happened. Blur names or photos you don&apos;t want to share.</p>
        <input
          ref={fileRef}
          id="evidence-files"
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          disabled={disabled || reading}
          onChange={(e) => void addFiles(e.target.files)}
          className="tr-input py-2"
        />
        {reading && <p className="text-sm text-muted">Preparing screenshots…</p>}
        {error && <p className="text-sm font-semibold text-danger">{error}</p>}
      </div>

      {value.images.length > 0 && (
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Screenshots in order">
          {value.images.map((img, i) => (
            <li key={img.dataUrl.slice(-40) + i} className="flex flex-col gap-2 rounded-control border-2 border-line bg-page p-2">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
              <img src={img.dataUrl} alt={`Screenshot ${i + 1}: ${img.name}`} className="h-32 w-full rounded-input object-cover object-top" />
              <span className="text-sm font-bold">Screenshot {i + 1}</span>
              <div className="flex flex-wrap gap-1">
                <button type="button" className="tr-button tr-button--secondary min-h-0 px-2 py-1 text-sm" disabled={disabled || i === 0} onClick={() => move(i, -1)} aria-label={`Move screenshot ${i + 1} earlier`}>
                  Earlier
                </button>
                <button type="button" className="tr-button tr-button--secondary min-h-0 px-2 py-1 text-sm" disabled={disabled || i === value.images.length - 1} onClick={() => move(i, 1)} aria-label={`Move screenshot ${i + 1} later`}>
                  Later
                </button>
                <button type="button" className="tr-button tr-button--secondary min-h-0 px-2 py-1 text-sm" disabled={disabled} onClick={() => onChange({ ...value, images: value.images.filter((_, j) => j !== i) })} aria-label={`Remove screenshot ${i + 1}`}>
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <TextAreaField
        label="Or paste the conversation (optional)"
        hint='Copy the messages as text. Mark your own lines with "Me:" if names are missing.'
        value={value.text}
        onChange={(e) => onChange({ ...value, text: e.target.value })}
        disabled={disabled}
        maxLength={20000}
      />
    </div>
  );
}

export function Working({ label }: { label: string }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col gap-1 rounded-control border-2 border-line bg-page p-4" role="status">
      <p className="font-semibold">
        {label} {seconds}s
      </p>
      <p className="text-sm text-muted">Muse Spark is reading every message, then PayAgent&apos;s rules work out what was agreed. This can take 20 to 60 seconds for several screenshots.</p>
    </div>
  );
}
