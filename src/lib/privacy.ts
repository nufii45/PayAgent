// What the privacy disclosure says, derived from the real configuration so the copy can't drift from the code.
// Edge-safe and pure: pass process.env in from the server.

/**
 * Acknowledgements given before this moment don't count. Bump it whenever the disclosure changes
 * materially (a new AI provider, a different retention rule, new data kept), and everyone is asked again.
 */
export const PRIVACY_TERMS_UPDATED = new Date("2026-11-04T00:00:00+08:00");

export function hasCurrentPrivacyAck(ws: { privacyAcknowledgedAt: Date | null }) {
  return !!ws.privacyAcknowledgedAt && ws.privacyAcknowledgedAt >= PRIVACY_TERMS_UPDATED;
}

/** Who reads screenshots and pasted text. Mirrors providerConfigFromEnv in lib/ai/provider.ts. */
export function aiProcessor(env: Record<string, string | undefined> = process.env) {
  return env.MODEL_PROVIDER === "baseten"
    ? { short: "Baseten", full: "Baseten, an AI hosting provider running Meta's open-weight Muse Spark model" }
    : { short: "Meta's Model API", full: "Meta's Model API (Muse Spark)" };
}

export type PrivacyFacts = { processor: string; retentionDays: number };
