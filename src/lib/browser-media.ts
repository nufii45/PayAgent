// Browser-only helpers that shrink uploads before they reach the server.
import { encodeWav } from "./wav";

export const MAX_VOICE_SECONDS = 90;
const TARGET_RATE = 16_000;
const MAX_IMAGE_SIDE = 1600;

/** Decode any audio the browser can play (webm, m4a, mp3, wav) into a 16 kHz mono 16-bit WAV. */
export async function toTranscribableWav(blob: Blob): Promise<{ wav: Uint8Array; seconds: number }> {
  const ctx = new AudioContext();
  try {
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    if (decoded.duration > MAX_VOICE_SECONDS + 1) {
      throw new Error(`Keep voice notes under ${MAX_VOICE_SECONDS} seconds`);
    }
    const length = Math.ceil(decoded.duration * TARGET_RATE);
    const offline = new OfflineAudioContext(1, length, TARGET_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded; // multi-channel input is mixed down to mono by the 1-channel context
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return { wav: encodeWav(rendered.getChannelData(0), TARGET_RATE), seconds: decoded.duration };
  } finally {
    void ctx.close();
  }
}

/** The image files in a paste, renamed from the browser's "image.png" and numbered from `first`. */
export function clipboardImages(data: Pick<DataTransfer, "items" | "files">, first: number): File[] {
  const isImage = (type: string) => type.startsWith("image/");
  const fromItems = [...data.items].flatMap((i) => (i.kind === "file" && isImage(i.type) ? (i.getAsFile() ?? []) : []));
  // Browsers can list one image in both, so only fall back to files when items has none.
  const images = fromItems.length ? fromItems : [...data.files].filter((f) => isImage(f.type));
  return images.map((f, i) => new File([f], `Pasted screenshot ${first + i}.${f.type.split("/")[1]}`, { type: f.type }));
}

/** Downscale a screenshot so its longest side is at most 1600px and return it as a data URL. */
export async function shrinkImage(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.9);
}
