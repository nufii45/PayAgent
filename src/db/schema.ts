import { sql } from "drizzle-orm";
import {
  bigint,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Money columns are integer centavos (bigint, read as JS number).
const centavos = (name: string) => bigint(name, { mode: "number" });
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const invoiceStatus = pgEnum("invoice_status", ["draft", "approved", "sent", "paid", "partially_paid", "void"]);
export const currency = pgEnum("currency", ["PHP", "USD"]);
export const inputType = pgEnum("input_type", ["text", "image", "voice"]);
export const approvalAction = pgEnum("approval_action", ["approve", "reject"]);

// Concurrency-safe invoice numbers: INV-0001, INV-0002, ...
export const invoiceNumberSeq = pgSequence("invoice_number_seq", { startWith: 1 });

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email"),
  aliases: text("aliases").array().notNull().default(sql`'{}'::text[]`),
  createdAt: createdAt(),
});

export const evidenceKind = pgEnum("evidence_kind", ["image", "text"]);

// One business case: a conversation the user wants reconstructed.
export const investigations = pgTable("investigations", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull(),
  instruction: text("instruction"),
  // The user's corrections, kept apart from the evidence and the model's reading.
  corrections: jsonb("corrections").notNull().default(sql`'{}'::jsonb`),
  createdAt: createdAt(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const evidenceSources = pgTable(
  "evidence_sources",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    investigationId: uuid("investigation_id")
      .notNull()
      .references(() => investigations.id, { onDelete: "cascade" }),
    kind: evidenceKind("kind").notNull(),
    label: text("label").notNull(),
    position: integer("position").notNull(),
    textContent: text("text_content"),
    imageDataUrl: text("image_data_url"),
    // Same file uploaded twice to one investigation is rejected.
    contentHash: text("content_hash").notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("evidence_hash_uq").on(t.investigationId, t.contentHash), index("evidence_inv_idx").on(t.investigationId, t.position)],
);

// Every analysis is kept. Reanalysis adds a version and never overwrites one.
export const analysisVersions = pgTable(
  "analysis_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    investigationId: uuid("investigation_id")
      .notNull()
      .references(() => investigations.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    trigger: text("trigger").notNull(), // initial | new_evidence | correction | reorder
    // Evidence used, in order, with the E1/E2 labels the model saw.
    evidence: jsonb("evidence").notNull(),
    extraction: jsonb("extraction"),
    analysis: jsonb("analysis"),
    corrections: jsonb("corrections"),
    model: text("model"),
    latencyMs: integer("latency_ms"),
    error: text("error"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("analysis_version_uq").on(t.investigationId, t.version)],
);

export const agentRequests = pgTable("agent_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  investigationId: uuid("investigation_id").references(() => investigations.id, { onDelete: "set null" }),
  inputType: inputType("input_type").notNull(),
  rawInput: text("raw_input").notNull(),
  model: text("model").notNull(),
  proposal: jsonb("proposal"),
  validationResult: jsonb("validation_result"),
  latencyMs: integer("latency_ms"),
  // Full conversation sent to the agent (user turns and follow-up answers).
  conversation: jsonb("conversation"),
  createdAt: createdAt(),
});

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: text("number")
      .notNull()
      .unique()
      .default(sql`'INV-' || lpad(nextval('invoice_number_seq')::text, 4, '0')`),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id),
    currency: currency("currency").notNull().default("PHP"),
    amountCentavos: centavos("amount_centavos").notNull(),
    dueDate: date("due_date", { mode: "string" }).notNull(),
    status: invoiceStatus("status").notNull().default("approved"),
    notes: text("notes"),
    // Unique: one request can create at most one invoice, so double-clicking Approve is harmless.
    createdFromRequestId: uuid("created_from_request_id")
      .unique()
      .references(() => agentRequests.id),
    createdAt: createdAt(),
  },
  (t) => [index("invoices_client_idx").on(t.clientId)],
);

export const invoiceItems = pgTable("invoice_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  amountCentavos: centavos("amount_centavos").notNull(),
});

export const approvals = pgTable("approvals", {
  id: uuid("id").primaryKey().defaultRandom(),
  // Unique: each request is decided once.
  requestId: uuid("request_id")
    .notNull()
    .unique()
    .references(() => agentRequests.id),
  action: approvalAction("action").notNull(),
  edits: jsonb("edits"),
  decidedAt: timestamp("decided_at", { withTimezone: true }).notNull().defaultNow(),
});

// Append-only. The app never updates or deletes rows here.
export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: text("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    eventType: text("event_type").notNull(),
    payload: jsonb("payload"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_entity_idx").on(t.entityType, t.entityId, t.createdAt)],
);
