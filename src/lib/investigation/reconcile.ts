// Turns what the model read into an analysis. All judgement about what was agreed,
// what was paid and what conflicts lives here, in code, so it is testable and repeatable.
import { parseAmount } from "../money";
import { resolveDueDate, type IsoDate } from "../dates";
import type { EventType, ExtractedEvent, ExtractedMessage, Extraction } from "./schema";

export type EvidenceRef = { id: string; label: string };

export type Speaker = "you" | "client" | "unknown";

export type Corrections = {
  /** Keyed by messageKey(): who really sent a message. */
  speakers?: Record<string, "you" | "client">;
  /** Keyed by item key: the amount the user says was agreed, in centavos. */
  amounts?: Record<string, number>;
  /** Keyed by finding id: the user's verdict. */
  decisions?: Record<string, "confirmed" | "rejected" | "unresolved">;
  /** The user's own client name, if the model's was wrong. */
  clientName?: string;
};

export type Message = ExtractedMessage & {
  order: number;
  key: string;
  speaker: Speaker;
  speakerSource: "model" | "user";
  duplicateOf: string | null;
};

export type Classification = "conversation" | "user" | "inferred" | "unresolved";

export type ItemStatus =
  | "requested" // asked for, no price yet
  | "proposed" // priced, not accepted
  | "agreed"
  | "change_proposed" // agreed, then a different price was proposed and not accepted
  | "rejected"
  | "withdrawn"
  | "cancelled"
  | "disputed";

export type Item = {
  key: string;
  label: string;
  status: ItemStatus;
  /** Amount that counts toward the agreed total (agreed or change_proposed items). */
  agreedCentavos: number | null;
  /** Latest price on the table that wasn't accepted. */
  proposedCentavos: number | null;
  /** Amount affected by a cancellation or dispute. */
  affectedCentavos: number | null;
  classification: Classification;
  explanation: string;
  eventIds: string[];
  messageIds: string[];
};

export type TimelineEntry = {
  eventId: string;
  order: number;
  type: EventType;
  itemKey: string | null;
  title: string;
  amountCentavos: number | null;
  effect: string;
  speaker: Speaker;
  messageIds: string[];
  evidenceIds: string[];
};

export type Finding = {
  id: string;
  kind: "item" | "payment" | "deadline" | "issue";
  title: string;
  detail: string;
  amountCentavos: number | null;
  classification: Classification;
  needsReview: boolean;
  decision: "confirmed" | "rejected" | "unresolved" | null;
  messageIds: string[];
};

export type RecommendedAction = "clarify" | "invoice" | "follow_up" | "save_summary";

export type Summary = {
  clientName: string | null;
  agreedTotalCentavos: number;
  /** Agreed amounts the user confirmed or that have explicit acceptance. */
  disputedCentavos: number;
  promisedCentavos: number;
  claimedCentavos: number;
  documentedCentavos: number;
  verifiedCentavos: number;
  /** Agreed total minus payments the client *claims*; only true if the claims are. */
  balanceIfClaimsTrueCentavos: number;
  dueDate: IsoDate | null;
  recommendedAction: RecommendedAction;
  reviewCount: number;
};

export type Analysis = {
  messages: Message[];
  items: Item[];
  timeline: TimelineEntry[];
  findings: Finding[];
  summary: Summary;
  needsSpeakerHelp: boolean;
  /** Message ids whose screenshot boxes passed the sanity checks. */
  trustedBoxes: string[];
};

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

/** Stable key for a message across analysis versions: which screenshot, and what it says. */
export function messageKey(evidenceId: string, text: string) {
  return `${evidenceId}:${norm(text).slice(0, 80)}`;
}

export function itemKey(label: string) {
  return norm(label).replace(/\b(the|add on|addon|add-on)\b/g, " ").replace(/\s+/g, " ").trim() || norm(label);
}

const PROPOSALS: EventType[] = ["offer", "counteroffer"];

export function reconcile(extraction: Extraction, evidence: EvidenceRef[], corrections: Corrections = {}, now = new Date()): Analysis {
  const evidenceOrder = new Map(evidence.map((e, i) => [e.id, i]));
  const issues: Finding[] = [];

  // 1. Messages: order by screenshot position, then by position within it. Apply speaker corrections.
  const known = extraction.messages.filter((m) => evidenceOrder.has(m.evidence));
  const dropped = extraction.messages.length - known.length;
  if (dropped) issues.push(issue("issue:unknown-evidence", "Some messages couldn't be matched to a screenshot", `${dropped} message(s) pointed at evidence that doesn't exist and were ignored.`));

  const sorted = known
    .map((m, i) => ({ m, i }))
    .sort((a, b) => evidenceOrder.get(a.m.evidence)! - evidenceOrder.get(b.m.evidence)! || a.i - b.i);
  const messages: Message[] = [];
  const seen = new Map<string, string>(); // speaker+text → first message id, for overlapping screenshots
  for (const [order, { m }] of sorted.entries()) {
    const key = messageKey(m.evidence, m.text);
    const corrected = corrections.speakers?.[key];
    const speaker: Speaker = corrected ?? m.speaker;
    const dupKey = `${speaker}|${norm(m.text)}`;
    const firstId = seen.get(dupKey);
    const duplicateOf = firstId && messages.find((x) => x.id === firstId)?.evidence !== m.evidence && norm(m.text).length > 12 ? firstId : null;
    if (!firstId) seen.set(dupKey, m.id);
    messages.push({ ...m, order, key, speaker, speakerSource: corrected ? "user" : "model", duplicateOf });
  }
  const byId = new Map(messages.map((m) => [m.id, m]));
  const duplicates = messages.filter((m) => m.duplicateOf);
  if (duplicates.length) {
    issues.push({
      ...issue("issue:duplicates", "Overlapping screenshots", `${duplicates.length} message(s) appear in more than one screenshot. They are counted once.`),
      messageIds: duplicates.map((m) => m.id),
      needsReview: false,
    });
  }

  // 2. Events: keep those that point at real messages, order by their first message, drop events built only on duplicates.
  type Ev = ExtractedEvent & { order: number; speaker: Speaker; amount: number | null; key: string | null };
  const events: Ev[] = [];
  for (const e of extraction.events) {
    const msgs = e.messageIds.map((id) => byId.get(id)).filter((m): m is Message => !!m);
    if (!msgs.length) continue;
    if (msgs.every((m) => m.duplicateOf)) continue;
    let amount: number | null = null;
    if (e.amountText) {
      const p = parseAmount(e.amountText);
      if (p.ok) amount = p.centavos;
      else issues.push({ ...issue(`issue:amount:${e.id}`, `Couldn't read the amount "${e.amountText}"`, p.error), messageIds: msgs.map((m) => m.id) });
    }
    events.push({
      ...e,
      messageIds: msgs.map((m) => m.id),
      order: Math.min(...msgs.map((m) => m.order)),
      speaker: msgs[0].speaker,
      amount,
      key: e.item ? itemKey(e.item) : null,
    });
  }
  events.sort((a, b) => a.order - b.order);

  // Acceptances and rejections without an item refer to the latest priced item.
  let lastPricedKey: string | null = null;
  for (const e of events) {
    if (!e.key && (e.type === "acceptance" || e.type === "rejection" || e.type === "cancellation")) e.key = lastPricedKey;
    if (e.key && (PROPOSALS.includes(e.type) || e.type === "scope_request")) lastPricedKey = e.key;
  }

  // 3. Walk each item's events.
  const items = new Map<string, Item & { proposer: Speaker | null; completed: boolean }>();
  const timeline: TimelineEntry[] = [];
  let promised = 0;
  let claimed = 0;
  let dueToken: { token: string; messageIds: string[] } | null = null;
  const paymentMsgs = { promised: [] as string[], claimed: [] as string[] };

  for (const e of events) {
    if (e.dueDateToken) dueToken = { token: e.dueDateToken, messageIds: e.messageIds };
    let effect = "";
    const item = e.key ? getItem(items, e.key, e.item ?? e.key) : null;
    if (item) {
      item.eventIds.push(e.id);
      item.messageIds.push(...e.messageIds);
    }

    switch (e.type) {
      case "offer":
      case "counteroffer":
        if (!item || e.amount == null) {
          effect = "Price mentioned without an amount";
          break;
        }
        if ((item.status === "agreed" || item.status === "change_proposed") && e.amount !== item.agreedCentavos) {
          item.status = "change_proposed";
          item.proposedCentavos = e.amount;
          effect = "New price proposed after agreement";
        } else if (item.status !== "agreed") {
          item.status = "proposed";
          item.proposedCentavos = e.amount;
          effect = "Proposed";
        } else effect = "Price repeated";
        item.proposer = e.speaker;
        break;
      case "acceptance": {
        if (!item) {
          effect = "Acceptance, but it's unclear of what";
          issues.push({ ...issue(`issue:accept:${e.id}`, "An acceptance couldn't be linked to any price", "Check what this message agreed to."), messageIds: e.messageIds });
          break;
        }
        const amount = e.amount ?? item.proposedCentavos ?? item.agreedCentavos;
        if (amount == null) {
          effect = "Accepted, but no price was named";
          item.status = "requested";
          item.classification = "unresolved";
          item.explanation = "The work was accepted without a price.";
          break;
        }
        const previous = item.agreedCentavos;
        item.agreedCentavos = amount;
        item.proposedCentavos = null;
        item.status = "agreed";
        const selfAccepted = item.proposer && item.proposer !== "unknown" && item.proposer === e.speaker;
        item.classification = selfAccepted || e.speaker === "unknown" ? "inferred" : "conversation";
        item.explanation = selfAccepted
          ? "The same person who proposed the price also 'accepted' it. Check that the other side agreed."
          : e.speaker === "unknown"
            ? "It isn't clear who accepted."
            : "Explicitly accepted in the conversation.";
        effect = previous != null && previous !== amount ? "Agreed at a new price (earlier price superseded)" : "Agreed";
        break;
      }
      case "rejection":
        if (item && (item.status === "proposed" || item.status === "requested")) {
          item.status = "rejected";
          item.proposedCentavos = null;
          effect = "Rejected";
        } else if (item?.status === "change_proposed") {
          item.status = "agreed";
          item.proposedCentavos = null;
          effect = "Price change rejected; earlier agreement stands";
        } else effect = "Rejected";
        break;
      case "scope_request":
        if (item && !item.agreedCentavos && item.status !== "proposed") item.status = "requested";
        effect = "Requested (not a paid agreement yet)";
        break;
      case "cancellation":
        if (!item) {
          effect = "Cancellation, but it's unclear of what";
          break;
        }
        if (item.status === "agreed" || item.status === "change_proposed") {
          item.affectedCentavos = item.agreedCentavos;
          item.agreedCentavos = null;
          item.proposedCentavos = null;
          if (item.completed) {
            item.status = "disputed";
            item.classification = "unresolved";
            item.explanation = "Cancelled after it was reported done. Whether it's still owed needs your decision.";
            effect = "Cancelled after completion: disputed";
          } else {
            item.status = "cancelled";
            item.classification = "conversation";
            item.explanation = "Agreed earlier, then cancelled. Confirm no work was done on it.";
            effect = "Cancelled (earlier agreement superseded)";
          }
        } else {
          item.status = "withdrawn";
          item.proposedCentavos = null;
          effect = "Withdrawn before agreement";
        }
        break;
      case "completion_claim":
        if (item) item.completed = true;
        effect = "Reported as done";
        break;
      case "deposit_request":
        effect = "Deposit requested";
        break;
      case "payment_promise":
        if (e.amount != null) promised += e.amount;
        paymentMsgs.promised.push(...e.messageIds);
        effect = "Promise to pay (not a payment)";
        break;
      case "payment_claim":
        if (e.amount != null) claimed += e.amount;
        paymentMsgs.claimed.push(...e.messageIds);
        effect = "Says they paid (not verified)";
        break;
      case "deadline_change":
        effect = "Deadline changed";
        break;
    }

    timeline.push({
      eventId: e.id,
      order: e.order,
      type: e.type,
      itemKey: e.key,
      title: eventTitle(e, item?.label ?? null),
      amountCentavos: e.amount,
      effect,
      speaker: e.speaker,
      messageIds: e.messageIds,
      evidenceIds: [...new Set(e.messageIds.map((id) => byId.get(id)!.evidence))],
    });
  }

  // 4. User amount corrections win over the conversation.
  for (const item of items.values()) {
    const fixed = corrections.amounts?.[item.key];
    if (fixed != null) {
      item.agreedCentavos = fixed;
      item.status = "agreed";
      item.classification = "user";
      item.explanation = "Amount entered by you.";
    }
  }

  // 5. Findings.
  const findings: Finding[] = [];
  for (const item of items.values()) {
    const needsReview =
      item.status === "change_proposed" ||
      item.status === "disputed" ||
      item.status === "cancelled" ||
      item.status === "requested" ||
      item.classification === "inferred" ||
      item.classification === "unresolved";
    findings.push({
      id: `item:${item.key}`,
      kind: "item",
      title: itemTitle(item),
      detail: item.status === "change_proposed" ? "A different price was proposed after agreement and never accepted. The earlier agreed price is used until you decide." : item.explanation || statusExplanation(item.status),
      amountCentavos: item.agreedCentavos ?? item.affectedCentavos ?? item.proposedCentavos,
      classification: item.classification,
      needsReview,
      decision: null,
      messageIds: [...new Set(item.messageIds)],
    });
  }
  if (promised) findings.push({ id: "payment:promised", kind: "payment", title: "Payment promised", detail: "A promise to pay. Not a payment.", amountCentavos: promised, classification: "conversation", needsReview: false, decision: null, messageIds: paymentMsgs.promised });
  if (claimed) findings.push({ id: "payment:claimed", kind: "payment", title: "Client says they paid", detail: "A claim in the chat, not verified by any receipt or payment provider.", amountCentavos: claimed, classification: "unresolved", needsReview: true, decision: null, messageIds: paymentMsgs.claimed });

  let dueDate: IsoDate | null = null;
  if (dueToken) {
    const r = resolveDueDate(dueToken.token, now);
    if (r.ok) {
      dueDate = r.date;
      findings.push({ id: "deadline", kind: "deadline", title: "Payment due", detail: r.needsConfirmation ? `"${dueToken.token.replace(/_/g, " ")}" can mean different days.` : "From the conversation.", amountCentavos: null, classification: r.needsConfirmation ? "inferred" : "conversation", needsReview: r.needsConfirmation, decision: null, messageIds: dueToken.messageIds });
    } else issues.push({ ...issue("issue:deadline", "Couldn't work out the due date", r.error), messageIds: dueToken.messageIds });
  }
  for (const u of extraction.unreadable) {
    const label = evidence.find((e) => e.id === u.evidence)?.label ?? u.evidence;
    issues.push(issue(`issue:unreadable:${u.evidence}`, `${label} couldn't be fully read`, u.reason));
  }
  const unknownSpeakers = messages.filter((m) => m.speaker === "unknown" && !m.duplicateOf);
  const needsSpeakerHelp = !extraction.speakersClear || unknownSpeakers.length > 0;
  if (needsSpeakerHelp) {
    issues.push({ ...issue("issue:speakers", "Who said what isn't clear", "Tell PayAgent who sent the highlighted messages. It won't guess."), messageIds: unknownSpeakers.map((m) => m.id) });
  }
  findings.push(...issues);

  // 6. Apply the user's decisions.
  for (const f of findings) {
    const d = corrections.decisions?.[f.id];
    if (!d) continue;
    f.decision = d;
    if (d === "confirmed") {
      f.classification = "user";
      f.needsReview = false;
    } else if (d === "unresolved") {
      f.classification = "unresolved";
      f.needsReview = true;
    } else f.needsReview = false;
  }

  // 7. Totals. Rejected findings drop out; unresolved and disputed items never count as agreed.
  const counts = (key: string) => {
    const f = findings.find((x) => x.id === `item:${key}`);
    return f?.decision !== "rejected" && f?.decision !== "unresolved";
  };
  let agreed = 0;
  let disputed = 0;
  for (const item of items.values()) {
    if ((item.status === "agreed" || item.status === "change_proposed") && item.agreedCentavos != null && counts(item.key)) agreed += item.agreedCentavos;
    if (item.status === "disputed" && item.affectedCentavos != null) disputed += item.affectedCentavos;
  }
  const reviewCount = findings.filter((f) => f.needsReview).length;
  const recommendedAction: RecommendedAction =
    reviewCount > 0 || agreed === 0 ? "clarify" : claimed >= agreed ? "save_summary" : promised > 0 ? "follow_up" : "invoice";

  return {
    messages,
    items: [...items.values()].map((i) => ({ key: i.key, label: i.label, status: i.status, agreedCentavos: i.agreedCentavos, proposedCentavos: i.proposedCentavos, affectedCentavos: i.affectedCentavos, classification: i.classification, explanation: i.explanation, eventIds: i.eventIds, messageIds: [...new Set(i.messageIds)] })),
    timeline,
    findings,
    summary: {
      clientName: corrections.clientName ?? extraction.clientName,
      agreedTotalCentavos: agreed,
      disputedCentavos: disputed,
      promisedCentavos: promised,
      claimedCentavos: claimed,
      documentedCentavos: 0,
      verifiedCentavos: 0,
      balanceIfClaimsTrueCentavos: Math.max(0, agreed - claimed),
      dueDate,
      recommendedAction,
      reviewCount,
    },
    needsSpeakerHelp,
    trustedBoxes: trustedBoxes(messages),
  };
}

function getItem(items: Map<string, Item & { proposer: Speaker | null; completed: boolean }>, key: string, label: string) {
  let item = items.get(key);
  if (!item) {
    item = { key, label, status: "requested", agreedCentavos: null, proposedCentavos: null, affectedCentavos: null, classification: "conversation", explanation: "", eventIds: [], messageIds: [], proposer: null, completed: false };
    items.set(key, item);
  }
  return item;
}

function issue(id: string, title: string, detail: string): Finding {
  return { id, kind: "issue", title, detail, amountCentavos: null, classification: "unresolved", needsReview: true, decision: null, messageIds: [] };
}

const TYPE_LABEL: Record<EventType, string> = {
  offer: "Price offered",
  counteroffer: "Counteroffer",
  acceptance: "Accepted",
  rejection: "Rejected",
  scope_request: "Work requested",
  cancellation: "Cancelled",
  deposit_request: "Deposit requested",
  payment_promise: "Payment promised",
  payment_claim: "Payment claimed",
  completion_claim: "Reported done",
  deadline_change: "Deadline changed",
};

function eventTitle(e: { type: EventType }, label: string | null) {
  return label ? `${TYPE_LABEL[e.type]}: ${label}` : TYPE_LABEL[e.type];
}

function itemTitle(item: Item) {
  const label = item.label.charAt(0).toUpperCase() + item.label.slice(1);
  return `${label}: ${STATUS_LABEL[item.status]}`;
}

export const STATUS_LABEL: Record<ItemStatus, string> = {
  requested: "requested, no agreed price",
  proposed: "price proposed, not accepted",
  agreed: "agreed",
  change_proposed: "price change proposed",
  rejected: "rejected",
  withdrawn: "withdrawn",
  cancelled: "cancelled",
  disputed: "disputed",
};

function statusExplanation(status: ItemStatus) {
  if (status === "proposed") return "A price was named but nobody accepted it, so it isn't counted.";
  if (status === "requested") return "Asked for without an agreed price. Not counted until a price is accepted.";
  if (status === "rejected") return "Rejected in the conversation.";
  if (status === "withdrawn") return "Withdrawn before anyone agreed.";
  return "";
}

/** Only trust screenshot boxes if every box on a screenshot is in range and boxes run top to bottom in message order. */
function trustedBoxes(messages: Message[]): string[] {
  const trusted: string[] = [];
  const byEvidence = new Map<string, Message[]>();
  for (const m of messages) byEvidence.set(m.evidence, [...(byEvidence.get(m.evidence) ?? []), m]);
  for (const list of byEvidence.values()) {
    const ok = list.every((m) => {
      const b = m.box;
      return b && b.every((v) => v >= 0 && v <= 1) && b[2] > 0.02 && b[3] > 0.005 && b[0] + b[2] <= 1.01 && b[1] + b[3] <= 1.01;
    });
    if (!ok) continue;
    const ys = list.map((m) => m.box![1]);
    if (ys.every((y, i) => i === 0 || y >= ys[i - 1] - 0.01)) trusted.push(...list.map((m) => m.id));
  }
  return trusted;
}

/** What changed between two analysis versions, worked out by code. */
export type Change = { kind: "item" | "total" | "payment" | "review"; title: string; before: string | null; after: string | null; messageIds: string[] };

export function diffAnalyses(prev: Analysis, next: Analysis, format: (c: number) => string): Change[] {
  const changes: Change[] = [];
  const prevItems = new Map(prev.items.map((i) => [i.key, i]));
  const describe = (i: Item) => {
    const amount = i.agreedCentavos ?? i.affectedCentavos ?? i.proposedCentavos;
    return `${STATUS_LABEL[i.status]}${amount != null ? `, ${format(amount)}` : ""}`;
  };
  for (const item of next.items) {
    const before = prevItems.get(item.key);
    const label = item.label.charAt(0).toUpperCase() + item.label.slice(1);
    const newMsgs = item.messageIds.filter((id) => !prev.messages.some((m) => m.key === next.messages.find((x) => x.id === id)?.key));
    if (!before) changes.push({ kind: "item", title: `${label} appeared`, before: null, after: describe(item), messageIds: newMsgs });
    else if (before.status !== item.status || before.agreedCentavos !== item.agreedCentavos || before.proposedCentavos !== item.proposedCentavos) {
      changes.push({ kind: "item", title: label, before: describe(before), after: describe(item), messageIds: newMsgs });
    }
    prevItems.delete(item.key);
  }
  for (const gone of prevItems.values()) {
    changes.push({ kind: "item", title: `${gone.label} no longer found`, before: describe(gone), after: null, messageIds: [] });
  }
  const s0 = prev.summary;
  const s1 = next.summary;
  if (s0.agreedTotalCentavos !== s1.agreedTotalCentavos) changes.push({ kind: "total", title: "Agreed total", before: format(s0.agreedTotalCentavos), after: format(s1.agreedTotalCentavos), messageIds: [] });
  if (s0.promisedCentavos !== s1.promisedCentavos) changes.push({ kind: "payment", title: "Payments promised", before: format(s0.promisedCentavos), after: format(s1.promisedCentavos), messageIds: [] });
  if (s0.claimedCentavos !== s1.claimedCentavos) changes.push({ kind: "payment", title: "Payments the client says they made", before: format(s0.claimedCentavos), after: format(s1.claimedCentavos), messageIds: [] });
  if (s0.reviewCount !== s1.reviewCount) changes.push({ kind: "review", title: "Items needing your review", before: String(s0.reviewCount), after: String(s1.reviewCount), messageIds: [] });
  return changes;
}
