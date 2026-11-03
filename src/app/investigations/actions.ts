"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db/client";
import { createModelClient, providerConfigFromEnv } from "@/lib/ai/provider";
import { extractConversation } from "@/lib/investigation/extract";
import type { Corrections } from "@/lib/investigation/reconcile";
import type { InvoiceDraft } from "@/lib/invoice-schema";
import {
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

function extractor(): Extractor {
  const m = createModelClient(providerConfigFromEnv(process.env));
  return (evidence, instruction) =>
    extractConversation(m.client, m.visionModel, { evidence, instruction }).catch((err) => {
      console.error("Investigation model call failed", err instanceof Error ? err.message : err);
      return { ok: false as const, error: "The AI model didn't respond in time. Your evidence is saved; try the analysis again.", model: m.visionModel, latencyMs: 0 };
    });
}

function checkEvidence(input: { images: string[]; texts: string[] }): { evidence: NewEvidence[] } | { error: string } {
  const images = input.images.filter(Boolean);
  const texts = input.texts.map((t) => t.trim()).filter(Boolean);
  if (images.length > MAX_IMAGES) return { error: `Add up to ${MAX_IMAGES} screenshots at a time.` };
  if (images.some((d) => !/^data:image\/(png|jpeg|webp);base64,/.test(d) || d.length > MAX_IMAGE_CHARS)) return { error: "Use PNG, JPG or WebP screenshots." };
  if (texts.some((t) => t.length > MAX_TEXT)) return { error: "Pasted text is too long. Split it into parts." };
  return { evidence: [...images.map((dataUrl) => ({ kind: "image" as const, dataUrl })), ...texts.map((text) => ({ kind: "text" as const, text }))] };
}

export async function startInvestigation(input: { title: string; instruction: string; images: string[]; texts: string[] }): Promise<{ error: string; id?: string }> {
  const checked = checkEvidence(input);
  if ("error" in checked) return { error: checked.error };
  if (!checked.evidence.length) return { error: "Add at least one screenshot or paste the conversation." };
  const id = await createInvestigation(db, {
    title: input.title.trim().slice(0, 120) || "Untitled investigation",
    instruction: input.instruction.trim().slice(0, 1000) || null,
    evidence: checked.evidence,
  });
  const r = await analyse(db, id, "initial", extractor());
  if (!r.ok) return { error: r.error, id };
  redirect(`/investigations/${id}`);
}

export async function addEvidenceAndReanalyse(id: string, input: { images: string[]; texts: string[] }): Promise<{ error?: string; skipped?: number }> {
  const checked = checkEvidence(input);
  if ("error" in checked) return { error: checked.error };
  const { added, skipped } = await addEvidence(db, id, checked.evidence);
  if (!added.length) return { error: skipped ? "That evidence is already in this investigation." : "Add a screenshot or paste text first." };
  const r = await analyse(db, id, "new_evidence", extractor());
  revalidatePath(`/investigations/${id}`);
  return r.ok ? { skipped } : { error: `${r.error} The previous analysis is still shown.` };
}

export async function rerunAnalysis(id: string): Promise<{ error?: string }> {
  const r = await analyse(db, id, "initial", extractor());
  revalidatePath(`/investigations/${id}`);
  return r.ok ? {} : { error: r.error };
}

async function reconcileAgain(id: string, trigger: Trigger) {
  const data = await getInvestigation(db, id);
  const hasReading = data?.versions.some((v) => v.extraction);
  const r = await analyse(db, id, trigger, hasReading ? null : extractor());
  revalidatePath(`/investigations/${id}`);
  return r.ok ? {} : { error: r.error };
}

export async function correct(id: string, patch: Corrections): Promise<{ error?: string }> {
  await saveCorrection(db, id, patch);
  return reconcileAgain(id, "correction");
}

export async function removeEvidenceItem(id: string, evidenceId: string): Promise<{ error?: string }> {
  await removeEvidence(db, id, evidenceId);
  return reconcileAgain(id, "removed_evidence");
}

export async function reorder(id: string, orderedIds: string[]): Promise<{ error?: string }> {
  try {
    await reorderEvidence(db, id, orderedIds);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Couldn't reorder." };
  }
  return reconcileAgain(id, "reorder");
}

export async function draftInvoice(id: string): Promise<{ error: string } | { requestId: string; draft: InvoiceDraft; warnings: string[] }> {
  const data = await getInvestigation(db, id);
  const latest = data?.versions.at(-1);
  if (!latest?.analysis) return { error: "Run the analysis first." };
  const { draft, warnings, includedKeys } = draftFromAnalysis(latest.analysis);
  if (!draft.items.length) return { error: "Nothing has a supported agreed price yet. Resolve the items marked for review, or send a clarification message." };
  const requestId = await saveInvoiceDraftRequest(db, id, latest.version, draft, includedKeys);
  return { requestId, draft, warnings };
}

export async function removeInvestigation(id: string) {
  await deleteInvestigation(db, id);
  redirect("/investigations");
}
