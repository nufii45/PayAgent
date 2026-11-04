import { describe, expect, it } from "vitest";
import { providerConfigFromEnv } from "./ai/provider";
import { PRIVACY_TERMS_UPDATED, aiProcessor, hasCurrentPrivacyAck } from "./privacy";

describe("aiProcessor", () => {
  it("names the provider the analysis really uses", () => {
    const meta = { MODEL_PROVIDER: "meta", META_API_KEY: "k" };
    const baseten = { MODEL_PROVIDER: "baseten", BASETEN_API_KEY: "k" };
    expect(providerConfigFromEnv(meta).provider).toBe("meta");
    expect(aiProcessor(meta).short).toBe("Meta's Model API");
    expect(providerConfigFromEnv(baseten).provider).toBe("baseten");
    expect(aiProcessor(baseten).short).toBe("Baseten");
    // Unset falls back to Meta in both places.
    expect(providerConfigFromEnv({ META_API_KEY: "k" }).provider).toBe("meta");
    expect(aiProcessor({}).short).toBe("Meta's Model API");
  });
});

describe("hasCurrentPrivacyAck", () => {
  it("needs an acknowledgement given on or after the current terms", () => {
    expect(hasCurrentPrivacyAck({ privacyAcknowledgedAt: null })).toBe(false);
    expect(hasCurrentPrivacyAck({ privacyAcknowledgedAt: new Date(PRIVACY_TERMS_UPDATED.getTime() - 1) })).toBe(false);
    expect(hasCurrentPrivacyAck({ privacyAcknowledgedAt: PRIVACY_TERMS_UPDATED })).toBe(true);
  });
});
