"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, checkPassword, createSessionValue } from "@/lib/session";

export async function login(_prev: { error?: string } | null, form: FormData): Promise<{ error?: string }> {
  const password = process.env.APP_PASSWORD;
  if (!password) redirect("/");
  const given = String(form.get("password") ?? "");
  if (!(await checkPassword(password, given))) {
    await new Promise((r) => setTimeout(r, 800)); // slow down guessing
    return { error: "That password isn't right." };
  }
  const session = await createSessionValue(password);
  (await cookies()).set(SESSION_COOKIE, session.value, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: session.expires });
  redirect("/");
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
