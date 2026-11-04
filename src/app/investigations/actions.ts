"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { createModelClient, providerConfigFromEnv } from "@/lib/ai/provider";
import { extractConversation, modelFailureMessage } from "@/lib/investigation/extract";
import type { Corrections } from "@/lib/investigation/reconcile";
import type { InvoiceDraft } from "@/lib/invoice-schema";
import { clientIp, currentWorkspace } from "@/lib/current-workspace";
import { reserveModelCall } from "@/lib/limits";
import { hasCurrentPrivacyAck } from "@/lib/privacy";
import { markOnboarded } from "@/lib/workspaces";
import {
  NotFound,
  addEvidence,
  analyse,
  createInvestigation,
  deleteInvestigation,
  draftFromAnalysis,
  getInvestigation,
  removeEvidence,
  reorderEvidence,
  saveCorrection,
  saveInvoiceDraftRequest,
  type Extractor,
  type NewEvidence,
  type Trigger,
} from "@/lib/investigations";

const MAX_IMAGES = 8;
const MAX_IMAGE_CHARS = 1_400_000; // ~1 MB image as a data URL, after browser downscaling
const MAX_TEXT = 20_000;

/** The model reader, behind the usage limits. A refused call fails like a model error, so the previous analysis stays. */
async function extractor(ws: string): Promise<Extractor> {
  const m = createModelClient(providerConfigFromEnv(process.env));
  const ip = await clientIp();
  return async (evidence, instruction) => {
    const budget = await reserveModelCall(db, ws, ip, "investigation");
    if (!budget.ok) return { ok: false as const, error: budget.error, model: m.visionModel, latencyMs: 0 };
    return extractConversation(m.client, m.visionModel, { evidence, instruction }).catch((err) => {
      // Log the failure only, never the conversation content.
      console.error("Investigation model call failed", err instanceof Error ? err.message : err);
      return { ok: false as const, error: modelFailureMessage(err), model: m.visionModel, latencyMs: 0 };
    });
  };
}

const PRIVACY_REQUIRED = "Please read and accept the privacy note before sending a conversation. Open New investigation to see it.";

const notFound = (err: unknown) => {
  if (err instanceof NotFound) return { error: err.message };
  throw err;
};

function checkEvidence(input: { images: string[]; texts: string[] }): { evidence: NewEvidence[] } | { error: string } {
  const images = input.images.filter(Boolean);
  const texts = input.texts.map((t) => t.trim()).filter(Boolean);
  if (images.length > MAX_IMAGES) return { error: `Add up to ${MAX_IMAGES} screenshots at a time.` };
  if (images.some((d) => !/^data:image\/(png|jpeg|webp);base64,/.test(d) || d.length > MAX_IMAGE_CHARS)) return { error: "Use PNG, JPG or WebP screenshots." };
  if (texts.some((t) => t.length > MAX_TEXT)) return { error: "Pasted text is too long. Split it into parts." };
  return { evidence: [...images.map((dataUrl) => ({ kind: "image" as const, dataUrl })), ...texts.map((text) => ({ kind: "text" as const, text }))] };
}

export async function startInvestigation(input: { title: string; instruction: string; images: string[]; texts: string[] }): Promise<{ error: string; id?: string }> {
  const ws = await currentWorkspace();
  if (!hasCurrentPrivacyAck(ws)) return { error: PRIVACY_REQUIRED };
  if (!ws.onboardedAt) await markOnboarded(db, ws.id);
  const checked = checkEvidence(input);
  if ("error" in checked) return { error: checked.error };
  if (!checked.evidence.length) return { error: "Add at least one screenshot or paste the conversation." };
  const id = await createInvestigation(db, ws.id, {
    title: input.title.trim().slice(0, 120) || "Untitled investigation",
    instruction: input.instruction.trim().slice(0, 1000) || null,
    evidence: checked.evidence,
  });
  const r = await analyse(db, ws.id, id, "initial", await extractor(ws.id));
  if (!r.ok) return { error: r.error, id };
  redirect(`/investigations/${id}`);
}

export async function addEvidenceAndReanalyse(id: string, input: { images: string[]; texts: string[] }): Promise<{ error?: string; skipped?: number }> {
  const checked = checkEvidence(input);
  if ("error" in checked) return { error: checked.error };
  const ws = await currentWorkspace();
  if (!hasCurrentPrivacyAck(ws)) return { error: PRIVACY_REQUIRED };
  let result: Awaited<ReturnType<typeof addEvidence>>;
  try {
    result = await addEvidence(db, ws.id, id, checked.evidence);
  } catch (err) {
    return notFound(err);
  }
  const { added, skipped, tooMany } = result;
  if (!added.length)
    return { error: tooMany ? "This investigation already has the maximum of 20 pieces of evidence. Remove some first." : skipped ? "That evidence is already in this investigation." : "Add a screenshot or paste text first." };
  const r = await analyse(db, ws.id, id, "new_evidence", await extractor(ws.id));
  revalidatePath(`/investigations/${id}`);
  return r.ok ? { skipped } : { error: `${r.error} The previous analysis is still shown.` };
}

export async function rerunAnalysis(id: string): Promise<{ error?: string }> {
  const ws = await currentWorkspace();
  const r = await analyse(db, ws.id, id, "initial", await extractor(ws.id));
  revalidatePath(`/investigations/${id}`);
  return r.ok ? {} : { error: r.error };
}

async function reconcileAgain(ws: string, id: string, trigger: Trigger) {
  const data = await getInvestigation(db, ws, id);
  const hasReading = data?.versions.some((v) => v.extraction);
  const r = await analyse(db, ws, id, trigger, hasReading ? null : await extractor(ws));
  revalidatePath(`/investigations/${id}`);
  return r.ok ? {} : { error: r.error };
}

export async function correct(id: string, patch: Corrections): Promise<{ error?: string }> {
  const ws = await currentWorkspace();
  try {
    await saveCorrection(db, ws.id, id, patch);
  } catch (err) {
    return notFound(err);
  }
  return reconcileAgain(ws.id, id, "correction");
}

export async function removeEvidenceItem(id: string, evidenceId: string): Promise<{ error?: string }> {
  const ws = await currentWorkspace();
  try {
    await removeEvidence(db, ws.id, id, evidenceId);
  } catch (err) {
    return notFound(err);
  }
  return reconcileAgain(ws.id, id, "removed_evidence");
}

export async function reorder(id: string, orderedIds: string[]): Promise<{ error?: string }> {
  const ws = await currentWorkspace();
  try {
    await reorderEvidence(db, ws.id, id, orderedIds);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't reorder." };
  }
  return reconcileAgain(ws.id, id, "reorder");
}

export async function draftInvoice(id: string): Promise<{ error: string } | { requestId: string; draft: InvoiceDraft; warnings: string[] }> {
  const ws = await currentWorkspace();
  const data = await getInvestigation(db, ws.id, id);
  const latest = data?.versions.at(-1);
  if (!latest?.analysis) return { error: "Run the analysis first." };
  const { draft, warnings, includedKeys } = draftFromAnalysis(latest.analysis, undefined, { preferred: ws.preferences.currency });
  if (!draft.items.length) return { error: "Nothing has a supported agreed price yet. Resolve the items marked for review, or send a clarification message." };
  const requestId = await saveInvoiceDraftRequest(db, ws.id, id, latest.version, draft, includedKeys);
  return { requestId, draft, warnings };
}

export async function removeInvestigation(id: string) {
  const ws = await currentWorkspace();
  await deleteInvestigation(db, ws.id, id);
  redirect("/investigations");
}
