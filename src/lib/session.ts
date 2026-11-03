// Single-owner login. Works in both the Edge middleware and Node (Web Crypto only).
// If APP_PASSWORD is not set, the app runs open (local development) and shows the test-data banner.

export const SESSION_COOKIE = "pa_session";
const SESSION_DAYS = 7;
const enc = new TextEncoder();

async function hmac(secret: string, message: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(message)));
  return btoa(String.fromCharCode(...sig)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function authEnabled(env: Record<string, string | undefined> = process.env) {
  return !!env.APP_PASSWORD;
}

export async function createSessionValue(password: string, now = Date.now()) {
  const expires = now + SESSION_DAYS * 86_400_000;
  return { value: `${expires}.${await hmac(password, `payagent-session:${expires}`)}`, expires: new Date(expires) };
}

export async function verifySessionValue(password: string, value: string | undefined, now = Date.now()) {
  if (!value) return false;
  const [expires, sig] = value.split(".");
  if (!expires || !sig || Number(expires) < now) return false;
  return safeEqual(sig, await hmac(password, `payagent-session:${expires}`));
}

export async function checkPassword(expected: string, given: string) {
  // Compare HMACs so the comparison takes the same time whatever the input length.
  return safeEqual(await hmac("payagent-login", expected), await hmac("payagent-login", given));
}
