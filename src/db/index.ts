import { Pool as NeonPool } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool as PgPool } from "pg";
import * as schema from "./schema";

/**
 * Neon in production, plain Postgres for local development and end-to-end tests.
 * Both drivers support transactions and share the same query API.
 */
export function createDb(url: string): Db {
  const local = /@(localhost|127\.0\.0\.1)[:/]/.test(url) || url.includes("host=/");
  if (local) return drizzlePg(new PgPool({ connectionString: url }), { schema });
  // The default 10 s idle timeout made the next click after a pause reconnect, which costs about a second. Neon's
  // compute suspends after 5 minutes, so stay just under that. Dropped idle connections must not crash the process.
  const pool = new NeonPool({ connectionString: url, idleTimeoutMillis: 4 * 60_000 });
  pool.on("error", (err: Error) => console.error("Idle database connection dropped", err.message));
  return drizzleNeon(pool, { schema }) as unknown as Db;
}

export type Db = NodePgDatabase<typeof schema>;
