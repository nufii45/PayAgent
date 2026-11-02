import "server-only";
import { env } from "@/lib/env";
import { createDb } from "./index";

export const db = createDb(env.DATABASE_URL);
