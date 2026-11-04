"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { currentWorkspace } from "@/lib/current-workspace";
import { GUEST_COOKIE } from "@/lib/session";
import { acknowledgePrivacy, deleteWorkspace, dismissExpiredNotice, savePreferences, type BusinessRole, type Preferences } from "@/lib/workspaces";

const ROLES: BusinessRole[] = ["freelancer", "small_business", "agency", "other"];

function readPreferences(form: FormData): Preferences {
  const role = String(form.get("role") ?? "");
  const currency = String(form.get("currency") ?? "");
  const displayName = String(form.get("displayName") ?? "").trim().slice(0, 80);
  return {
    // Saved by merging, so "Not set" has to be stored or the old role would come back.
    ...(ROLES.includes(role as BusinessRole) ? { role: role as BusinessRole } : role === "" && form.has("role") ? { role: null } : {}),
    ...(currency === "PHP" || currency === "USD" ? { currency } : {}),
    ...(form.has("displayName") ? { displayName } : {}),
  };
}

/** The user ticked the privacy note and pressed Continue. Recorded before any evidence can be sent. */
export async function acknowledgePrivacyNow(opts: { onboarded?: boolean } = {}) {
  const ws = await currentWorkspace();
  await acknowledgePrivacy(db, ws.id, { onboarded: !!opts.onboarded });
}

/** Hides the "Make invoices yours" prompt on the dashboard. The same fields stay in Settings & Privacy. */
export async function dismissProfilePrompt() {
  const ws = await currentWorkspace();
  await savePreferences(db, ws.id, { profilePromptDismissed: true });
  revalidatePath("/");
}

/** "Explore dashboard": straight to the dashboard. The privacy note is asked before the first upload. */
export async function skipOnboarding() {
  const ws = await currentWorkspace();
  await savePreferences(db, ws.id, {}, { onboarded: true });
  redirect("/");
}

export async function updatePreferences(form: FormData) {
  const ws = await currentWorkspace();
  await savePreferences(db, ws.id, readPreferences(form));
  revalidatePath("/", "layout");
}

export async function dismissExpired() {
  const ws = await currentWorkspace();
  await dismissExpiredNotice(db, ws.id);
  revalidatePath("/");
}

/** Deletes everything in this guest workspace and starts the visitor on a new, empty one. */
export async function deleteMyWorkspace(form: FormData) {
  if (form.get("confirm") !== "DELETE") throw new Error("Workspace deletion wasn't confirmed");
  const ws = await currentWorkspace();
  await deleteWorkspace(db, ws.id);
  (await cookies()).delete(GUEST_COOKIE);
  redirect("/welcome?deleted=1");
}
