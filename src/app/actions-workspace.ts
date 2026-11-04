"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { currentWorkspace } from "@/lib/current-workspace";
import { GUEST_COOKIE } from "@/lib/session";
import { deleteWorkspace, dismissExpiredNotice, restartOnboarding, savePreferences, type BusinessRole, type Preferences } from "@/lib/workspaces";

const ROLES: BusinessRole[] = ["freelancer", "small_business", "agency", "other"];

function readPreferences(form: FormData): Preferences {
  const role = String(form.get("role") ?? "");
  const currency = String(form.get("currency") ?? "");
  const displayName = String(form.get("displayName") ?? "").trim().slice(0, 80);
  return {
    ...(ROLES.includes(role as BusinessRole) ? { role: role as BusinessRole } : {}),
    ...(currency === "PHP" || currency === "USD" ? { currency } : {}),
    ...(form.has("displayName") ? { displayName } : {}),
  };
}

/** Last onboarding step. Preferences may be empty (skipped); the privacy note must be acknowledged. */
export async function finishOnboarding(form: FormData) {
  const ws = await currentWorkspace();
  await savePreferences(db, ws.id, readPreferences(form), { onboarded: true, acknowledgePrivacy: form.get("acknowledge") === "on" });
  redirect("/");
}

/** "Explore workspace": straight to the dashboard. The privacy note is asked again before the first upload. */
export async function skipOnboarding() {
  const ws = await currentWorkspace();
  await savePreferences(db, ws.id, {}, { onboarded: true });
  redirect("/");
}

export async function updatePreferences(_prev: { saved?: boolean } | null, form: FormData): Promise<{ saved: boolean }> {
  const ws = await currentWorkspace();
  await savePreferences(db, ws.id, readPreferences(form));
  revalidatePath("/", "layout");
  return { saved: true };
}

export async function restartWelcome() {
  const ws = await currentWorkspace();
  await restartOnboarding(db, ws.id);
  redirect("/welcome");
}

export async function dismissExpired() {
  const ws = await currentWorkspace();
  await dismissExpiredNotice(db, ws.id);
  revalidatePath("/");
}

/** Deletes everything in this guest workspace and starts the visitor on a new, empty one. */
export async function deleteMyWorkspace(form: FormData) {
  if (form.get("confirm") !== "on") redirect("/settings?error=confirm");
  const ws = await currentWorkspace();
  await deleteWorkspace(db, ws.id);
  (await cookies()).delete(GUEST_COOKIE);
  redirect("/welcome?deleted=1");
}
