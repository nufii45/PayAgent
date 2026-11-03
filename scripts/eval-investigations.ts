// pnpm eval:investigations — reads the staged demo screenshots in evals/investigations with the real model,
// runs the deterministic reconciler, and checks the agreement it reconstructs. Optional arg: one case id.
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { createModelClient, providerConfigFromEnv } from "../src/lib/ai/provider";
import { extractConversation, type EvidenceInput } from "../src/lib/investigation/extract";
import { reconcile, type Analysis, type ItemStatus } from "../src/lib/investigation/reconcile";

config({ path: ".env.local" });

type ItemExpect = { match: string; status: ItemStatus[] };
type Case = {
  id: string;
  shots: string[];
  agreedTotal?: number;
  claimed?: number;
  items: ItemExpect[];
  action?: Analysis["summary"]["recommendedAction"][];
};

const pesos = (n: number) => n * 100;
const CASES: Case[] = [
  {
    id: "ana-v1",
    shots: ["ana-1-website", "ana-2-dashboard"],
    agreedTotal: pesos(18_000),
    claimed: 0,
    items: [
      { match: "website", status: ["agreed"] },
      { match: "dashboard", status: ["agreed"] },
    ],
  },
  {
    id: "ana-v2",
    shots: ["ana-1-website", "ana-2-dashboard", "ana-3-cancel"],
    agreedTotal: pesos(15_000),
    items: [
      { match: "website", status: ["agreed"] },
      { match: "dashboard", status: ["cancelled", "withdrawn"] },
    ],
  },
  {
    id: "ben",
    shots: ["ben-1-logo"],
    claimed: pesos(4_000),
    items: [{ match: "logo", status: ["change_proposed", "disputed"] }],
    action: ["clarify"],
  },
];

const now = new Date("2026-11-03T10:00:00+08:00");
const model = createModelClient(providerConfigFromEnv(process.env));
const only = process.argv[2];

async function main() {
  const cases = CASES.filter((c) => !only || c.id === only);
  if (!cases.length) {
    console.error(`No case named "${only}". Cases: ${CASES.map((c) => c.id).join(", ")}`);
    process.exit(1);
  }
  console.log(`Model: ${model.provider} / ${model.visionModel}\n`);
  let passed = 0;
  for (const c of cases) {
    const evidence: EvidenceInput[] = c.shots.map((s, i) => ({
      id: `E${i + 1}`,
      label: `Screenshot ${i + 1}`,
      kind: "image",
      dataUrl: `data:image/png;base64,${readFileSync(`evals/investigations/${s}.png`).toString("base64")}`,
    }));
    const run = await extractConversation(model.client, model.visionModel, { evidence }, now);
    const problems: string[] = [];
    let line = "";
    if (!run.ok) problems.push(run.error);
    else {
      const a = reconcile(run.extraction, evidence, {}, now);
      const s = a.summary;
      line = `${a.items.map((i) => `${i.label}=${i.status}`).join(", ")} | total ${s.agreedTotalCentavos / 100} | claimed ${s.claimedCentavos / 100} | verified ${s.verifiedCentavos / 100} | ${s.recommendedAction}`;
      if (c.agreedTotal != null && s.agreedTotalCentavos !== c.agreedTotal) problems.push(`agreed total ${s.agreedTotalCentavos / 100}, expected ${c.agreedTotal / 100}`);
      if (c.claimed != null && s.claimedCentavos !== c.claimed) problems.push(`claimed ${s.claimedCentavos / 100}, expected ${c.claimed / 100}`);
      if (s.verifiedCentavos !== 0) problems.push("marked a payment as verified from a chat alone");
      for (const e of c.items) {
        const item = a.items.find((i) => i.label.toLowerCase().includes(e.match));
        if (!item) problems.push(`no item matching "${e.match}"`);
        else if (!e.status.includes(item.status)) problems.push(`${e.match} is ${item.status}, expected ${e.status.join(" or ")}`);
      }
      if (c.action && !c.action.includes(s.recommendedAction)) problems.push(`recommends ${s.recommendedAction}, expected ${c.action.join(" or ")}`);
    }
    const secs = (run.latencyMs / 1000).toFixed(1);
    if (problems.length) console.log(`FAIL ${c.id} (${secs}s): ${problems.join("; ")}\n     ${line}`);
    else {
      passed++;
      console.log(`ok   ${c.id} (${secs}s${run.ok && run.retried ? ", retried" : ""}): ${line}`);
    }
  }
  console.log(`\n${passed}/${cases.length} passed`);
  process.exit(passed === cases.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
