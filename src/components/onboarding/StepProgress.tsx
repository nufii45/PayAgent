/**
 * "Step 2 of 4" with a matching bar: done is filled, current is outlined, upcoming is a thin line.
 */
export function StepProgress({ step, of }: { step: number; of: number }) {
  return (
    <div className="flex w-full items-center gap-3 sm:max-w-xs">
      <p className="shrink-0 text-sm font-bold text-muted" aria-live="polite">
        Step {step} of {of}
      </p>
      <div className="flex flex-1 items-center gap-2" aria-hidden="true">
        {Array.from({ length: of }, (_, i) => (
          <span
            key={i}
            className={`flex-1 rounded-full ${i + 1 < step ? "h-2.5 bg-action" : i + 1 === step ? "h-2.5 border-2 border-action bg-surface" : "h-1 bg-line"}`}
          />
        ))}
      </div>
    </div>
  );
}
