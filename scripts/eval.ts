// pnpm eval — runs evals/invoice-cases.json against the real model and prints the pass rate.
// Uses a fixed "now" and in-memory clients, so results don't depend on the database.
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { runInvoiceAgent } from "../src/lib/ai/agent";
import { createModelClient, providerConfigFromEnv } from "../src/lib/ai/provider";
import { proposalToDraft } from "../src/lib/invoice-schema";

config({ path: ".env.local" });

type Client = { id: string; name: string; email: string; aliases: string[] };
type Expect = { status: string; clientName?: string; currency?: string; totalCentavos?: number; dueDate?: string; missing?: string[] };
const data = JSON.parse(readFileSync("evals/invoice-cases.json", "utf8")) as {
  now: string;
  clients: Client[];
  cases: { id: string; input: string; expect: Expect }[];
};

const now = new Date(data.now);
const model = createModelClient(providerConfigFromEnv(process.env));
const only = process.argv[2];

const findClient = async (name: string) => {
  const q = name.trim().toLowerCase();
  return data.clients.filter((c) => c.name.toLowerCase() === q || c.aliases.includes(q) || c.name.toLowerCase().includes(q));
};

async function main() {
  console.log(`Model: ${model.provider} / ${model.textModel}\n`);
  let passed = 0;
  const cases = data.cases.filter((c) => !only || c.id === only);
  for (const c of cases) {
    const run = await runInvoiceAgent(model.client, model.textModel, { turns: [c.input] }, { now, findClient, listOpenInvoices: async () => [] });
    const problems: string[] = [];
    if (!run.ok) problems.push(run.error);
    else {
      const r = proposalToDraft(run.proposal, now);
      const status = r.status === "needs_confirmation" ? "ready" : r.status;
      if (status !== c.expect.status) problems.push(`status ${r.status}, expected ${c.expect.status}`);
      if ("draft" in r) {
        const d = r.draft;
        if (c.expect.clientName && d.clientName !== c.expect.clientName) problems.push(`client "${d.clientName}"`);
        if (c.expect.totalCentavos != null && d.totalCentavos !== c.expect.totalCentavos) problems.push(`total ${d.totalCentavos}`);
        if (c.expect.dueDate && d.dueDate !== c.expect.dueDate) problems.push(`due ${d.dueDate}`);
        if (c.expect.currency && d.currency !== c.expect.currency) problems.push(`currency ${d.currency}`);
      }
      if (r.status === "needs_info" && c.expect.missing) {
        for (const m of c.expect.missing) if (!r.missing.includes(m)) problems.push(`didn't flag missing ${m}`);
      }
      if (r.status === "invalid") problems.push(r.errors.join("; "));
    }
    const tools = run.steps.filter((s) => s.type === "tool_call").length;
    if (!problems.length) passed++;
    console.log(`${problems.length ? "FAIL" : "pass"}  ${c.id.padEnd(20)} ${(run.latencyMs / 1000).toFixed(1)}s  ${tools} tool calls  ${problems.join(", ")}`);
  }
  const rate = Math.round((passed / cases.length) * 100);
  console.log(`\n${passed}/${cases.length} passed (${rate}%)`);
  process.exit(rate >= 90 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
