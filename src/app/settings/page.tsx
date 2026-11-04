import Link from "next/link";
import { deleteMyWorkspace, restartWelcome } from "@/app/actions-workspace";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { currentWorkspace } from "@/lib/current-workspace";
import { retentionDays } from "@/lib/session";
import { PreferencesForm } from "./PreferencesForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Settings & Privacy · Traccoon PayAgent" };

const date = new Intl.DateTimeFormat("en-PH", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Manila" });

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const ws = await currentWorkspace();
  const days = retentionDays();
  const expires = new Date(Math.max(ws.lastSeenAt.getTime(), Date.now()) + days * 86_400_000);
  return (
    <div className="flex flex-col gap-6">
      <div className="flex max-w-measure flex-col gap-2">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Settings &amp; Privacy</h1>
        <p className="text-muted">Your workspace preferences, how long your data is kept, and how to take it with you or delete it.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <Card className="flex flex-col gap-4">
          <h2 className="text-xl font-extrabold">Workspace preferences</h2>
          <PreferencesForm initial={ws.preferences} />
          <form action={restartWelcome}>
            <Button type="submit" variant="secondary">Show the welcome steps again</Button>
          </form>
        </Card>

        <Card className="flex flex-col gap-4">
          <h2 className="text-xl font-extrabold">Your guest workspace</h2>
          <dl className="grid gap-3">
            <div>
              <dt className="text-sm text-muted">Created</dt>
              <dd className="font-bold">{date.format(ws.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Kept until</dt>
              <dd className="font-bold">{date.format(expires)}, unless you use it again before then</dd>
            </div>
          </dl>
          <p className="text-muted">
            There is no account. The workspace belongs to this browser, through a private cookie. It isn&apos;t synced to other devices and can&apos;t be recovered if you clear your
            browser data, the cookie is lost, or it goes {days} days without use. Export anything you want to keep.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/settings/export" variant="secondary">Export my data (JSON)</ButtonLink>
            <Link href="/privacy" className="self-center font-bold underline">How your data is handled</Link>
          </div>
        </Card>
      </div>

      <Card className="flex flex-col gap-4 border-danger">
        <h2 className="text-xl font-extrabold">Delete this workspace</h2>
        <p className="max-w-measure text-muted">
          Permanently deletes every investigation, screenshot, pasted conversation, analysis, invoice and activity entry in this workspace. This can&apos;t be undone.
        </p>
        <form action={deleteMyWorkspace} className="flex flex-col items-start gap-3">
          <label className="flex items-start gap-3 font-bold">
            <input type="checkbox" name="confirm" className="mt-1 size-5" required />
            I understand everything in this workspace will be deleted.
          </label>
          {error === "confirm" && <p role="alert" className="font-bold text-danger">Tick the box to confirm.</p>}
          <Button type="submit" variant="secondary" className="border-danger text-danger">Delete workspace and all its data</Button>
        </form>
      </Card>
    </div>
  );
}
