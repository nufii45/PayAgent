import { auditEvents } from "./schema";
import type { Db } from "./index";

export type EntityType = "agent_request" | "invoice" | "approval" | "payment";

/** Append one event. There is deliberately no update or delete counterpart. */
export async function recordAudit(
  db: Pick<Db, "insert">,
  entityType: EntityType,
  entityId: string,
  eventType: string,
  payload?: unknown,
) {
  const [row] = await db
    .insert(auditEvents)
    .values({ entityType, entityId, eventType, payload: payload ?? null })
    .returning({ id: auditEvents.id });
  return row;
}
