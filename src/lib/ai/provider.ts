import OpenAI from "openai";

// Meta Model API and Baseten are both OpenAI-compatible, so one client covers both.
export type ProviderConfig = {
  provider: "meta" | "baseten";
  apiKey: string;
  baseURL: string;
  textModel: string;
  visionModel: string;
};

export function createModelClient(config: ProviderConfig) {
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL, timeout: 30_000, maxRetries: 1 });
  return { client, ...config };
}

export function providerConfigFromEnv(e: Record<string, string | undefined>): ProviderConfig {
  if (e.MODEL_PROVIDER === "baseten") {
    if (!e.BASETEN_API_KEY) throw new Error("MODEL_PROVIDER=baseten but BASETEN_API_KEY is empty");
    const model = e.BASETEN_MODEL || "meta-models/muse-spark-open-1026";
    return {
      provider: "baseten",
      apiKey: e.BASETEN_API_KEY,
      baseURL: e.BASETEN_BASE_URL || "https://inference.baseten.co/v1",
      textModel: model,
      visionModel: model,
    };
  }
  if (!e.META_API_KEY) throw new Error("META_API_KEY is empty");
  return {
    provider: "meta",
    apiKey: e.META_API_KEY,
    baseURL: e.META_API_BASE_URL || "https://api.meta.ai/v1",
    textModel: e.META_TEXT_MODEL || "muse-spark-1.3",
    visionModel: e.META_VISION_MODEL || e.META_TEXT_MODEL || "muse-spark-1.3",
  };
}
