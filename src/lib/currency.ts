// Which currency an invoice defaults to. Nothing here converts or relabels a stored amount.
export type Currency = "PHP" | "USD";

type Marks = [Currency, RegExp][];

// An amount field is only an amount, so any mark counts.
const AMOUNT_MARKS: Marks = [
  ["PHP", /₱|\bphp\b|\bpesos?\b|\bpiso\b|^\s*p\s?\d/i],
  ["USD", /\$|\busd\b|\bdollars?\b|\bdolyar(es)?\b/i],
];

// Free text needs a mark beside a number or a currency word, so "PHP website" and "P2 priority" don't count.
const TEXT_MARKS: Marks = [
  ["PHP", /₱\s?\d|\bphp\s?\d|[\dkm]\s?php\b|\bin php\b|\bpesos?\b|\bpiso\b|\bp\s?(?:\d{1,3}(?:,\d{3})+|\d{3,}|\d+(?:\.\d+)?k\b)/i],
  ["USD", /\$\s?\d|\busd\s?\d|[\dkm]\s?usd\b|\bin usd\b|\bdollars\b|[\dkm]\s?dollar\b|\bdolyar(es)?\b/i],
];

const named = (texts: (string | null | undefined)[], marks: Marks) => marks.filter(([, re]) => texts.some((t) => t && re.test(t))).map(([c]) => c);

export const currenciesInAmounts = (texts: (string | null | undefined)[]) => named(texts, AMOUNT_MARKS);
export const currenciesInText = (texts: (string | null | undefined)[]) => named(texts, TEXT_MARKS);

/**
 * The first source that names a currency decides. If it names both, nobody guesses: the preference is
 * used and `conflict` tells the review to ask. `isNamed` is false when no source names one.
 */
export function pickCurrency(sources: Currency[][], preferred: Currency): { currency: Currency; conflict: boolean; isNamed: boolean } {
  const found = sources.find((s) => s.length > 0);
  if (!found) return { currency: preferred, conflict: false, isNamed: false };
  return found.length === 1 ? { currency: found[0], conflict: false, isNamed: true } : { currency: preferred, conflict: true, isNamed: true };
}
