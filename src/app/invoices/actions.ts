"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { currentWorkspace } from "@/lib/current-workspace";
import { setInvoiceStatus } from "@/lib/invoices";

export async function markInvoice(form: FormData) {
  const id = String(form.get("id") ?? "");
  const status = form.get("status") === "paid" ? "paid" : form.get("status") === "void" ? "void" : null;
  if (!status || !/^[0-9a-f-]{36}$/i.test(id)) return;
  const ws = await currentWorkspace();
  await setInvoiceStatus(db, ws.id, id, status);
  revalidatePath(`/invoices/${id}`);
}
