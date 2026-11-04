import { notFound } from "next/navigation";
import { db } from "@/db/client";
import { ReturnLink } from "@/components/ui/BackLink";
import { InvestigationView } from "@/components/investigation/InvestigationView";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/dates";
import { clarificationMessage, followUpMessage } from "@/lib/investigation/messages";
import { STATUS_LABEL, diffAnalyses, moneyText, type Analysis } from "@/lib/investigation/reconcile";
import { getInvestigation } from "@/lib/investigations";
import { currentWorkspace } from "@/lib/current-workspace";
import { formatMoney } from "@/lib/money";
import { RetryAnalysis } from "./RetryAnalysis";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function summaryText(title: string, a: Analysis, version: number) {
  const s = a.summary;
  const lines = [`${title} (analysis v${version})`, s.clientName ? `Client: ${s.clientName}` : "Client: not named in the evidence", ""];
  for (const i of a.items) {
    const amount = i.agreedCentavos ?? i.affectedCentavos ?? i.proposedCentavos;
    lines.push(`- ${i.label}: ${STATUS_LABEL[i.status]}${amount != null ? `, ${formatMoney(amount, i.currency)}` : ""}`);
  }
  lines.push("", `Agreed total: ${moneyText(a, "agreed", formatMoney)}`);
  if (s.promisedCentavos) lines.push(`Promised (not paid): ${moneyText(a, "promised", formatMoney)}`);
  if (s.claimedCentavos) lines.push(`Client says paid (not verified): ${moneyText(a, "claimed", formatMoney)}`);
  lines.push(`Verified payments: ${formatMoney(s.verifiedCentavos, a.currency)}`);
  if (s.dueDate) lines.push(`Due: ${formatDate(s.dueDate)}`);
  const open = a.findings.filter((f) => f.needsReview);
  if (open.length) lines.push("", "Still to resolve:", ...open.map((f) => `- ${f.title}`));
  return lines.join("\n");
}

export default async function InvestigationPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ v?: string }> }) {
  const { id } = await params;
  const { v } = await searchParams;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const ws = await currentWorkspace();
  const data = await getInvestigation(db, ws.id, id);
  if (!data) notFound();
  const { investigation, evidence, versions } = data;

  const done = versions.filter((x) => x.analysis);
  const latest = done.at(-1);
  if (!latest) {
    return (
      <div className="flex flex-col gap-6">
        <ReturnLink href="/investigations" label="investigations" />
        <h1 className="text-3xl font-extrabold">{investigation.title}</h1>
        <EmptyState
          title="Not analysed yet"
          description={`${evidence.length} piece${evidence.length === 1 ? "" : "s"} of evidence saved. The analysis didn't finish, so nothing has been concluded.`}
          action={<RetryAnalysis id={id} />}
        />
      </div>
    );
  }
  const current = done.find((x) => String(x.version) === v) ?? latest;
  const previous = done.filter((x) => x.version < current.version).at(-1) ?? null;
  const analysis = current.analysis!;

  return (
    <div className="flex flex-col gap-6">
      <ReturnLink href="/investigations" label="investigations" />
      <InvestigationView
        id={id}
        title={investigation.title}
        instruction={investigation.instruction}
        evidence={evidence.map((e) => ({ id: e.id, label: e.label, kind: e.kind, imageDataUrl: e.imageDataUrl, textContent: e.textContent }))}
        versions={done.map((x) => ({ version: x.version, trigger: x.trigger, createdAt: x.createdAt.toISOString(), model: x.model, latencyMs: x.latencyMs }))}
        current={{
          version: current.version,
          trigger: current.trigger,
          createdAt: current.createdAt.toISOString(),
          model: current.model,
          latencyMs: current.latencyMs,
          analysis,
          evidenceMap: current.evidence,
        }}
        isLatest={current.version === latest.version}
        changes={previous ? diffAnalyses(previous.analysis!, analysis, formatMoney) : null}
        previousVersion={previous?.version ?? null}
        clarification={clarificationMessage(analysis, formatMoney)}
        followUp={followUpMessage(analysis, formatMoney)}
        summaryText={summaryText(investigation.title, analysis, current.version)}
      />
    </div>
  );
}
