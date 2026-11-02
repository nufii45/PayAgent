import { Card } from "@/components/ui/Card";

export default function Home() {
  return (
    <div className="flex max-w-measure flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold sm:text-4xl">Invoices from the way you already work</h1>
        <p className="text-lg text-muted">
          Paste a chat, describe the job, or send a voice note. PayAgent drafts the invoice, you check it, and nothing is
          saved until you approve.
        </p>
      </div>
      <Card>
        <p className="font-bold">The app foundation is in place.</p>
        <p className="text-muted">Creating invoices from a message is the next step being built.</p>
      </Card>
    </div>
  );
}
