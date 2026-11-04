// Guest workspace records: creation, retention and preferences. Pure database code; the request-bound
// lookup lives in current-workspace.ts.
import { eq, lt, sql } from "drizzle-orm";
import type { Db } from "@/db";
import { auditEvents, workspaces } from "@/db/schema";

import type { Preferences } from "./preferences";

export type { BusinessRole, Preferences } from "./preferences";
export type Workspace = {
  id: string;
  preferences: Preferences;
  onboardedAt: Date | null;
  privacyAcknowledgedAt: Date | null;
  /** True when this browser's earlier workspace had expired or been deleted and this one replaced it. */
  replacedExpired: boolean;
  lastSeenAt: Date;
  createdAt: Date;
};


const HOUR = 3_600_000;

function toWorkspace(row: typeof workspaces.$inferSelect): Workspace {
  return {
    id: row.id,
    preferences: (row.preferences ?? {}) as Preferences,
    onboardedAt: row.onboardedAt,
    privacyAcknowledgedAt: row.privacyAcknowledgedAt,
    replacedExpired: !!row.replacedExpired,
    lastSeenAt: row.lastSeenAt,
    createdAt: row.createdAt,
  };
}

/** Delete every workspace (and, by cascade, all of its records) unused for longer than the retention period. */
export async function purgeExpired(db: Db, retentionDays: number, now = new Date()) {
  const cutoff = new Date(now.getTime() - retentionDays * 24 * HOUR);
  const rows = await db.delete(workspaces).where(lt(workspaces.lastSeenAt, cutoff)).returning({ id: workspaces.id });
  return rows.length;
}

/**
 * Returns the workspace for an id from the guest cookie, creating it if needed.
 * isNew: the middleware has just issued this id. If an older id has no row (expired or deleted),
 * a fresh workspace is created under it and flagged so the dashboard can explain what happened.
 */
export async function ensureWorkspace(db: Db, id: string, opts: { isNew: boolean; retentionDays: number; now?: Date }): Promise<Workspace> {
  const now = opts.now ?? new Date();
  let row: typeof workspaces.$inferSelect | undefined = (await db.select().from(workspaces).where(eq(workspaces.id, id)))[0];
  if (row && now.getTime() - row.lastSeenAt.getTime() > opts.retentionDays * 24 * HOUR) {
    await db.delete(workspaces).where(eq(workspaces.id, id));
    row = undefined;
  }
  if (!row) {
    await db
      .insert(workspaces)
      .values({ id, lastSeenAt: now, replacedExpired: opts.isNew ? null : now })
      .onConflictDoNothing();
    [row] = await db.select().from(workspaces).where(eq(workspaces.id, id));
    return toWorkspace(row!);
  }
  if (now.getTime() - row.lastSeenAt.getTime() > HOUR) {
    await db.update(workspaces).set({ lastSeenAt: now }).where(eq(workspaces.id, id));
    // Piggyback the retention sweep on an occasional write instead of needing a cron job.
    await purgeExpired(db, opts.retentionDays, now);
  }
  return toWorkspace(row);
}

export async function savePreferences(db: Db, id: string, prefs: Preferences, opts: { onboarded?: boolean; acknowledgePrivacy?: boolean } = {}) {
  await db.transaction(async (tx) => {
    await tx
      .update(workspaces)
      .set({
        preferences: sql`${workspaces.preferences} || ${JSON.stringify(prefs)}::jsonb`,
        ...(opts.onboarded ? { onboardedAt: new Date() } : {}),
        ...(opts.acknowledgePrivacy ? { privacyAcknowledgedAt: new Date() } : {}),
      })
      .where(eq(workspaces.id, id));
    if (!Object.keys(prefs).length && !opts.acknowledgePrivacy) return;
    await tx.insert(auditEvents).values({
      workspaceId: id,
      entityType: "workspace",
      entityId: id,
      eventType: "workspace.preferences_updated",
      payload: { fields: Object.keys(prefs), onboarded: !!opts.onboarded, acknowledgedPrivacy: !!opts.acknowledgePrivacy },
    });
  });
}

export async function acknowledgePrivacy(db: Db, id: string) {
  await db.update(workspaces).set({ privacyAcknowledgedAt: new Date() }).where(eq(workspaces.id, id));
}

export async function restartOnboarding(db: Db, id: string) {
  await db.update(workspaces).set({ onboardedAt: null }).where(eq(workspaces.id, id));
}

export async function dismissExpiredNotice(db: Db, id: string) {
  await db.update(workspaces).set({ replacedExpired: null }).where(eq(workspaces.id, id));
}

/** Deletes the workspace and, by cascade, every investigation, screenshot, analysis, invoice and log entry in it. */
export async function deleteWorkspace(db: Db, id: string) {
  await db.delete(workspaces).where(eq(workspaces.id, id));
}
