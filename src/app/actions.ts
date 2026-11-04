"use server";

import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { runInvoiceAgent, SCREENSHOT_ONLY_PROMPT, type AgentStep } from "@/lib/ai/agent";
import { createModelClient, providerConfigFromEnv } from "@/lib/ai/provider";
import { transcribe, transcribeConfigFromEnv } from "@/lib/ai/transcribe";
import { inspectWav } from "@/lib/wav";
import { validateEditedDraft, type FieldErrors } from "@/lib/edited-draft";
import { proposalToDraft, type DraftResult } from "@/lib/invoice-schema";
import { approveRequest, findClients, listOpenInvoicesForClient, rejectRequest, saveAgentRun } from "@/lib/invoices";
import { clientIp, currentWorkspace } from "@/lib/current-workspace";
import { reserveModelCall } from "@/lib/limits";
import { hasCurrentPrivacyAck } from "@/lib/privacy";

const PRIVACY_REQUIRED = "Please read and accept the privacy note on this page before sending anything to be read.";

export type ProposeResponse =
  | { requestId: string; result: DraftResult; steps: AgentStep[]; model: string; latencyMs: number }
  | { requestId: string | null; result: { status: "error"; error: string }; steps: AgentStep[] };

const MAX_TEXT = 4_000;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_VOICE_MS = 95_000;

/** F6b: a voice note (16 kHz mono WAV, made in the browser) → text the user can check before drafting. */
export async function transcribeVoiceNote(form: FormData): Promise<{ transcript: string } | { error: string }> {
  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size === 0) return { error: "Record or choose a voice note first." };
  if (audio.size > 3.5 * 1024 * 1024) return { error: "Keep voice notes under 90 seconds." };
  const bytes = new Uint8Array(await audio.arrayBuffer());
  const wav = inspectWav(bytes);
  if (!wav.ok) return { error: `That recording couldn't be used (${wav.error}).` };
  if (wav.info.durationMs > MAX_VOICE_MS) return { error: "Keep voice notes under 90 seconds." };
  const ws = await currentWorkspace();
  if (!hasCurrentPrivacyAck(ws)) return { error: PRIVACY_REQUIRED };
  const budget = await reserveModelCall(db, ws.id, await clientIp(), "transcribe");
  if (!budget.ok) return { error: budget.error };

  const r = await transcribe(transcribeConfigFromEnv(process.env), bytes);
  if (!r.ok) {
    console.error("Transcription failed", r.error);
    return { error: r.error === "No speech was found in the recording" ? "No speech was found. Try recording again, closer to the mic." : "The voice note couldn't be transcribed. Try again, or type the message instead." };
  }
  return { transcript: r.transcript };
}

export async function proposeInvoice(input: { turns: string[]; imageDataUrl?: string; source?: "voice" }): Promise<ProposeResponse> {
  const turns = input.turns.map((t) => t.slice(0, MAX_TEXT)).filter((t) => t.trim());
  if (!turns.length && !input.imageDataUrl) {
    return { requestId: null, result: { status: "error", error: "Describe the job or add a screenshot first." }, steps: [] };
  }
  if (input.imageDataUrl && (!/^data:image\/(png|jpeg|webp);base64,/.test(input.imageDataUrl) || input.imageDataUrl.length > MAX_IMAGE_BYTES * 1.4)) {
    return { requestId: null, result: { status: "error", error: "Use a PNG, JPG or WebP screenshot under 3 MB." }, steps: [] };
  }

  const ws = await currentWorkspace();
  if (!hasCurrentPrivacyAck(ws)) return { requestId: null, result: { status: "error", error: PRIVACY_REQUIRED }, steps: [] };
  const budget = await reserveModelCall(db, ws.id, await clientIp(), "invoice_agent");
  if (!budget.ok) return { requestId: null, result: { status: "error", error: budget.error }, steps: [] };

  const now = new Date();
  const model = createModelClient(providerConfigFromEnv(process.env));
  const modelName = input.imageDataUrl ? model.visionModel : model.textModel;
  const agentTurns = turns.length ? turns : [SCREENSHOT_ONLY_PROMPT];
  const preferred = ws.preferences.currency ?? "PHP";

  let run: Awaited<ReturnType<typeof runInvoiceAgent>>;
  try {
    run = await runInvoiceAgent(model.client, modelName, { turns: agentTurns, imageDataUrl: input.imageDataUrl, preferredCurrency: preferred }, {
      now,
      findClient: (name) => findClients(db, ws.id, name),
      listOpenInvoices: (name) => listOpenInvoicesForClient(db, ws.id, name),
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
    ? proposalToDraft(run.proposal, now, { preferred, turns, hasImage: !!input.imageDataUrl })
    : { status: "error", error: run.error };

  const requestId = await saveAgentRun(db, ws.id, {
    inputType: input.imageDataUrl ? "image" : input.source === "voice" ? "voice" : "text",
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
  const ws = await currentWorkspace();
  const outcome = await approveRequest(db, ws.id, requestId, v.draft);
  if (!outcome.ok) return { error: outcome.error };
  redirect(`/invoices/${outcome.invoiceId}`);
}

export async function rejectDraft(requestId: string) {
  const ws = await currentWorkspace();
  await rejectRequest(db, ws.id, requestId);
}
