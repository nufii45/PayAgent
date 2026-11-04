import { describe, expect, it } from "vitest";
import { clipboardImages } from "./browser-media";

const png = new File(["x"], "image.png", { type: "image/png" });
const pdf = new File(["x"], "a.pdf", { type: "application/pdf" });
const item = (kind: string, file: File) => ({ kind, type: file.type, getAsFile: () => file });
const paste = (items: unknown[], files: File[]) => ({ items, files }) as unknown as DataTransfer;

describe("clipboardImages", () => {
  it("names images from items and doesn't count the same image in files twice", () => {
    const out = clipboardImages(paste([item("file", png)], [png]), 3);
    expect(out.map((f) => f.name)).toEqual(["Pasted screenshot 3.png"]);
    expect(out[0].type).toBe("image/png");
  });

  it("falls back to files when items has no image", () => {
    expect(clipboardImages(paste([], [png]), 1).map((f) => f.name)).toEqual(["Pasted screenshot 1.png"]);
  });

  it("ignores text and other files", () => {
    const text = { kind: "string", type: "text/plain", getAsFile: () => null };
    expect(clipboardImages(paste([text, item("file", pdf)], [pdf]), 1)).toEqual([]);
  });

  it("keeps unsupported image types so the picker can explain the problem", () => {
    const gif = new File(["x"], "a.gif", { type: "image/gif" });
    expect(clipboardImages(paste([item("file", gif)], [gif]), 1)[0].type).toBe("image/gif");
  });
});
