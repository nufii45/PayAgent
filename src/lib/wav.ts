// WAV helpers. Muse Voice Transcribe only accepts RIFF/WAVE, mono, 16-bit PCM, 16 or 24 kHz.

export type WavInfo = { channels: number; sampleRate: number; bitsPerSample: number; durationMs: number };

/** Read and check a WAV header. Returns an error message for anything the API would reject. */
export function inspectWav(bytes: Uint8Array): { ok: true; info: WavInfo } | { ok: false; error: string } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const tag = (at: number) => String.fromCharCode(...bytes.subarray(at, at + 4));
  if (bytes.length < 44 || tag(0) !== "RIFF" || tag(8) !== "WAVE") return { ok: false, error: "Not a WAV file" };

  let offset = 12;
  let fmt: Omit<WavInfo, "durationMs"> | null = null;
  while (offset + 8 <= bytes.length) {
    const id = tag(offset);
    const size = view.getUint32(offset + 4, true);
    if (id === "fmt ") {
      if (view.getUint16(offset + 8, true) !== 1) return { ok: false, error: "WAV must be uncompressed PCM" };
      fmt = {
        channels: view.getUint16(offset + 10, true),
        sampleRate: view.getUint32(offset + 12, true),
        bitsPerSample: view.getUint16(offset + 22, true),
      };
    } else if (id === "data") {
      if (!fmt) return { ok: false, error: "WAV has no format block" };
      if (fmt.channels !== 1) return { ok: false, error: "WAV must be mono" };
      if (fmt.bitsPerSample !== 16) return { ok: false, error: "WAV must be 16-bit" };
      if (fmt.sampleRate !== 16_000 && fmt.sampleRate !== 24_000) return { ok: false, error: "WAV must be 16 or 24 kHz" };
      const dataBytes = Math.min(size, bytes.length - offset - 8);
      return { ok: true, info: { ...fmt, durationMs: Math.round((dataBytes / 2 / fmt.sampleRate) * 1000) } };
    }
    offset += 8 + size + (size % 2);
  }
  return { ok: false, error: "WAV has no audio data" };
}

/** Encode mono float samples (-1..1) as a 16-bit PCM WAV. */
export function encodeWav(samples: Float32Array, sampleRate: number): Uint8Array {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const write = (at: number, s: string) => [...s].forEach((c, i) => view.setUint8(at + i, c.charCodeAt(0)));
  write(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  write(8, "WAVE");
  write(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Uint8Array(buffer);
}
