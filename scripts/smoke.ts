// pnpm smoke — checks the model API and the database with your .env.local. Prints no secrets.
import { config } from "dotenv";
import { sql } from "drizzle-orm";
import { createModelClient, providerConfigFromEnv } from "../src/lib/ai/provider";
import { createDb } from "../src/db/index";

config({ path: ".env.local" });

async function checkModel() {
  const m = createModelClient(providerConfigFromEnv(process.env));
  console.log(`Model: ${m.provider} / ${m.textModel} at ${m.baseURL}`);

  let t = Date.now();
  const plain = await m.client.chat.completions.create({
    model: m.textModel,
    messages: [{ role: "user", content: "Reply with exactly: ok" }],
  });
  console.log(`  1. Plain completion (${Date.now() - t} ms): ${JSON.stringify(plain.choices[0]?.message?.content)}`);

  t = Date.now();
  const tooled = await m.client.chat.completions.create({
    model: m.textModel,
    messages: [{ role: "user", content: "Gawan mo ng invoice si Client A, 2.5k consulting, due next Friday. Resolve the due date." }],
    tools: [
      {
        type: "function",
        function: {
          name: "resolve_due_date",
          description: "Turn a relative due date token into a calendar date.",
          parameters: {
            type: "object",
            properties: { token: { type: "string", description: "e.g. next_friday, tomorrow, in_7_days" } },
            required: ["token"],
          },
        },
      },
    ],
  });
  const call = tooled.choices[0]?.message?.tool_calls?.[0];
  if (call && call.type === "function") {
    console.log(`  2. Tool call (${Date.now() - t} ms): ${call.function.name}(${call.function.arguments})`);
  } else {
    console.log(`  2. Tool call: NONE. Model replied with text instead: ${JSON.stringify(tooled.choices[0]?.message?.content)?.slice(0, 200)}`);
    process.exitCode = 1;
  }
}

async function checkDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is empty");
  const db = createDb(process.env.DATABASE_URL);
  const t = Date.now();
  const rows = await db.execute(sql`select current_database() as db, now() as now`);
  console.log(`Database (${Date.now() - t} ms): connected to ${JSON.stringify(rows.rows[0]?.db)}`);
}

async function main() {
  for (const [name, check] of [["model", checkModel], ["database", checkDb]] as const) {
    try {
      await check();
    } catch (err) {
      process.exitCode = 1;
      console.error(`FAILED ${name}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}

main().then(() => process.exit(process.exitCode ?? 0));
