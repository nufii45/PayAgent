"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { TextAreaField } from "@/components/ui/Field";
import { clipboardImages, shrinkImage } from "@/lib/browser-media";

export type PickedEvidence = { images: { name: string; dataUrl: string }[]; text: string };

// Mirrors the server checks in app/investigations/actions.ts and the 4 MB request limit in next.config.ts.
const MAX_IMAGE_CHARS = 1_400_000;
const MAX_REQUEST_CHARS = 3_600_000;

const iconButton = "tr-button tr-button--secondary px-0";
const noSubscribe = () => () => {};

/** Screenshots (with preview, reorder and remove before analysis) plus optional pasted text. */
export function EvidencePicker({
  value,
  onChange,
  disabled,
  max = 8,
  allowText = true,
  onImagePaste,
}: {
  value: PickedEvidence;
  onChange: (v: PickedEvidence) => void;
  disabled?: boolean;
  max?: number;
  allowText?: boolean;
  /** Set when the picker is on a hidden tab: called so the parent can bring it back before the image is added. */
  onImagePaste?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const count = value.images.length;
  const blocked = disabled || reading || count >= max;
  const pasteKey = useSyncExternalStore(noSubscribe, () => (/mac/i.test(navigator.platform) ? "⌘V" : "Ctrl+V"), () => "⌘V");

  async function addFiles(files: FileList | File[] | null, liveNote = "") {
    setError(null);
    setNote(liveNote);
    if (!files?.length) return;
    const list = [...files];
    try {
      if (list.some((f) => !/^image\/(png|jpeg|webp)$/.test(f.type))) return setError("Use PNG, JPG or WebP screenshots. Other files were not added.");
      if (count + list.length > max) return setError(`You can add up to ${max} screenshots at a time. You have ${count} selected.`);
      setReading(true);
      const shrunk = await Promise.all(list.map(async (f) => ({ name: f.name, dataUrl: await shrinkImage(f) })));
      const tooBig = shrunk.find((i) => i.dataUrl.length > MAX_IMAGE_CHARS);
      if (tooBig) return setError(`${tooBig.name} is too detailed to send, even after resizing. Crop it to the messages that matter and try again.`);
      const total = [...value.images, ...shrunk].reduce((n, i) => n + i.dataUrl.length, 0) + value.text.length;
      if (total > MAX_REQUEST_CHARS)
        return setError("These screenshots are too large to send together. Analyze fewer now, then add the rest from the investigation page.");
      onChange({ ...value, images: [...value.images, ...shrunk] });
    } catch {
      setError("One of the images couldn't be read. Try another file.");
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // No dependency list: re-subscribing each render keeps the handler on the current images.
  useEffect(() => {
    if (disabled || reading) return;
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target;
      // The picker's own file input takes keyboard focus, so it has to stay pasteable.
      if (t instanceof HTMLElement && (t.isContentEditable || t.matches("textarea, input:not([type=file])"))) return;
      const images = e.clipboardData ? clipboardImages(e.clipboardData, count + 1) : [];
      if (!images.length) return;
      e.preventDefault();
      onImagePaste?.();
      void addFiles(images, onImagePaste ? "Moved to Screenshots. " : "");
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  });

  const move = (i: number, d: -1 | 1) => {
    const images = [...value.images];
    [images[i], images[i + d]] = [images[i + d], images[i]];
    onChange({ ...value, images });
  };

  return (
    <div className="flex h-full flex-col gap-4">
      <label
        className={`tr-button tr-button--secondary flex-1 flex-col gap-1 py-6 ${blocked ? "cursor-not-allowed opacity-75" : ""} ${dragging ? "bg-page" : ""} has-[:focus-visible]:bg-page has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-offset-4 has-[:focus-visible]:outline-ink`}
        aria-disabled={blocked || undefined}
        onDragOver={(e) => {
          e.preventDefault();
          if (!blocked) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!blocked) void addFiles(e.dataTransfer.files);
        }}
      >
        <svg aria-hidden="true" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="9" cy="9" r="2" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
        <span className="text-lg">{count ? "Choose more screenshots" : "Choose screenshots"}</span>
        <span className="text-sm font-normal text-muted">
          PNG, JPG, or WebP · Up to {max} images
          {/* Its own line below sm, so a wrap can't strand the separator. */}
          <span className="hidden pointer-fine:block sm:pointer-fine:inline">
            <span className="hidden sm:inline"> · </span>Paste with {pasteKey}
          </span>
        </span>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp"
          disabled={blocked}
          onChange={(e) => void addFiles(e.target.files)}
          className="sr-only"
        />
      </label>
      <p className="text-sm text-muted">Add them in the order of the conversation. Large images are resized automatically.<span className="hidden pointer-fine:inline"> You can also drag images here.</span></p>

      <p className={reading || count ? "font-bold" : "sr-only"} aria-live="polite">
        {note && <span className="sr-only">{note}</span>}
        {reading ? "Preparing screenshots…" : count === 0 ? "No screenshots selected yet." : `${count} screenshot${count === 1 ? "" : "s"} selected`}
      </p>
      {error && (
        <p role="alert" className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}

      {count > 0 && (
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label="Selected screenshots, in order">
          {value.images.map((img, i) => (
            <li key={img.dataUrl.slice(-40) + i} className="flex flex-col gap-2 rounded-control bg-surface p-2 shadow-[var(--tr-card-shadow)]">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview */}
              <img src={img.dataUrl} alt={`Screenshot ${i + 1}: ${img.name}`} className="h-36 w-full rounded-input object-cover object-top" />
              <div className="flex items-center justify-between gap-1">
                <span className="text-sm font-bold">{i + 1}</span>
                {count > 1 && (
                  <span className="flex gap-1">
                    <button type="button" className={iconButton} disabled={disabled || i === 0} onClick={() => move(i, -1)} aria-label={`Move screenshot ${i + 1} earlier`}>
                      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
                    </button>
                    <button type="button" className={iconButton} disabled={disabled || i === count - 1} onClick={() => move(i, 1)} aria-label={`Move screenshot ${i + 1} later`}>
                      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
                    </button>
                  </span>
                )}
              </div>
              <button
                type="button"
                className="tr-button tr-button--secondary text-sm"
                disabled={disabled}
                onClick={() => onChange({ ...value, images: value.images.filter((_, j) => j !== i) })}
                aria-label={`Remove screenshot ${i + 1}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ol>
      )}

      {allowText && (
        <details open={!!value.text || undefined}>
          <summary className="min-h-11 cursor-pointer self-start py-2 font-bold underline underline-offset-2">Paste the conversation as text instead</summary>
          <div className="pt-2">
            <TextAreaField
              label="Conversation text"
              hint='Copy the messages as text. Mark your own lines with "Me:" if names are missing.'
              value={value.text}
              onChange={(e) => onChange({ ...value, text: e.target.value })}
              disabled={disabled}
              maxLength={20000}
            />
          </div>
        </details>
      )}
    </div>
  );
}

export function Working({ label, detail = "PayAgent is identifying agreements and payment details." }: { label: string; detail?: string }) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const started = Date.now();
    const id = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex items-start gap-3 rounded-control bg-surface p-4 shadow-[var(--tr-card-shadow)]" role="status">
      <span className="tr-spinner mt-0.5 shrink-0" aria-hidden="true" />
      <div className="flex flex-col gap-1">
        <p className="font-bold">{label}</p>
        {detail && <p className="text-muted">{detail}</p>}
        <p className="text-sm text-muted tabular-nums">
          {seconds}s. This can take up to 2 minutes.
        </p>
      </div>
    </div>
  );
}
