import { describe, expect, it, vi } from "vitest";
import { transcribe } from "./transcribe";

const config = { apiKey: "k", baseURL: "https://api.example/v1/", model: "muse-voice-transcribe-1.0" };
const wav = new Uint8Array([1, 2, 3]);

describe("transcribe", () => {
  it("sends a multipart request with the JSON settings and the WAV", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () =>
      Response.json({ sessionId: "s", transcript: " Invoice Client A ", audioDurationMs: 1200, turns: [] }),
    );
    const r = await transcribe(config, wav, fetchImpl);
    expect(r).toEqual({ ok: true, transcript: "Invoice Client A", durationMs: 1200 });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://api.example/v1/asr/transcribe");
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer k");
    const form = init!.body as FormData;
    expect(JSON.parse(await (form.get("request") as Blob).text())).toEqual({
      mode: "PUSH_TO_TALK",
      model: "muse-voice-transcribe-1.0",
      audioEncoding: "WAV",
    });
    expect((form.get("audio") as Blob).type).toBe("audio/wav");
  });

  it("reports API errors with the status", async () => {
    const fetchImpl = async () => new Response("bad audio", { status: 400 });
    expect(await transcribe(config, wav, fetchImpl as typeof fetch)).toEqual({ ok: false, error: "Transcription failed (400): bad audio" });
  });

  it("treats an empty transcript as no speech", async () => {
    const fetchImpl = async () => Response.json({ transcript: "" });
    expect(await transcribe(config, wav, fetchImpl as typeof fetch)).toEqual({ ok: false, error: "No speech was found in the recording" });
  });
});

describe("transcribe network errors", () => {
  it("includes the underlying cause", async () => {
    const fetchImpl = async () => {
      throw new TypeError("fetch failed", { cause: new Error("other side closed") });
    };
    expect(await transcribe(config, wav, fetchImpl as typeof fetch)).toEqual({
      ok: false,
      error: "Couldn't reach the transcription service (other side closed)",
    });
  });
});
