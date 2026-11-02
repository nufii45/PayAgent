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
  return drizzleNeon(new NeonPool({ connectionString: url }), { schema }) as unknown as Db;
}

export type Db = NodePgDatabase<typeof schema>;
