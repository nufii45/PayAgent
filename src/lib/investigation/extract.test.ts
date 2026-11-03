import { describe, expect, it, vi } from "vitest";
import { extractConversation } from "./extract";

const reply = (content: string) => ({ choices: [{ message: { content } }] });

describe("extractConversation", () => {
  it("sends each piece of evidence labelled, and parses the JSON", async () => {
    const create = vi.fn().mockResolvedValue(
      reply('```json\n{"clientName":"Ana","messages":[{"id":"m1","evidence":"E1","speaker":"you","text":"Website is 15k"}],"events":[{"id":"e1","type":"offer","item":"website","amountText":"15k","messageIds":["m1"]}]}\n```'),
    );
    const r = await extractConversation({ chat: { completions: { create } } } as never, "muse-spark-1.3", {
      evidence: [
        { id: "E1", label: "Screenshot 1", kind: "image", dataUrl: "data:image/png;base64,AA" },
        { id: "E2", label: "Pasted text", kind: "text", text: "Me: hi" },
      ],
    });
    expect(r.ok && r.extraction.events[0].type).toBe("offer");
    const content = create.mock.calls[0][0].messages[1].content;
    expect(content.map((p: { type: string }) => p.type)).toEqual(["text", "text", "image_url", "text"]);
    expect(content[3].text).toContain("E2 (Pasted text, pasted text)");
  });

  it("retries once with the validation error, then gives up", async () => {
    const create = vi.fn().mockResolvedValue(reply('{"events":[{"id":"e1","type":"bribe","messageIds":["m1"]}]}'));
    const r = await extractConversation({ chat: { completions: { create } } } as never, "m", { evidence: [] });
    expect(create).toHaveBeenCalledTimes(2);
    expect(r.ok).toBe(false);
  });
});
