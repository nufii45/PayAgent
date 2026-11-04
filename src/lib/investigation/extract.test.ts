import OpenAI from "openai";
import { describe, expect, it, vi } from "vitest";
import { extractConversation, modelFailureMessage } from "./extract";

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

  it("gives the call more than the client's 30 s default, but stays under the page's 120 s limit", async () => {
    const create = vi.fn().mockResolvedValue(reply('{"messages":[],"events":[]}'));
    await extractConversation({ chat: { completions: { create } } } as never, "m", { evidence: [] });
    const options = create.mock.calls[0][1];
    expect(options.timeout).toBeGreaterThan(60_000);
    expect(options.timeout).toBeLessThan(120_000);
    expect(options.signal).toBeInstanceOf(AbortSignal);
  });
});

describe("modelFailureMessage", () => {
  it("only reports a timeout for a timeout", () => {
    expect(modelFailureMessage(new OpenAI.APIConnectionTimeoutError())).toContain("in time");
    expect(modelFailureMessage(new OpenAI.APIUserAbortError())).toContain("in time");
    expect(modelFailureMessage(new OpenAI.AuthenticationError(401, undefined, "bad key", new Headers()))).not.toContain("in time");
    expect(modelFailureMessage(new Error("boom"))).not.toContain("in time");
  });
});
