import Link from "next/link";
import type { ReactNode } from "react";
import { InfoRow } from "@/components/ui/InfoRow";
import { currentWorkspace } from "@/lib/current-workspace";
import { aiProcessor } from "@/lib/privacy";
import { retentionDays } from "@/lib/session";
import { DeleteWorkspace } from "./DeleteWorkspace";
import { ExportData } from "./ExportData";
import { PreferencesForm } from "./PreferencesForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings & Privacy · Traccoon PayAgent" };

const created = new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeZone: "Asia/Manila" });
const expiry = new Intl.DateTimeFormat("en-PH", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Manila" });

function Section({ id, title, support, children }: { id?: string; title: string; support: string; children: ReactNode }) {
  return (
    <section id={id} className="flex scroll-mt-6 flex-col gap-4 border-t border-line pt-8 first:border-t-0 first:pt-0">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-extrabold">{title}</h2>
        <p className="text-muted">{support}</p>
      </div>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const ws = await currentWorkspace();
  const days = retentionDays();
  const expires = new Date(ws.lastSeenAt.getTime() + days * 86_400_000);
  return (
    <div className="flex w-full max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Settings &amp; Privacy</h1>
        <p className="text-muted">Manage your workspace, preferences, and data.</p>
      </div>

      <div className="flex flex-col gap-8">
        <Section id="preferences" title="Workspace" support="Customize how your workspace and invoices appear.">
        <div className="tr-surface p-4 sm:p-5">
          <PreferencesForm initial={ws.preferences} />
        </div>
      </Section>

      <Section title="Privacy & data" support="View your guest workspace and manage your data.">
        <div className="tr-surface flex flex-col gap-4 p-4 sm:p-5">
          <dl className="grid gap-3 rounded-control bg-page p-4 sm:grid-cols-[1fr_1fr_1.4fr] sm:gap-4">
            <div>
              <dt className="text-sm text-muted">Workspace type</dt>
              <dd className="font-bold">Guest workspace</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Created</dt>
              <dd className="font-bold">{created.format(ws.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Expires if unused</dt>
              <dd className="font-bold">{expiry.format(expires)} PHT</dd>
            </div>
          </dl>

          <ul className="flex flex-col divide-y divide-line">
            <InfoRow title="Expiry" icon={<><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>}>
              A workspace expires {days} days after its last use. It then can&apos;t be opened, and a later clean-up removes its data. Using it again moves the date later.
            </InfoRow>
            <InfoRow title="This browser" icon={<><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4" /></>}>
              Your workspace is linked to this browser and isn&apos;t synced. Clearing browser data makes it inaccessible.
            </InfoRow>
            <InfoRow title="AI processing" icon={<><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" /></>}>
              Screenshots and messages you add are sent to {aiProcessor().short} to be read. Voice notes always go to Meta&apos;s Model API.
            </InfoRow>
          </ul>

          <div className="border-t border-line pt-4">
            <ExportData>
              <Link href="/privacy" className="inline-flex min-h-11 items-center gap-2 font-bold underline underline-offset-2">
                How your data is handled
                <svg aria-hidden="true" className="shrink-0" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
              </Link>
            </ExportData>
          </div>
        </div>
      </Section>

      <section className="flex flex-col gap-4 border-t border-line pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-extrabold text-danger">Danger zone</h2>
          <p className="text-muted">Permanently delete this workspace and its data.</p>
        </div>
        <DeleteWorkspace />
      </section>
      </div>
    </div>
  );
}
