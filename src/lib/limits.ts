// Spending guard for the public demo: anyone with the link can use it, and every analysis costs model credits.
// Per-workspace limits stop one visitor running away with it; clearing cookies gets a new workspace,
// so there is also a per-network limit and a global daily cap.
import { createHash } from "node:crypto";
import { and, count, eq, gte } from "drizzle-orm";
import type { Db } from "@/db";
import { modelCalls } from "@/db/schema";

export type Limits = { perWorkspaceHour: number; perNetworkHour: number; globalDay: number };

const int = (v: string | undefined, fallback: number) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= 0 ? n : fallback;
};

export function limitsFromEnv(env: Record<string, string | undefined> = process.env): Limits {
  return {
    perWorkspaceHour: int(env.GUEST_HOURLY_MODEL_LIMIT, 20),
    perNetworkHour: int(env.NETWORK_HOURLY_MODEL_LIMIT, 60),
    globalDay: int(env.MODEL_DAILY_LIMIT, 300),
  };
}

export const hashIp = (ip: string | null) => (ip ? createHash("sha256").update(`payagent:${ip}`).digest("hex").slice(0, 32) : null);

export type Kind = "investigation" | "invoice_agent" | "transcribe";

/** Checks the limits and, if allowed, records the call. Returns a plain-language reason when refused. */
export async function reserveModelCall(db: Db, workspaceId: string, ip: string | null, kind: Kind, limits = limitsFromEnv(), now = new Date()): Promise<{ ok: true } | { ok: false; error: string }> {
  const hourAgo = new Date(now.getTime() - 3_600_000);
  const dayAgo = new Date(now.getTime() - 86_400_000);
  const ipHash = hashIp(ip);
  const [[ws], [net], [all]] = await Promise.all([
    db.select({ n: count() }).from(modelCalls).where(and(eq(modelCalls.workspaceId, workspaceId), gte(modelCalls.createdAt, hourAgo))),
    ipHash ? db.select({ n: count() }).from(modelCalls).where(and(eq(modelCalls.ipHash, ipHash), gte(modelCalls.createdAt, hourAgo))) : Promise.resolve([{ n: 0 }]),
    db.select({ n: count() }).from(modelCalls).where(gte(modelCalls.createdAt, dayAgo)),
  ]);
  if (all.n >= limits.globalDay) return { ok: false, error: "This demo has reached its AI usage limit for today. Your saved work is still here; please try again tomorrow." };
  if (ws.n >= limits.perWorkspaceHour || net.n >= limits.perNetworkHour)
    return { ok: false, error: "You've run a lot of analyses in the last hour. Please wait a while and try again." };
  await db.insert(modelCalls).values({ workspaceId, ipHash, kind, createdAt: now });
  return { ok: true };
}
