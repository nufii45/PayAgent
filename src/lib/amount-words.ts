// Read whole-peso amounts written in Filipino or English words:
// "tatlong libong piso", "isang daan at limampu", "two thousand five hundred", "5 libo".
// Returns whole pesos, or null when any word isn't understood. Never guesses.

const UNITS: Record<string, number> = {
  isa: 1, dalawa: 2, tatlo: 3, apat: 4, lima: 5, anim: 6, pito: 7, walo: 8, siyam: 9, sampu: 10,
  dalawampu: 20, tatlumpu: 30, apatnapu: 40, limampu: 50, animnapu: 60, pitumpu: 70, walumpu: 80, siyamnapu: 90,
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19,
  twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90,
};
const HUNDRED = new Set(["daan", "raan", "hundred"]);
const SCALES: Record<string, number> = { libo: 1_000, thousand: 1_000, milyon: 1_000_000, million: 1_000_000 };
const FILLER = new Set(["at", "and", "na", "piso", "pesos", "peso", "php"]);

/** Turn one word into its base form, expanding "san-" (one) and the "labing-" teens. */
function expand(word: string): (string | number)[] | null {
  if (/^\d+$/.test(word)) return [Number(word)];
  const candidates = [word];
  // Linker endings: tatlong → tatlo, daang → daan, milyong → milyon.
  if (word.endsWith("ng")) candidates.push(word.slice(0, -2), word.slice(0, -1));
  for (const w of candidates) {
    if (w in UNITS || HUNDRED.has(w) || w in SCALES || FILLER.has(w)) return [w];
    const san = /^san(daan|raan|libo|milyon)$/.exec(w);
    if (san) return ["isa", san[1]];
    const teen = /^labi(?:ng|n|m)?(.+)$/.exec(w);
    if (teen && teen[1] in UNITS && UNITS[teen[1]] < 10) return [10 + UNITS[teen[1]]];
  }
  return null;
}

export function parseAmountWords(input: string): number | null {
  const words = input
    .toLowerCase()
    .replace(/['’]t\b/g, " at") // dalawampu't lima
    .replace(/\blabi(ng|n|m)?-/g, "labi$1") // labing-isa
    .replace(/[-,]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (!words.length) return null;

  let total = 0;
  let current = 0;
  let sawNumber = false;
  // Each added number must be smaller than the lowest place already filled,
  // so "lima lima" or "3 000" are rejected instead of summed.
  const add = (n: number) => {
    if (current > 0) {
      let place = 1;
      while (current % (place * 10) === 0) place *= 10;
      if (n >= place) return false;
    }
    current += n;
    sawNumber = true;
    return true;
  };
  for (const [i, raw] of words.entries()) {
    const parts = expand(raw);
    if (!parts) return null;
    for (const p of parts) {
      if (typeof p === "number" && /^\d+$/.test(raw)) {
        // Digits only count next to a scale word: "5 libo", "3 thousand".
        const next = expand(words[i + 1] ?? "")?.[0];
        if (typeof next !== "string" || !(HUNDRED.has(next) || next in SCALES)) return null;
        if (!add(p)) return null;
      } else if (typeof p === "number") {
        if (!add(p)) return null; // a teen like labing-isa
      } else if (p in UNITS) {
        if (!add(UNITS[p])) return null;
      }
      else if (HUNDRED.has(p)) { current = (current || 1) * 100; sawNumber = true; }
      else if (p in SCALES) { total += (current || 1) * SCALES[p]; current = 0; sawNumber = true; }
    }
  }
  const value = total + current;
  return sawNumber && value > 0 ? value : null;
}
