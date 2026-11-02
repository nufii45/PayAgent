// pnpm db:seed — inserts demo clients and two sample invoices. Safe to re-run: clears demo data first.
import { config } from "dotenv";
import { createDb } from "../src/db/index";
import { auditEvents, approvals, clients, invoiceItems, invoices } from "../src/db/schema";

config({ path: ".env.local" });
const db = createDb(process.env.DATABASE_URL!);

async function main() {
  await db.delete(invoiceItems);
  await db.delete(invoices);
  await db.delete(approvals);
  await db.delete(auditEvents);
  await db.delete(clients);

  const [a, b] = await db
    .insert(clients)
    .values([
      { name: "Client A", email: "billing@client-a.test", aliases: ["clienta", "client a inc"] },
      { name: "Maria Santos", email: "maria@santos.test", aliases: ["maria", "ms. santos"] },
      { name: "Bayanihan Bakery", email: "orders@bayanihan.test", aliases: ["bakery"] },
    ])
    .returning();

  const created = await db
    .insert(invoices)
    .values([
      { clientId: a.id, amountCentavos: 250_000, dueDate: "2026-11-13", notes: "Consulting, October" },
      { clientId: b.id, amountCentavos: 1_200_000, dueDate: "2026-11-20", notes: "Website redesign, phase 1" },
    ])
    .returning();

  await db.insert(invoiceItems).values([
    { invoiceId: created[0].id, description: "Consulting, October", amountCentavos: 250_000 },
    { invoiceId: created[1].id, description: "Website redesign, phase 1", amountCentavos: 1_200_000 },
  ]);

  console.log(`Seeded 3 clients and ${created.length} invoices: ${created.map((i) => i.number).join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
