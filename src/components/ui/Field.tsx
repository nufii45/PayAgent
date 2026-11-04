import { useId, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

type Common = { label: string; hint?: string; error?: string };

function FieldShell({ id, label, hint, error, children }: Common & { id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-bold">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-muted">
          {hint}
        </p>
      )}
      {children}
      {error && (
        <p id={`${id}-error`} className="text-sm font-semibold text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function describedBy(id: string, hint?: string, error?: string) {
  return [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
}

export function TextField({ label, hint, error, ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <input {...rest} id={id} className="tr-input" aria-invalid={!!error || undefined} aria-describedby={describedBy(id, hint, error)} />
    </FieldShell>
  );
}

export function SelectField({ label, hint, error, ...rest }: Common & SelectHTMLAttributes<HTMLSelectElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <div className="relative">
        <select {...rest} id={id} className="tr-input tr-select" aria-invalid={!!error || undefined} aria-describedby={rest["aria-describedby"] ?? describedBy(id, hint, error)} />
        <svg aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-muted" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </FieldShell>
  );
}

export function TextAreaField({ label, hint, error, ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const id = useId();
  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <textarea {...rest} id={id} className="tr-input min-h-28 resize-y" aria-invalid={!!error || undefined} aria-describedby={describedBy(id, hint, error)} />
    </FieldShell>
  );
}
