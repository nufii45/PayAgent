import { z } from "zod";

// What the model may return when reading a conversation. Raw text, labels and tokens only:
// code assigns order, parses amounts and dates, and decides what was agreed.

export const EVENT_TYPES = [
  "offer", // someone names a price for work ("Website is ₱15,000")
  "counteroffer", // the other side proposes a different price
  "acceptance", // explicit yes to a price or scope ("Sige, go", "Yes, proceed for ₱3,000")
  "rejection",
  "scope_request", // asks for work without a price ("Can you add a dashboard?")
  "cancellation", // withdraws or cancels work
  "deposit_request",
  "payment_promise", // "I'll send the deposit tomorrow"
  "payment_claim", // "I've paid already"
  "completion_claim", // "Done na yung dashboard"
  "deadline_change",
] as const;
export type EventType = (typeof EVENT_TYPES)[number];

const text = z.string().trim();
const optionalText = z
  .string()
  .nullish()
  .transform((s) => (s?.trim() ? s.trim() : null));

const Box = z
  .tuple([z.number(), z.number(), z.number(), z.number()])
  .nullish()
  .transform((b) => b ?? null);

export const ExtractedMessage = z.object({
  id: text.min(1),
  evidence: text.min(1), // "E1", "E2", ... as labelled in the prompt
  speaker: z.enum(["you", "client", "unknown"]).catch("unknown"),
  text: text.min(1),
  timestamp: optionalText,
  /** [x, y, width, height] as fractions of the screenshot, if the model can see it. Code decides whether to trust it. */
  box: Box,
});
export type ExtractedMessage = z.infer<typeof ExtractedMessage>;

export const ExtractedEvent = z.object({
  id: text.min(1),
  type: z.enum(EVENT_TYPES),
  /** Short, consistent name of the deliverable this is about ("website", "dashboard add-on"). Null for payments that aren't tied to one item. */
  item: optionalText,
  amountText: optionalText,
  dueDateToken: optionalText,
  messageIds: z.array(text.min(1)).min(1),
  note: optionalText,
});
export type ExtractedEvent = z.infer<typeof ExtractedEvent>;

export const Extraction = z.object({
  clientName: optionalText,
  speakersClear: z.boolean().default(true),
  messages: z.array(ExtractedMessage).default([]),
  events: z.array(ExtractedEvent).default([]),
  unreadable: z
    .array(z.object({ evidence: text.min(1), reason: text.min(1) }))
    .default([]),
});
export type Extraction = z.infer<typeof Extraction>;
