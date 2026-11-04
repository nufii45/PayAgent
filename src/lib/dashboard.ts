// Dashboard figures, derived only from stored workspace records. Pure functions so they can be tested.
import { diffAnalyses, type Analysis } from "./investigation/reconcile";
import { formatPeso } from "./money";

export type InvestigationRow = {
  id: string;
  title: string;
  updatedAt: Date;
  evidenceCount: number;
  lastFailed: boolean;
  latestTrigger: string | null;
  latestAt: string | null;
  previous: Analysis | null;
  latest: { version: number; analysis: Analysis | null } | null;
};
export type InvoiceRow = { id: string; number: string; clientName: string; amountCentavos: number; currency: "PHP" | "USD"; status: string; investigationId: string | null };
export type DraftRow = { id: string; investigationId: string | null; draft: { clientName: string; totalCentavos: number; currency: "PHP" | "USD" }; createdAt: Date };

export type InvestigationStatus = "Analyzing" | "Analysis failed" | "Not analysed" | "Needs clarification" | "Ready for review" | "Up to date";

export function investigationStatus(r: InvestigationRow, now = new Date()): InvestigationStatus {
  const a = r.latest?.analysis;
  if (!a) {
    if (r.lastFailed) return "Analysis failed";
    return now.getTime() - new Date(r.updatedAt).getTime() < 3 * 60_000 ? "Analyzing" : "Not analysed";
  }
  if (a.summary.recommendedAction === "clarify") return "Needs clarification";
  if (a.summary.reviewCount > 0) return "Ready for review";
  return "Up to date";
}

export const OPEN_INVOICE = ["approved", "sent", "partially_paid"];

export type AttentionItem = {
  key: string;
  issue: string;
  investigation: { id: string; title: string } | null;
  status: "Needs review" | "Needs clarification" | "Awaiting approval" | "Changed by new evidence" | "Analysis failed";
  next: string;
  href: string;
};

const NEXT_STEP: Record<Analysis["summary"]["recommendedAction"], string> = {
  clarify: "Ask the client to confirm",
  invoice: "Draft the invoice",
  follow_up: "Follow up on the promised payment",
  save_summary: "Save the summary",
};

export function buildDashboard(input: { investigations: InvestigationRow[]; invoices: InvoiceRow[]; drafts: DraftRow[]; now?: Date }) {
  const now = input.now ?? new Date();
  const invoicedInvestigations = new Set(input.invoices.filter((i) => i.status !== "void" && i.investigationId).map((i) => i.investigationId!));
  const analysed = input.investigations.filter((r) => r.latest?.analysis);

  // Potential receivables: agreed amounts from investigations not yet turned into an invoice. Investigation
  // amounts are read as pesos. Disputed amounts and payment claims are shown beside the figure, never netted silently.
  const open = analysed.filter((r) => !invoicedInvestigations.has(r.id));
  const receivables = open.reduce(
    (acc, r) => {
      const s = r.latest!.analysis!.summary;
      acc.agreed += s.agreedTotalCentavos - s.verifiedCentavos;
      acc.disputed += s.disputedCentavos;
      acc.claimed += s.claimedCentavos;
      acc.promised += s.promisedCentavos;
      if (s.agreedTotalCentavos > 0) acc.count++;
      return acc;
    },
    { agreed: 0, disputed: 0, claimed: 0, promised: 0, count: 0 },
  );

  // Approved invoices not marked paid or cancelled, per currency (never added across currencies).
  const awaiting = new Map<"PHP" | "USD", { count: number; total: number }>();
  for (const inv of input.invoices.filter((i) => OPEN_INVOICE.includes(i.status))) {
    const cur = awaiting.get(inv.currency) ?? { count: 0, total: 0 };
    cur.count++;
    cur.total += inv.amountCentavos;
    awaiting.set(inv.currency, cur);
  }

  const attention: AttentionItem[] = [];
  for (const r of input.investigations) {
    const ref = { id: r.id, title: r.title };
    const a = r.latest?.analysis;
    if (!a) {
      if (r.lastFailed) attention.push({ key: `${r.id}:failed`, issue: "The analysis didn't finish. Your evidence is saved.", investigation: ref, status: "Analysis failed", next: "Run the analysis again", href: `/investigations/${r.id}` });
      continue;
    }
    const recentlyChanged = r.latestTrigger === "new_evidence" && r.previous && r.latestAt && now.getTime() - new Date(r.latestAt).getTime() < 3 * 86_400_000;
    if (recentlyChanged) {
      const changes = diffAnalyses(r.previous!, a, formatPeso).filter((c) => c.kind !== "review");
      if (changes.length)
        attention.push({ key: `${r.id}:changed`, issue: `New evidence changed ${changes.length === 1 ? changes[0].title.toLowerCase() : `${changes.length} findings`}.`, investigation: ref, status: "Changed by new evidence", next: "See what changed and why", href: `/investigations/${r.id}` });
    }
    const flagged = a.findings.filter((f) => f.needsReview);
    for (const f of flagged.slice(0, 2))
      attention.push({
        key: `${r.id}:${f.id}`,
        issue: f.title,
        investigation: ref,
        status: a.summary.recommendedAction === "clarify" ? "Needs clarification" : "Needs review",
        next: a.summary.recommendedAction === "clarify" ? NEXT_STEP.clarify : "Confirm or correct it",
        href: `/investigations/${r.id}#review`,
      });
    if (flagged.length > 2)
      attention.push({ key: `${r.id}:more`, issue: `${flagged.length - 2} more finding${flagged.length - 2 === 1 ? "" : "s"} to review.`, investigation: ref, status: "Needs review", next: "Open the investigation", href: `/investigations/${r.id}#review` });
  }
  const titles = new Map(input.investigations.map((r) => [r.id, r.title]));
  for (const d of input.drafts)
    attention.push({
      key: `draft:${d.id}`,
      issue: `Invoice draft for ${d.draft.clientName || "an unnamed client"} is waiting for your approval.`,
      investigation: d.investigationId && titles.has(d.investigationId) ? { id: d.investigationId, title: titles.get(d.investigationId)! } : null,
      status: "Awaiting approval",
      next: "Review and approve, or discard",
      href: `/invoices/drafts/${d.id}`,
    });

  const reviewFindings = analysed.reduce((n, r) => n + r.latest!.analysis!.summary.reviewCount, 0);
  const failed = input.investigations.filter((r) => !r.latest?.analysis && r.lastFailed).length;

  const insights: string[] = [];
  const withClaims = open.filter((r) => r.latest!.analysis!.summary.claimedCentavos > 0).length;
  if (withClaims) insights.push(`${withClaims} investigation${withClaims === 1 ? " has" : "s have"} a payment the client says was made, which isn't verified yet.`);
  const withPromises = open.filter((r) => r.latest!.analysis!.summary.promisedCentavos > 0).length;
  if (withPromises) insights.push(`${withPromises} investigation${withPromises === 1 ? " includes" : "s include"} a promised payment. A promise isn't counted as paid.`);
  const disputed = open.filter((r) => r.latest!.analysis!.summary.disputedCentavos > 0).length;
  if (disputed) insights.push(`${disputed} agreement${disputed === 1 ? " has" : "s have"} a disputed amount, totalling ${formatPeso(receivables.disputed)}.`);
  if (input.drafts.length) insights.push(`${input.drafts.length} invoice draft${input.drafts.length === 1 ? " is" : "s are"} waiting for your approval.`);

  return {
    investigationCount: input.investigations.length,
    receivables,
    awaiting: [...awaiting.entries()].map(([currency, v]) => ({ currency, ...v })),
    needsReview: { total: reviewFindings + input.drafts.length + failed, findings: reviewFindings, drafts: input.drafts.length, failed },
    attention,
    insights,
  };
}
