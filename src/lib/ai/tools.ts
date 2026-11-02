import type OpenAI from "openai";
import { formatPeso, parseAmount } from "../money";
import { resolveDueDate } from "../dates";

// Deterministic tools the agent can call. They do the maths; the model never does.

export type ClientMatch = { id: string; name: string; email: string | null };
export type OpenInvoice = { number: string; amountCentavos: number; dueDate: string; status: string };

export type ToolDeps = {
  findClient(name: string): Promise<ClientMatch[]>;
  listOpenInvoices(clientName: string): Promise<OpenInvoice[]>;
  now: Date;
};

export const toolDefinitions: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "find_client",
      description: "Look up existing clients by name or nickname. Use the returned name exactly if there is a match.",
      parameters: {
        type: "object",
        properties: { name: { type: "string", description: "Client name as the user wrote it" } },
        required: ["name"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "parse_amount",
      description: "Check that an amount the user wrote (e.g. '2.5k', '₱2,500.50', 'P3000') can be read. Returns pesos or an error.",
      parameters: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "resolve_due_date",
      description:
        "Turn a due date token into a calendar date in Manila time. Tokens: today, tomorrow, in_<n>_days, this_<weekday>, next_<weekday>, end_of_month, absolute:YYYY-MM-DD.",
      parameters: {
        type: "object",
        properties: { token: { type: "string" } },
        required: ["token"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_open_invoices",
      description: "List a client's unpaid invoices, e.g. when the user says 'same as last time'.",
      parameters: {
        type: "object",
        properties: { client_name: { type: "string" } },
        required: ["client_name"],
      },
    },
  },
];

export async function runTool(name: string, rawArgs: string, deps: ToolDeps): Promise<unknown> {
  let args: Record<string, unknown>;
  try {
    args = JSON.parse(rawArgs || "{}");
  } catch {
    return { error: "Arguments were not valid JSON" };
  }
  const str = (key: string) => (typeof args[key] === "string" ? (args[key] as string) : "");

  switch (name) {
    case "find_client": {
      const matches = await deps.findClient(str("name"));
      return matches.length ? { matches: matches.map((m) => ({ name: m.name, email: m.email })) } : { matches: [], note: "New client" };
    }
    case "parse_amount": {
      const r = parseAmount(str("text"));
      return r.ok ? { ok: true, pesos: formatPeso(r.centavos) } : { ok: false, error: r.error };
    }
    case "resolve_due_date": {
      const r = resolveDueDate(str("token"), deps.now);
      return r.ok ? { ok: true, date: r.date, needsConfirmation: r.needsConfirmation } : { ok: false, error: r.error };
    }
    case "list_open_invoices": {
      const invoices = await deps.listOpenInvoices(str("client_name"));
      return { invoices: invoices.map((i) => ({ ...i, amount: formatPeso(i.amountCentavos) })) };
    }
    default:
      return { error: `Unknown tool ${name}` };
  }
}
