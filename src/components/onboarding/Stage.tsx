import type { ReactNode } from "react";

/** After a step change the old control is gone, so move focus to the new heading for keyboard and screen-reader users. */
export function focusStage(id: string) {
  requestAnimationFrame(() => document.getElementById(id)?.focus({ preventScroll: true }));
}

/**
 * One step of a flow: progress stays at the top so it never moves between steps. Below it, heading and
 * guidance on the left, centered against the step's content on the right (top-aligned and sticky once
 * that content outgrows the screen: screenshots added or the optional fields open); one column when narrow.
 * Sized by its container, so it also fits beside the app sidebar.
 */
export function Stage({ id, header, title, support, aside, children }: { id: string; header?: ReactNode; title: string; support: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="@container flex w-full flex-1 flex-col gap-6 lg:gap-8">
      {header}
      <div className="flex flex-col gap-6 @3xl:my-auto @3xl:grid @3xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] @3xl:items-center @3xl:gap-x-16 @3xl:has-[details[open],ol]:items-start">
        <div className="flex flex-col gap-3 @3xl:sticky @3xl:top-10">
          <h1 id={id} tabIndex={-1} className="text-3xl font-extrabold text-balance sm:text-4xl lg:leading-tight">
            {title}
          </h1>
          <p className="text-lg text-muted">{support}</p>
          {aside}
        </div>
        <div className="flex min-w-0 flex-col gap-5">{children}</div>
      </div>
    </section>
  );
}
