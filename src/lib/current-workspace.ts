import "server-only";
import { cookies, headers } from "next/headers";
import { cache } from "react";
import { db } from "@/db/client";
import { GUEST_COOKIE, NEW_WORKSPACE_HEADER, isWorkspaceId, retentionDays } from "./session";
import { ensureWorkspace } from "./workspaces";

/** The visitor's guest workspace. Every page and server action reads records only through this id. */
export const currentWorkspace = cache(async () => {
  const id = (await cookies()).get(GUEST_COOKIE)?.value;
  if (!isWorkspaceId(id)) throw new Error("No guest session. Reload the page.");
  const isNew = (await headers()).get(NEW_WORKSPACE_HEADER) === "1";
  return ensureWorkspace(db, id, { isNew, retentionDays: retentionDays() });
});

/** Client IP for rate limiting (first hop as reported by the platform). */
export async function clientIp() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
}
