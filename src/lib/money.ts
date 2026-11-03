import { parseAmountWords } from "./amount-words";

// Money is always integer centavos. Never use floats for amounts.

export type ParseAmountResult =
  | { ok: true; centavos: number }
  | { ok: false; error: string };

const SUFFIX: Record<string, bigint> = { "": 1n, k: 1_000n, m: 1_000_000n };

/**
 * Parse a human amount ("2500", "2,500", "2.5k", "₱2,500.50", "PHP 2500", "1.2m")
 * into integer centavos. Rejects negative, zero, ambiguous or malformed input.
 */
export function parseAmount(input: string): ParseAmountResult {
  const text = input
    .trim()
    .toLowerCase()
    // Currency marks only; the currency itself is decided separately.
    .replace(/^(₱|php|p|\$|usd|us\$)\s*/, "")
    .replace(/\s*(php|pesos?|usd|dollars?)$/, "")
    .trim();

  const match = /^(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d+))?\s*([km]?)$/.exec(text);
  if (!match) {
    // Fall back to amounts written in words ("tatlong libong piso", "two thousand").
    const pesos = parseAmountWords(input);
    if (pesos != null && Number.isSafeInteger(pesos * 100)) return { ok: true, centavos: pesos * 100 };
    return { ok: false, error: `Can't read "${input}" as an amount` };
  }

  const [, whole, fraction = "", suffix] = match;
  const multiplier = SUFFIX[suffix];

  // Without a suffix, allow at most 2 decimal places (centavos).
  if (!suffix && fraction.length > 2) {
    return { ok: false, error: `"${input}" has more than 2 decimal places` };
  }

  // Exact arithmetic: value = (whole.fraction) * multiplier * 100 centavos.
  const scale = 10n ** BigInt(fraction.length);
  const numerator = (BigInt(whole.replace(/,/g, "")) * scale + BigInt(fraction || "0")) * multiplier * 100n;
  if (numerator % scale !== 0n) {
    return { ok: false, error: `"${input}" doesn't resolve to whole centavos` };
  }
  const centavos = numerator / scale;
  if (centavos <= 0n) return { ok: false, error: "Amount must be more than zero" };
  if (centavos > BigInt(Number.MAX_SAFE_INTEGER)) return { ok: false, error: "Amount is too large" };
  return { ok: true, centavos: Number(centavos) };
}

const pesoFormatter = new Intl.NumberFormat("en-PH", { style: "currency", currency: "PHP" });

export function formatPeso(centavos: number): string {
  return pesoFormatter.format(centavos / 100);
}

const dollarFormatter = new Intl.NumberFormat("en-PH", { style: "currency", currency: "USD" });

export function formatMoney(centavos: number, currency: "PHP" | "USD" = "PHP"): string {
  return currency === "USD" ? dollarFormatter.format(centavos / 100) : formatPeso(centavos);
}
