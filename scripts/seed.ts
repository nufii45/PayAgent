// pnpm db:seed <workspace-id> — adds demo clients (with nicknames) to one guest workspace, for trying the
// invoice agent's client lookup. Every visitor gets their own empty workspace, so nothing else is seeded,
// and nothing is ever deleted. Find your workspace id in your browser's "pa_ws" cookie.
import { config } from "dotenv";
import { createDb } from "../src/db/index";
import { clients, workspaces } from "../src/db/schema";

config({ path: ".env.local" });

async function main() {
  const id = process.argv[2];
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    console.error("Usage: pnpm db:seed <workspace-id>   (the value of the pa_ws cookie)");
    process.exit(1);
  }
  const db = createDb(process.env.DATABASE_URL!);
  await db.insert(workspaces).values({ id }).onConflictDoNothing();
  await db.insert(clients).values([
    { workspaceId: id, name: "Client A", email: "billing@client-a.test", aliases: ["clienta", "client a inc"] },
    { workspaceId: id, name: "Maria Santos", email: "maria@santos.test", aliases: ["maria", "ms. santos"] },
    { workspaceId: id, name: "Bayanihan Bakery", email: "orders@bayanihan.test", aliases: ["bakery"] },
  ]);
  console.log("Added 3 demo clients to the workspace.");
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
