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

export const agentRequests = pgTable("agent_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  inputType: inputType("input_type").notNull(),
  rawInput: text("raw_input").notNull(),
  model: text("model").notNull(),
  proposal: jsonb("proposal"),
  validationResult: jsonb("validation_result"),
  latencyMs: integer("latency_ms"),
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
    createdFromRequestId: uuid("created_from_request_id").references(() => agentRequests.id),
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
  requestId: uuid("request_id")
    .notNull()
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
