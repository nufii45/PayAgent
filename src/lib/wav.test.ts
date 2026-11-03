import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { encodeWav, inspectWav } from "./wav";

describe("WAV", () => {
  it("round-trips encoded audio through the header check", () => {
    const wav = encodeWav(new Float32Array(16_000), 16_000);
    expect(inspectWav(wav)).toEqual({ ok: true, info: { channels: 1, sampleRate: 16_000, bitsPerSample: 16, durationMs: 1000 } });
  });

  it("accepts the sample voice note", () => {
    const r = inspectWav(new Uint8Array(readFileSync("evals/audio/voice-note-en.wav")));
    expect(r.ok).toBe(true);
  });

  it("rejects sample rates the API doesn't take", () => {
    expect(inspectWav(encodeWav(new Float32Array(100), 44_100))).toEqual({ ok: false, error: "WAV must be 16 or 24 kHz" });
  });

  it("rejects non-WAV bytes", () => {
    expect(inspectWav(new TextEncoder().encode("x".repeat(100))).ok).toBe(false);
  });
});
