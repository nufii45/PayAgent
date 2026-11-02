import "server-only";
import { z } from "zod";

// Server-side env, validated once. Only the Phase 1 values are required for now;
// PayPal and Stellar become required when those phases start.
const schema = z.object({
  APP_URL: z.url().default("http://localhost:3000"),
  APP_TIMEZONE: z.literal("Asia/Manila").default("Asia/Manila"),
  DATABASE_URL: z.string().startsWith("postgres"),
  MODEL_PROVIDER: z.enum(["meta", "baseten"]).default("meta"),
  META_API_KEY: z.string().min(1),
  META_API_BASE_URL: z.url().default("https://api.meta.ai/v1"),
  META_TEXT_MODEL: z.string().min(1).default("muse-spark-1.3"),
  META_VISION_MODEL: z.string().min(1).default("muse-spark-1.3"),
  META_TRANSCRIBE_MODEL: z.string().min(1).default("muse-voice-transcribe-1.0"),
  BASETEN_API_KEY: z.string().optional(),
  BASETEN_BASE_URL: z.string().optional(),
  BASETEN_MODEL: z.string().default("meta-models/muse-spark-open-1026"),
});

const blankToUndefined = Object.fromEntries(
  Object.entries(process.env).map(([k, v]) => [k, v === "" ? undefined : v]),
);

export const env = schema.parse(blankToUndefined);
