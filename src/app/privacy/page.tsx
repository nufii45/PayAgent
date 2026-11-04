import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { retentionDays } from "@/lib/session";

export const dynamic = "force-dynamic";
export const metadata = { title: "Privacy and data handling · Traccoon PayAgent" };

export default function PrivacyPage() {
  const days = retentionDays();
  return (
    <div className="flex max-w-measure flex-col gap-6">
      <h1 className="text-3xl font-extrabold sm:text-4xl">Privacy and data handling</h1>
      <p className="text-muted">This is a hackathon demo of Traccoon PayAgent. Here is exactly what happens to what you upload.</p>
      <Card className="flex flex-col gap-5 [&_h2]:text-lg [&_h2]:font-extrabold">
        <section className="flex flex-col gap-2">
          <h2>Your guest workspace</h2>
          <p>There are no accounts. On your first visit this browser gets a random, private workspace id in an httpOnly cookie. Only requests carrying that cookie can read or change the workspace. Other visitors can&apos;t see it, and nothing in it has a public link.</p>
        </section>
        <section className="flex flex-col gap-2">
          <h2>What is stored</h2>
          <p>The screenshots and text you add, PayAgent&apos;s analyses of them (every version), your corrections, invoice drafts and invoices, your workspace preferences, and an activity log. They are stored in a Postgres database (Neon) and only shown inside your workspace.</p>
        </section>
        <section className="flex flex-col gap-2">
          <h2>AI processing</h2>
          <p>To read a conversation, its screenshots and text are sent to Meta&apos;s Model API (Muse Spark). Voice notes are sent to Muse Voice Transcribe. The model&apos;s answer is checked by code before it&apos;s shown. Text inside your screenshots is treated as evidence, never as instructions. The app doesn&apos;t log conversation content.</p>
        </section>
        <section className="flex flex-col gap-2">
          <h2>How long it&apos;s kept</h2>
          <p>A guest workspace and everything in it are deleted automatically {days} days after its last use. You can delete it at any time in Settings &amp; Privacy, which removes all of its records at once. Deleting one investigation removes its screenshots, text and analyses.</p>
          <p>Because there is no account, the workspace can&apos;t be recovered if you clear your browser data or lose the cookie, and it isn&apos;t available on other devices.</p>
        </section>
        <section className="flex flex-col gap-2">
          <h2>What you should upload</h2>
          <p>Only conversations you have permission to process. You can blur names and profile photos; PayAgent will still read the messages and won&apos;t guess who blurred people are.</p>
        </section>
        <section className="flex flex-col gap-2">
          <h2>Payments</h2>
          <p>No real payments are made or checked in this version. &ldquo;Paid&rdquo; on an invoice is your own confirmation, and a payment a client mentions in a chat is shown as unverified.</p>
        </section>
        <section className="flex flex-col gap-2">
          <h2>Limits</h2>
          <p>To keep the demo available, the number of AI analyses per workspace and per network each hour is limited, and so is the total per day.</p>
        </section>
      </Card>
      <ButtonLink href="/settings" variant="secondary" className="self-start">Go to Settings &amp; Privacy</ButtonLink>
    </div>
  );
}
