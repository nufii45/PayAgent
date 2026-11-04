"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { addEvidenceAndReanalyse, correct, draftInvoice, removeEvidenceItem, removeInvestigation, reorder, rerunAnalysis } from "@/app/investigations/actions";
import { ReviewForm } from "@/app/new/ReviewForm";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TextField } from "@/components/ui/Field";
import { StatusLabel, type StatusTone } from "@/components/ui/StatusLabel";
import { formatDate } from "@/lib/dates";
import type { InvoiceDraft } from "@/lib/invoice-schema";
import type { Analysis, Change, Classification, Finding, Message } from "@/lib/investigation/reconcile";
import { moneyText } from "@/lib/investigation/reconcile";
import { formatMoney, parseAmount } from "@/lib/money";
import { EvidencePicker, Working, type PickedEvidence } from "./EvidencePicker";

export type EvidenceRow = { id: string; label: string; kind: "image" | "text"; imageDataUrl: string | null; textContent: string | null };
export type VersionInfo = { version: number; trigger: string; createdAt: string; model: string | null; latencyMs: number | null };

type Props = {
  id: string;
  title: string;
  instruction: string | null;
  evidence: EvidenceRow[];
  versions: VersionInfo[];
  current: VersionInfo & { analysis: Analysis; evidenceMap: { eid: string; evidenceId: string; label: string }[] };
  isLatest: boolean;
  changes: Change[] | null;
  previousVersion: number | null;
  clarification: string | null;
  followUp: string | null;
  summaryText: string;
};

const TRIGGER: Record<string, string> = {
  initial: "first analysis",
  new_evidence: "after new evidence",
  correction: "after your correction",
  reorder: "after reordering",
  removed_evidence: "after removing evidence",
};

const CLASS_LABEL: Record<Classification, { label: string; tone: StatusTone }> = {
  conversation: { label: "Backed by the chat", tone: "success" },
  user: { label: "Confirmed by you", tone: "success" },
  inferred: { label: "Inferred, check it", tone: "warning" },
  unresolved: { label: "Unresolved", tone: "danger" },
};

function Badge({ c }: { c: Classification }) {
  const s = CLASS_LABEL[c];
  return <StatusLabel tone={s.tone}>{s.label}</StatusLabel>;
}

export function InvestigationView(p: Props) {
  const a = p.current.analysis;
  const [selected, setSelected] = useState<{ title: string; messageIds: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [working, setWorking] = useState<string | null>(null);
  const [adding, setAdding] = useState<PickedEvidence>({ images: [], text: "" });
  const [invoice, setInvoice] = useState<{ requestId: string; draft: InvoiceDraft; warnings: string[] } | null>(null);

  const msgById = useMemo(() => new Map(a.messages.map((m) => [m.id, m])), [a.messages]);
  const evidenceFor = (eid: string) => {
    const map = p.current.evidenceMap.find((e) => e.eid === eid);
    return { label: map?.label ?? eid, row: p.evidence.find((e) => e.id === map?.evidenceId) ?? null };
  };

  const run = (label: string | null, fn: () => Promise<{ error?: string; skipped?: number } | void>, after?: () => void) => {
    setError(null);
    setNotice(null);
    setWorking(label);
    start(async () => {
      const r = await fn();
      setWorking(null);
      if (r && "error" in r && r.error) setError(r.error);
      else after?.();
    });
  };

  const show = (title: string, messageIds: string[]) => {
    setSelected({ title, messageIds });
    if (typeof window !== "undefined" && window.innerWidth < 1024) document.getElementById("evidence")?.scrollIntoView({ behavior: "smooth" });
  };

  const review = a.findings.filter((f) => f.needsReview);
  const settled = a.findings.filter((f) => !f.needsReview);
  const s = a.summary;
  const readOnly = !p.isLatest || pending;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold">{p.title}</h1>
        {p.instruction && <p className="max-w-measure text-muted">You asked: {p.instruction}</p>}
        <nav aria-label="Analysis versions" className="flex flex-wrap items-center gap-2 text-sm">
          {p.versions.map((v) => (
            <Link
              key={v.version}
              href={`/investigations/${p.id}?v=${v.version}`}
              aria-current={v.version === p.current.version ? "page" : undefined}
              className={`rounded-full border-2 px-3 py-1 font-bold ${v.version === p.current.version ? "border-ink bg-ink text-page" : "border-line bg-surface"}`}
            >
              v{v.version}
            </Link>
          ))}
          <span className="text-muted">
            Analysis v{p.current.version}, {TRIGGER[p.current.trigger] ?? p.current.trigger}
            {p.current.model ? ` · ${p.current.model}` : ""}
            {p.current.latencyMs && p.current.latencyMs >= 1000 ? ` · ${(p.current.latencyMs / 1000).toFixed(0)}s` : ""}
          </span>
        </nav>
        {!p.isLatest && (
          <p className="rounded-control border-2 border-warning bg-warning-bg p-3 text-warning">
            You&apos;re viewing an older version. <Link className="font-bold underline" href={`/investigations/${p.id}`}>Go to the latest</Link> to make changes.
          </p>
        )}
      </div>

      {working && <Working label={working} />}
      {error && <p role="alert" className="rounded-control border-2 border-danger bg-danger-bg p-3 font-semibold text-danger">{error}</p>}
      {notice && <p role="status" className="rounded-control border-2 border-success bg-success-bg p-3 font-semibold text-success">{notice}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          {p.changes && p.changes.length > 0 && (
            <Card className="flex flex-col gap-3 border-ink">
              <h2 className="text-xl font-extrabold">What changed since v{p.previousVersion}</h2>
              <ul className="flex flex-col gap-3">
                {p.changes.map((c, i) => (
                  <li key={i} className="flex flex-col gap-1 border-b border-line pb-3 last:border-0 last:pb-0">
                    <span className="font-bold">{c.title}</span>
                    <span>
                      {c.before ? <span className="text-muted line-through">{c.before}</span> : <span className="text-muted">new</span>} → <span className="font-semibold">{c.after ?? "removed"}</span>
                    </span>
                    {c.messageIds.length > 0 && (
                      <button type="button" className="self-start text-sm font-bold underline" onClick={() => show(`Why: ${c.title}`, c.messageIds)}>
                        See the message that changed it
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}
          {p.changes && p.changes.length === 0 && p.previousVersion && (
            <p className="rounded-control border-2 border-line bg-surface p-3">Nothing financial changed since v{p.previousVersion}.</p>
          )}

          <Card className="flex flex-col gap-4">
            <h2 className="text-xl font-extrabold">Summary{s.clientName ? ` with ${s.clientName}` : ""}</h2>
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <Stat label="Agreed total (backed by the chat)" value={moneyText(a, "agreed", formatMoney)} strong />
              <Stat label="Due" value={s.dueDate ? formatDate(s.dueDate) : "Not agreed"} />
              <Stat label="Promised by client (not paid)" value={moneyText(a, "promised", formatMoney)} />
              <Stat label="Client says paid (not verified)" value={moneyText(a, "claimed", formatMoney)} />
              <Stat label="Verified payments" value={formatMoney(s.verifiedCentavos, a.currency)} />
              <Stat label="Balance if the client's claims are true" value={moneyText(a, "balance", formatMoney)} />
              {s.disputedCentavos > 0 && <Stat label="Disputed" value={moneyText(a, "disputed", formatMoney)} />}
            </dl>
            <p className="font-semibold">
              {s.recommendedAction === "clarify" && `Next: ${s.reviewCount} thing${s.reviewCount === 1 ? "" : "s"} need${s.reviewCount === 1 ? "s" : ""} your review before invoicing. Resolve them below, or ask the client.`}
              {s.recommendedAction === "invoice" && "Next: everything is backed by the chat. Draft the invoice."}
              {s.recommendedAction === "follow_up" && "Next: draft the invoice, and follow up on the promised payment."}
              {s.recommendedAction === "save_summary" && "Next: the client says everything is paid. Ask for the receipt to verify it."}
            </p>
          </Card>

          {a.needsSpeakerHelp && p.isLatest && (
            <Card className="flex flex-col gap-3 border-warning">
              <h2 className="text-xl font-extrabold">Who sent these messages?</h2>
              <p className="text-muted">PayAgent couldn&apos;t tell from the screenshot and won&apos;t guess.</p>
              <ul className="flex flex-col gap-3">
                {a.messages.filter((m) => m.speaker === "unknown" && !m.duplicateOf).map((m) => (
                  <li key={m.id} className="flex flex-col gap-2 rounded-control border-2 border-line p-3">
                    <q>{m.text}</q>
                    <div className="flex gap-2">
                      {(["you", "client"] as const).map((who) => (
                        <Button key={who} type="button" variant="secondary" disabled={readOnly} onClick={() => run("Updating…", () => correct(p.id, { speakers: { [m.key]: who } }))}>
                          {who === "you" ? "Me" : "Client"}
                        </Button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {review.length > 0 && (
            <section className="flex flex-col gap-3" aria-labelledby="review-h">
              <h2 id="review-h" className="text-xl font-extrabold">Needs your review ({review.length})</h2>
              {review.map((f) => (
                <FindingCard key={f.id} f={f} readOnly={readOnly} onSource={show} onCorrect={(patch, label) => run(label, () => correct(p.id, patch))} />
              ))}
            </section>
          )}

          <section className="flex flex-col gap-3" aria-labelledby="timeline-h">
            <h2 id="timeline-h" className="text-xl font-extrabold">Timeline</h2>
            {a.timeline.length === 0 ? (
              <p className="text-muted">No financial events were found in this evidence.</p>
            ) : (
              <ol className="tr-surface divide-y divide-line">
                {a.timeline.map((t, i) => (
                  <li key={t.eventId} className="flex flex-col gap-1 p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-bold">
                        {i + 1}. {t.title}
                      </span>
                      {t.amountCentavos != null && <span className="font-bold tabular-nums">{formatMoney(t.amountCentavos, t.currency)}</span>}
                    </div>
                    <span className="text-sm text-muted">
                      {t.speaker === "you" ? "You" : t.speaker === "client" ? "Client" : "Unknown sender"} · {t.effect}
                    </span>
                    <button type="button" className="self-start text-sm font-bold underline" onClick={() => show(t.title, t.messageIds)}>
                      View source
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </section>

          {settled.length > 0 && (
            <section className="flex flex-col gap-3" aria-labelledby="findings-h">
              <h2 id="findings-h" className="text-xl font-extrabold">Findings</h2>
              {settled.map((f) => (
                <FindingCard key={f.id} f={f} readOnly={readOnly} onSource={show} onCorrect={(patch, label) => run(label, () => correct(p.id, patch))} />
              ))}
            </section>
          )}

          <Card className="flex flex-col gap-4">
            <h2 className="text-xl font-extrabold">Next actions</h2>
            <p className="text-sm text-muted">Nothing is sent or saved as an invoice without you. Messages are drafts for you to copy.</p>
            {invoice ? (
              <div className="flex flex-col gap-3">
                {invoice.warnings.length > 0 && (
                  <ul className="list-disc rounded-control border-2 border-warning bg-warning-bg p-3 pl-8 text-warning">
                    {invoice.warnings.map((w) => <li key={w}>{w}</li>)}
                  </ul>
                )}
                <ReviewForm requestId={invoice.requestId} draft={invoice.draft} onDiscarded={() => setInvoice(null)} />
              </div>
            ) : (
              <div className="tr-action-bar tr-action-bar--flow">
                <Button
                  type="button"
                  disabled={readOnly}
                  onClick={() =>
                    run(null, async () => {
                      const r = await draftInvoice(p.id);
                      if ("error" in r) return { error: r.error };
                      setInvoice(r);
                    })
                  }
                >
                  Draft invoice from agreed terms
                </Button>
              </div>
            )}
            {p.clarification && <Draft title="Clarification request" text={p.clarification} />}
            {p.followUp && <Draft title="Payment follow-up" text={p.followUp} />}
            <Draft title="Agreement summary" text={p.summaryText} />
          </Card>

          {p.isLatest && (
            <Card className="flex flex-col gap-3">
              <h2 className="text-xl font-extrabold">Delete this investigation</h2>
              <p className="text-muted">Removes every screenshot, pasted text and analysis version. Approved invoices stay.</p>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const confirmed = (e.currentTarget.elements.namedItem("confirm") as HTMLInputElement).checked;
                  if (!confirmed) return setError("Tick the box to confirm deletion.");
                  run("Deleting…", () => removeInvestigation(p.id));
                }}
                className="flex flex-col gap-3"
              >
                <label className="flex items-center gap-2">
                  <input type="checkbox" name="confirm" className="size-5" /> I understand this can&apos;t be undone
                </label>
                <div className="tr-action-bar tr-action-bar--flow">
                  <Button type="submit" variant="secondary" disabled={pending}>
                    Delete investigation
                  </Button>
                </div>
              </form>
            </Card>
          )}
        </div>

        <aside id="evidence" className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-4" aria-labelledby="evidence-h">
          <h2 id="evidence-h" className="text-xl font-extrabold">Evidence</h2>
          {selected ? (
            <SourceView
              title={selected.title}
              messages={selected.messageIds.map((id) => msgById.get(id)).filter((m): m is Message => !!m)}
              trusted={new Set(a.trustedBoxes)}
              evidenceFor={evidenceFor}
              onClose={() => setSelected(null)}
            />
          ) : (
            <p className="text-sm text-muted">Choose &ldquo;View source&rdquo; on any finding to see the exact messages behind it.</p>
          )}

          <ol className="flex flex-col gap-3">
            {p.evidence.map((e, i) => {
              const eid = p.current.evidenceMap.find((m) => m.evidenceId === e.id)?.eid;
              const msgs = eid ? a.messages.filter((m) => m.evidence === eid) : [];
              return (
                <li key={e.id} className="tr-surface flex flex-col gap-2 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">{e.label}</span>
                    {!eid && <span className="text-sm text-warning">Not in this version</span>}
                  </div>
                  <details>
                    <summary className="cursor-pointer text-sm font-bold">
                      {msgs.length} message{msgs.length === 1 ? "" : "s"} read{msgs.some((m) => m.duplicateOf) ? ", some overlap other screenshots" : ""}
                    </summary>
                    {e.kind === "image" && e.imageDataUrl && (
                      // eslint-disable-next-line @next/next/no-img-element -- evidence stored as data URL
                      <img src={e.imageDataUrl} alt={`${e.label}, as uploaded`} className="mt-2 max-h-80 w-full rounded-input border border-line object-contain" />
                    )}
                    {e.kind === "text" && <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap rounded-input bg-page p-2 text-sm">{e.textContent}</pre>}
                    <ul className="mt-2 flex flex-col gap-1 text-sm">
                      {msgs.map((m) => (
                        <li key={m.id} className={m.duplicateOf ? "text-muted line-through" : ""}>
                          <span className="font-bold">{m.speaker === "you" ? "You" : m.speaker === "client" ? "Client" : "Unknown"}{m.speakerSource === "user" ? " (set by you)" : ""}:</span> {m.text}
                          {p.isLatest && !m.duplicateOf && m.speaker !== "unknown" && (
                            <button type="button" className="ml-2 underline" disabled={readOnly} onClick={() => run("Updating…", () => correct(p.id, { speakers: { [m.key]: m.speaker === "you" ? "client" : "you" } }))}>
                              Wrong sender?
                            </button>
                          )}
                        </li>
                      ))}
                    </ul>
                  </details>
                  {p.isLatest && (
                    <div className="flex flex-wrap gap-1">
                      <button type="button" className="tr-button tr-button--secondary min-h-0 px-2 py-1 text-sm" disabled={readOnly || i === 0} onClick={() => { const ids = p.evidence.map((x) => x.id); [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]; run("Reordering…", () => reorder(p.id, ids)); }}>
                        Earlier
                      </button>
                      <button type="button" className="tr-button tr-button--secondary min-h-0 px-2 py-1 text-sm" disabled={readOnly || i === p.evidence.length - 1} onClick={() => { const ids = p.evidence.map((x) => x.id); [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]]; run("Reordering…", () => reorder(p.id, ids)); }}>
                        Later
                      </button>
                      <button type="button" className="tr-button tr-button--secondary min-h-0 px-2 py-1 text-sm" disabled={readOnly || p.evidence.length === 1} onClick={() => run("Removing…", () => removeEvidenceItem(p.id, e.id))}>
                        Remove
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ol>

          {p.isLatest && (
            <Card className="flex flex-col gap-4">
              <h3 className="text-lg font-extrabold">Add evidence and reanalyse</h3>
              <p className="text-sm text-muted">New screenshots are added after the existing ones. PayAgent rereads everything and shows what changed. Your earlier versions are kept.</p>
              <EvidencePicker value={adding} onChange={setAdding} disabled={pending} />
              <div className="tr-action-bar tr-action-bar--flow">
                <button type="button" className="min-h-11 text-sm font-bold underline" disabled={pending} onClick={() => run("Reanalysing…", () => rerunAnalysis(p.id))}>
                  Reanalyse without new evidence
                </button>
                <Button
                  type="button"
                  disabled={pending || (!adding.images.length && !adding.text.trim())}
                  onClick={() =>
                    run(
                      "Reanalysing with the new evidence…",
                      () => addEvidenceAndReanalyse(p.id, { images: adding.images.map((x) => x.dataUrl), texts: [adding.text] }),
                      () => setAdding({ images: [], text: "" }),
                    )
                  }
                >
                  Add and reanalyse
                </Button>
              </div>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex flex-col">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`tabular-nums ${strong ? "text-2xl font-extrabold" : "font-bold"}`}>{value}</dd>
    </div>
  );
}

function FindingCard({ f, readOnly, onSource, onCorrect }: { f: Finding; readOnly: boolean; onSource: (t: string, ids: string[]) => void; onCorrect: (patch: Parameters<typeof correct>[1], label: string) => void }) {
  const [fixing, setFixing] = useState(false);
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState<string | null>(null);
  const itemKey = f.kind === "item" ? f.id.slice(5) : null;
  return (
    <div className="tr-surface flex flex-col gap-2 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="font-bold">{f.title}</span>
        <Badge c={f.classification} />
      </div>
      {f.amountCentavos != null && <span className="text-lg font-extrabold tabular-nums">{formatMoney(f.amountCentavos, f.currency)}</span>}
      <p className="text-muted">{f.detail}</p>
      {f.decision && <p className="text-sm font-semibold">Your decision: {f.decision}</p>}
      <div className="flex flex-wrap gap-2">
        {f.messageIds.length > 0 && (
          <button type="button" className="tr-button tr-button--secondary min-h-0 px-3 py-1.5 text-sm" onClick={() => onSource(f.title, f.messageIds)}>
            View source
          </button>
        )}
        {!readOnly && f.kind !== "issue" && (
          <>
            <button type="button" className="tr-button tr-button--secondary min-h-0 px-3 py-1.5 text-sm" onClick={() => onCorrect({ decisions: { [f.id]: "confirmed" } }, "Saving…")}>
              Confirm
            </button>
            <button type="button" className="tr-button tr-button--secondary min-h-0 px-3 py-1.5 text-sm" onClick={() => onCorrect({ decisions: { [f.id]: "rejected" } }, "Saving…")}>
              Reject
            </button>
            <button type="button" className="tr-button tr-button--secondary min-h-0 px-3 py-1.5 text-sm" onClick={() => onCorrect({ decisions: { [f.id]: "unresolved" } }, "Saving…")}>
              Mark unresolved
            </button>
          </>
        )}
        {/* A real mixed deal has to be clearable, or the investigation could never leave review. */}
        {!readOnly && f.id === "issue:currency" && !f.decision && (
          <button type="button" className="tr-button tr-button--secondary min-h-0 px-3 py-1.5 text-sm" onClick={() => onCorrect({ decisions: { [f.id]: "confirmed" } }, "Saving…")}>
            Confirm
          </button>
        )}
        {!readOnly && itemKey && (
          <button type="button" className="tr-button tr-button--secondary min-h-0 px-3 py-1.5 text-sm" onClick={() => setFixing((x) => !x)}>
            Fix amount
          </button>
        )}
      </div>
      {fixing && itemKey && (
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const r = parseAmount(amount);
            if (!r.ok) return setAmountError("Enter the amount as a number, for example 3,000");
            onCorrect({ amounts: { [itemKey]: r.centavos } }, "Saving your amount…");
          }}
        >
          <TextField label="Agreed amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} error={amountError ?? undefined} />
          <Button type="submit">Save amount</Button>
        </form>
      )}
    </div>
  );
}

function SourceView({
  title,
  messages,
  trusted,
  evidenceFor,
  onClose,
}: {
  title: string;
  messages: Message[];
  trusted: Set<string>;
  evidenceFor: (eid: string) => { label: string; row: EvidenceRow | null };
  onClose: () => void;
}) {
  const groups = [...new Set(messages.map((m) => m.evidence))];
  return (
    <div className="tr-surface flex flex-col gap-3 border-ink p-4">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-extrabold">Source: {title}</h3>
        <button type="button" className="text-sm font-bold underline" onClick={onClose}>
          Close
        </button>
      </div>
      {groups.map((eid) => {
        const { label, row } = evidenceFor(eid);
        const here = messages.filter((m) => m.evidence === eid);
        return (
          <div key={eid} className="flex flex-col gap-2">
            <span className="text-sm font-bold">{label}{!row && " (removed)"}</span>
            {row?.kind === "image" && row.imageDataUrl && (
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- evidence stored as data URL */}
                <img src={row.imageDataUrl} alt={`${label}, with the source messages marked where possible`} className="w-full rounded-input border border-line" />
                {here.filter((m) => trusted.has(m.id) && m.box).map((m) => (
                  <span
                    key={m.id}
                    aria-hidden="true"
                    className="pointer-events-none absolute rounded-md border-[3px] border-warning bg-warning/10"
                    style={{ left: `${m.box![0] * 100}%`, top: `${m.box![1] * 100}%`, width: `${m.box![2] * 100}%`, height: `${m.box![3] * 100}%` }}
                  />
                ))}
              </div>
            )}
            <ul className="flex flex-col gap-2">
              {here.map((m) => (
                <li key={m.id} className="rounded-control border-l-4 border-warning bg-page p-2">
                  <span className="text-sm font-bold">{m.speaker === "you" ? "You" : m.speaker === "client" ? "Client" : "Unknown sender"}{m.timestamp ? ` · ${m.timestamp}` : ""}</span>
                  <p>&ldquo;{m.text}&rdquo;</p>
                </li>
              ))}
            </ul>
            {row?.kind === "image" && here.some((m) => !trusted.has(m.id)) && <p className="text-sm text-muted">Exact position not marked: the quoted text above is the source.</p>}
          </div>
        );
      })}
    </div>
  );
}

function Draft({ title, text }: { title: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <details className="rounded-control border-2 border-line p-3">
      <summary className="cursor-pointer font-bold">{title} (draft)</summary>
      <pre className="mt-2 whitespace-pre-wrap font-sans">{text}</pre>
      <button
        type="button"
        className="tr-button tr-button--secondary mt-2 min-h-0 px-3 py-1.5 text-sm"
        onClick={() => navigator.clipboard?.writeText(text).then(() => setCopied(true), () => setCopied(false))}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </details>
  );
}
