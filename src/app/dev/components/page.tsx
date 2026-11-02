import { notFound } from "next/navigation";
import { ReturnLink } from "@/components/ui/BackLink";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { TextAreaField, TextField } from "@/components/ui/Field";
import { StatusBadge } from "@/components/ui/StatusBadge";

// Component reference for development. Not available in production builds.
export default function ComponentsPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <div className="flex flex-col gap-8">
      <ReturnLink href="/" label="home" />
      <h1 className="text-3xl font-extrabold">Components</h1>

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-extrabold">Buttons</h2>
        <div className="flex flex-wrap gap-4">
          <Button>Approve invoice</Button>
          <Button variant="secondary">Edit details</Button>
          <Button loading loadingLabel="Saving…">Approve invoice</Button>
          <Button disabled>Approve invoice</Button>
        </div>
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-extrabold">Fields</h2>
        <TextField label="Client" defaultValue="Client A" />
        <TextField label="Amount" hint="In pesos, for example 2,500" defaultValue="two thousand" error="Enter the amount as a number, for example 2,500" />
        <TextAreaField label="What should the invoice say?" placeholder="Gawan mo ng invoice si Client A, 2.5k consulting, due next Friday" />
      </Card>

      <Card className="flex flex-col gap-4">
        <h2 className="text-xl font-extrabold">Status</h2>
        <div className="flex flex-wrap gap-2">
          {(["draft", "approved", "sent", "paid", "partially_paid", "void"] as const).map((s) => (
            <StatusBadge key={s} status={s} />
          ))}
        </div>
      </Card>

      <EmptyState
        title="No invoices yet"
        description="Describe a job you finished and PayAgent will draft the invoice for you to check."
        action={<Button>Draft an invoice</Button>}
      />
    </div>
  );
}
