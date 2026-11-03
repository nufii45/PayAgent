// pnpm smoke — checks the model API and the database with your .env.local. Prints no secrets.
import { config } from "dotenv";
import { readFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { createModelClient, providerConfigFromEnv } from "../src/lib/ai/provider";
import { transcribe, transcribeConfigFromEnv } from "../src/lib/ai/transcribe";
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

  t = Date.now();
  const image = readFileSync("evals/screenshots/chat-maria-en.png").toString("base64");
  const seen = await m.client.chat.completions.create({
    model: m.visionModel,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Who is this chat with, and what price was agreed? Reply in one short line." },
          { type: "image_url", image_url: { url: `data:image/png;base64,${image}` } },
        ],
      },
    ],
  });
  console.log(`  3. Screenshot (${Date.now() - t} ms): ${JSON.stringify(seen.choices[0]?.message?.content)?.slice(0, 200)}`);
}

async function checkTranscribe() {
  const t = Date.now();
  const r = await transcribe(transcribeConfigFromEnv(process.env), new Uint8Array(readFileSync("evals/audio/voice-note-en.wav")));
  if (!r.ok) throw new Error(r.error);
  console.log(`Voice transcribe (${Date.now() - t} ms): ${JSON.stringify(r.transcript)}`);
}

async function checkDb() {
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is empty");
  const db = createDb(process.env.DATABASE_URL);
  const t = Date.now();
  const rows = await db.execute(sql`select current_database() as db, now() as now`);
  console.log(`Database (${Date.now() - t} ms): connected to ${JSON.stringify(rows.rows[0]?.db)}`);
}

/** Error message plus its causes, so network and driver errors show the real reason. */
function describeError(err: unknown): string {
  const parts: string[] = [];
  for (let e: unknown = err, depth = 0; e && depth < 4; depth++) {
    if (e instanceof Error) {
      const code = (e as { code?: string }).code;
      parts.push(`${e.message.split("\n")[0]}${code ? ` [${code}]` : ""}`);
      e = e.cause;
    } else {
      parts.push(String(e));
      break;
    }
  }
  return parts.join(" ← ");
}

async function main() {
  for (const [name, check] of [["model", checkModel], ["transcribe", checkTranscribe], ["database", checkDb]] as const) {
    try {
      await check();
    } catch (err) {
      process.exitCode = 1;
      console.error(`FAILED ${name}: ${describeError(err)}`);
    }
  }
}

main().then(() => process.exit(process.exitCode ?? 0));
