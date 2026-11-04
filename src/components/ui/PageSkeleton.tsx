import type { ReactNode } from "react";

// What a page looks like while it loads. Static on purpose: it appears in one frame, with no shimmer to distract.

function Bar({ className }: { className: string }) {
  return <span className={`block rounded-input bg-line/60 ${className}`} />;
}

function Shell({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <div role="status" aria-label="Loading" aria-busy="true" className={`flex w-full flex-col gap-6 ${className}`}>
      {children}
    </div>
  );
}

function Header({ back, action }: { back?: boolean; action?: boolean }) {
  return (
    <>
      {back && <Bar className="h-12 w-48 rounded-control" />}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex w-full max-w-measure flex-col gap-2">
          <Bar className="h-10 w-2/3 sm:h-11" />
          <Bar className="h-5 w-full max-w-md" />
        </div>
        {action && <Bar className="h-12 w-44 rounded-control" />}
      </div>
    </>
  );
}

function Block({ className = "", lines = 3 }: { className?: string; lines?: number }) {
  return (
    <div className={`tr-surface flex flex-col gap-3 p-5 ${className}`}>
      <Bar className="h-6 w-1/3" />
      {Array.from({ length: lines }, (_, i) => (
        <Bar key={i} className={`h-4 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

function Rows({ count = 3 }: { count?: number }) {
  return (
    <div className="tr-surface divide-y divide-line">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center justify-between gap-4 p-4">
          <div className="flex w-1/2 flex-col gap-2">
            <Bar className="h-5 w-3/4" />
            <Bar className="h-4 w-full" />
          </div>
          <Bar className="h-5 w-24" />
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <Shell>
      <Header />
      <div className="flex gap-3">
        <Bar className="h-12 w-44 rounded-control" />
        <Bar className="h-12 w-36 rounded-control" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Block key={i} lines={2} />
        ))}
      </div>
      <Rows count={2} />
    </Shell>
  );
}

export function ListSkeleton() {
  return (
    <Shell>
      <Header action />
      <Rows />
    </Shell>
  );
}

export function DetailSkeleton() {
  return (
    <Shell>
      <Header back />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <div className="flex flex-col gap-6">
          <Block lines={5} />
          <Block lines={4} />
        </div>
        <Block lines={4} />
      </div>
    </Shell>
  );
}

export function SettingsSkeleton() {
  return (
    <Shell className="max-w-3xl">
      <Header />
      <Block lines={5} />
      <div className="border-t border-line" />
      <Block lines={6} />
    </Shell>
  );
}

export function FormSkeleton() {
  return (
    <Shell>
      <Header back />
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Block lines={6} />
      </div>
    </Shell>
  );
}

export function ArticleSkeleton() {
  return (
    <Shell className="max-w-measure">
      <Header />
      <Block lines={8} />
    </Shell>
  );
}

/** Same layout as the onboarding Stage, so its title doesn't move when the step arrives. */
export function StageSkeleton() {
  return (
    <div role="status" aria-label="Loading" aria-busy="true" className="@container flex w-full flex-1 flex-col">
      <div className="flex flex-col gap-6 @3xl:my-auto @3xl:grid @3xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] @3xl:items-center @3xl:gap-10">
        <div className="flex flex-col gap-3">
          <Bar className="h-10 w-3/4 sm:h-11" />
          <Bar className="h-5 w-full max-w-md" />
        </div>
        <Block lines={6} className="min-h-108" />
      </div>
    </div>
  );
}

export function NewInvestigationSkeleton() {
  return (
    <div className="flex w-full flex-col gap-6">
      <Bar className="h-12 w-52 rounded-control" />
      <StageSkeleton />
    </div>
  );
}

/** The first welcome step, line for line, so its heading stays put at every width when the step arrives. */
export function WelcomeSkeleton() {
  return (
    <>
      <p className="text-lg font-extrabold">Traccoon PayAgent</p>
      <section role="status" aria-label="Loading" aria-busy="true" className="@container flex w-full flex-1 flex-col gap-6 lg:gap-8">
        <Bar className="h-5 w-full sm:max-w-xs" />
        <div className="flex flex-col gap-6 @3xl:my-auto @3xl:grid @3xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] @3xl:items-center @3xl:gap-x-16">
          <div className="flex flex-col gap-3">
            <div className="flex h-18 flex-col justify-between sm:h-20 lg:h-22.5">
              <Bar className="h-8 w-full sm:h-9 lg:h-10" />
              <Bar className="h-8 w-2/3 sm:h-9 lg:h-10" />
            </div>
            <div className="flex h-14 flex-col justify-between">
              <Bar className="h-5 w-full" />
              <Bar className="h-5 w-3/4" />
            </div>
            <div className="tr-action-bar tr-action-bar--flow tr-action-bar--start mt-2">
              <Bar className="h-12 rounded-control sm:w-32" />
              <Bar className="h-12 rounded-control sm:w-48" />
              <Bar className="mx-auto h-5 w-40 sm:mx-0" />
            </div>
          </div>
          <Block lines={6} className="min-h-108 lg:min-h-104" />
        </div>
      </section>
    </>
  );
}
