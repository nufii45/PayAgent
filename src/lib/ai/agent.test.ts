import { describe, expect, it, vi } from "vitest";
import { extractJson, runInvoiceAgent } from "./agent";
import type { ToolDeps } from "./tools";

const NOW = new Date("2026-11-02T02:00:00Z");
const deps: ToolDeps = {
  now: NOW,
  findClient: async (name) => (/client a/i.test(name) ? [{ id: "c1", name: "Client A", email: null }] : []),
  listOpenInvoices: async () => [],
};

const final = {
  clientName: "Client A",
  currency: "PHP",
  items: [{ description: "Consulting", amountText: "2.5k" }],
  dueDateToken: "next_friday",
  notes: null,
  missingFields: [],
  question: null,
};

type Reply = { content?: string | null; tool_calls?: { id: string; name: string; args: object }[] };

function fakeClient(replies: Reply[]) {
  const create = vi.fn();
  for (const r of replies) {
    create.mockResolvedValueOnce({
      choices: [
        {
          message: {
            role: "assistant",
            content: r.content ?? null,
            tool_calls: r.tool_calls?.map((c) => ({
              id: c.id,
              type: "function",
              function: { name: c.name, arguments: JSON.stringify(c.args) },
            })),
          },
        },
      ],
    });
  }
  return { client: { chat: { completions: { create } } } as never, create };
}

describe("runInvoiceAgent", () => {
  it("runs tools, then returns the proposal", async () => {
    const { client, create } = fakeClient([
      {
        tool_calls: [
          { id: "1", name: "find_client", args: { name: "client a" } },
          { id: "2", name: "parse_amount", args: { text: "2.5k" } },
          { id: "3", name: "resolve_due_date", args: { token: "next_friday" } },
        ],
      },
      { content: JSON.stringify(final) },
    ]);
    const r = await runInvoiceAgent(client, "muse-spark-1.3", { turns: ["Gawan mo ng invoice si client a, 2.5k"] }, deps);
    expect(r.ok && r.proposal.clientName).toBe("Client A");
    expect(r.steps.map((s) => s.type === "tool_call" && s.name)).toEqual(["find_client", "parse_amount", "resolve_due_date"]);
    expect(r.steps[1]).toMatchObject({ result: { ok: true, pesos: "₱2,500.00" } });
    expect(r.steps[2]).toMatchObject({ result: { ok: true, date: "2026-11-06" } });
    // Tool results are sent back to the model.
    const secondCall = create.mock.calls[1][0];
    expect(secondCall.messages.filter((m: { role: string }) => m.role === "tool")).toHaveLength(3);
  });

  it("still works if the model answers without tools, wrapped in a code fence", async () => {
    const { client } = fakeClient([{ content: "Here you go:\n```json\n" + JSON.stringify(final) + "\n```" }]);
    const r = await runInvoiceAgent(client, "m", { turns: ["x"] }, deps);
    expect(r.ok).toBe(true);
  });

  it("retries once with the validation error, then succeeds", async () => {
    const { client, create } = fakeClient([{ content: '{"clientName": 5}' }, { content: JSON.stringify(final) }]);
    const r = await runInvoiceAgent(client, "m", { turns: ["x"] }, deps);
    expect(r.ok).toBe(true);
    expect(r.steps).toEqual([expect.objectContaining({ type: "retry" })]);
    expect(create.mock.calls[1][0].messages.at(-1).content).toMatch(/could not be used/);
  });

  it("fails cleanly after a second bad reply", async () => {
    const { client } = fakeClient([{ content: "sorry" }, { content: "still no json" }]);
    const r = await runInvoiceAgent(client, "m", { turns: ["x"] }, deps);
    expect(r).toMatchObject({ ok: false, error: expect.stringMatching(/didn't match/) });
  });

  it("sends follow-up answers and the screenshot", async () => {
    const { client, create } = fakeClient([{ content: JSON.stringify(final) }]);
    await runInvoiceAgent(client, "m", { turns: ["Invoice Client A", "2500"], imageDataUrl: "data:image/png;base64,AAA" }, deps);
    const msgs = create.mock.calls[0][0].messages;
    expect(msgs[1].content[1]).toEqual({ type: "image_url", image_url: { url: "data:image/png;base64,AAA" } });
    expect(msgs[2]).toEqual({ role: "user", content: "Answer to your question: 2500" });
  });

  it("handles unknown tools and bad arguments without crashing", async () => {
    const { client } = fakeClient([
      { tool_calls: [{ id: "1", name: "delete_everything", args: {} }] },
      { content: JSON.stringify(final) },
    ]);
    const r = await runInvoiceAgent(client, "m", { turns: ["x"] }, deps);
    expect(r.steps[0]).toMatchObject({ result: { error: "Unknown tool delete_everything" } });
  });
});

describe("extractJson", () => {
  it("finds JSON inside prose", () => {
    expect(extractJson('Sure! {"a": 1} hope that helps')).toEqual({ a: 1 });
  });
  it("throws when there is none", () => {
    expect(() => extractJson("no")).toThrow();
  });
});
