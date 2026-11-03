// Muse Voice Transcribe: POST {base}/asr/transcribe, multipart with a JSON "request" part and a WAV "audio" part.
// https://dev.meta.ai/docs/speech-to-text

export type TranscribeConfig = { apiKey: string; baseURL: string; model: string };
export type TranscribeResult = { ok: true; transcript: string; durationMs: number } | { ok: false; error: string };

export function transcribeConfigFromEnv(e: Record<string, string | undefined>): TranscribeConfig {
  if (!e.META_API_KEY) throw new Error("META_API_KEY is empty");
  return {
    apiKey: e.META_API_KEY,
    baseURL: e.META_API_BASE_URL || "https://api.meta.ai/v1",
    model: e.META_TRANSCRIBE_MODEL || "muse-voice-transcribe-1.0",
  };
}

export async function transcribe(
  config: TranscribeConfig,
  wav: Uint8Array,
  fetchImpl: typeof fetch = fetch,
): Promise<TranscribeResult> {
  const form = new FormData();
  form.append(
    "request",
    new Blob([JSON.stringify({ mode: "PUSH_TO_TALK", model: config.model, audioEncoding: "WAV" })], { type: "application/json" }),
  );
  form.append("audio", new Blob([wav as BlobPart], { type: "audio/wav" }), "voice-note.wav");

  let res: Response;
  try {
    res = await fetchImpl(`${config.baseURL.replace(/\/$/, "")}/asr/transcribe`, {
      method: "POST",
      headers: { Authorization: `Bearer ${config.apiKey}`, Accept: "application/json" },
      body: form,
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    if (err instanceof Error && err.name === "TimeoutError") return { ok: false, error: "Transcription timed out" };
    const cause = err instanceof Error && err.cause instanceof Error ? err.cause.message : err instanceof Error ? err.message : String(err);
    return { ok: false, error: `Couldn't reach the transcription service (${cause})` };
  }
  if (!res.ok) {
    const detail = (await res.text().catch(() => "")).slice(0, 200);
    return { ok: false, error: `Transcription failed (${res.status})${detail ? `: ${detail}` : ""}` };
  }
  const body = (await res.json()) as { transcript?: unknown; audioDurationMs?: unknown };
  const transcript = typeof body.transcript === "string" ? body.transcript.trim() : "";
  if (!transcript) return { ok: false, error: "No speech was found in the recording" };
  return { ok: true, transcript, durationMs: typeof body.audioDurationMs === "number" ? body.audioDurationMs : 0 };
}
