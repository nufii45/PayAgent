"use server";

import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { runInvoiceAgent, type AgentStep } from "@/lib/ai/agent";
import { createModelClient, providerConfigFromEnv } from "@/lib/ai/provider";
import { validateEditedDraft, type FieldErrors } from "@/lib/edited-draft";
import { proposalToDraft, type DraftResult } from "@/lib/invoice-schema";
import { approveRequest, findClients, listOpenInvoicesForClient, rejectRequest, saveAgentRun } from "@/lib/invoices";

export type ProposeResponse =
  | { requestId: string; result: DraftResult; steps: AgentStep[]; model: string; latencyMs: number }
  | { requestId: string | null; result: { status: "error"; error: string }; steps: AgentStep[] };

const MAX_TEXT = 4_000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

export async function proposeInvoice(input: { turns: string[]; imageDataUrl?: string }): Promise<ProposeResponse> {
  const turns = input.turns.map((t) => t.slice(0, MAX_TEXT)).filter((t) => t.trim());
  if (!turns.length && !input.imageDataUrl) {
    return { requestId: null, result: { status: "error", error: "Describe the job or add a screenshot first." }, steps: [] };
  }
  if (input.imageDataUrl && (!/^data:image\/(png|jpeg|webp);base64,/.test(input.imageDataUrl) || input.imageDataUrl.length > MAX_IMAGE_BYTES * 1.4)) {
    return { requestId: null, result: { status: "error", error: "Use a PNG, JPG or WebP screenshot under 4 MB." }, steps: [] };
  }

  const now = new Date();
  const model = createModelClient(providerConfigFromEnv(process.env));
  const modelName = input.imageDataUrl ? model.visionModel : model.textModel;
  const agentTurns = turns.length ? turns : ["Create an invoice from this chat screenshot."];

  let run: Awaited<ReturnType<typeof runInvoiceAgent>>;
  try {
    run = await runInvoiceAgent(model.client, modelName, { turns: agentTurns, imageDataUrl: input.imageDataUrl }, {
      now,
      findClient: (name) => findClients(db, name),
      listOpenInvoices: (name) => listOpenInvoicesForClient(db, name),
    });
  } catch (err) {
    console.error("Model call failed", err);
    return {
      requestId: null,
      result: { status: "error", error: "The AI model didn't respond. Check your connection and try again." },
      steps: [],
    };
  }

  const result: DraftResult | { status: "error"; error: string } = run.ok
    ? proposalToDraft(run.proposal, now)
    : { status: "error", error: run.error };

  const requestId = await saveAgentRun(db, {
    inputType: input.imageDataUrl ? "image" : "text",
    turns: agentTurns,
    model: run.model,
    latencyMs: run.latencyMs,
    steps: run.steps,
    proposal: run.ok ? run.proposal : null,
    result,
  });

  if (result.status === "error") return { requestId, result, steps: run.steps };
  return { requestId, result, steps: run.steps, model: run.model, latencyMs: run.latencyMs };
}

export async function approveDraft(requestId: string, edited: unknown): Promise<{ errors?: FieldErrors; error?: string }> {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(new Date());
  const v = validateEditedDraft(edited, today);
  if (!v.ok) return { errors: v.errors };
  const outcome = await approveRequest(db, requestId, v.draft);
  if (!outcome.ok) return { error: outcome.error };
  redirect(`/invoices/${outcome.invoiceId}`);
}

export async function rejectDraft(requestId: string) {
  await rejectRequest(db, requestId);
}
