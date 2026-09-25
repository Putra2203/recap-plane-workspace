// Shared-password gate for the whole app — one password for the team, no
// per-user accounts. Session is a stateless signed cookie (expiry + HMAC),
// not a DB-backed session table: proxy.ts runs on every request and a DB
// round-trip there would add real latency to every page load for no benefit
// this app needs (there's no per-user state to look up).
//
// APP_PASSWORD doubles as both the password typed into the login form AND
// the HMAC signing key for the session cookie. That's deliberate, not a
// shortcut: anyone who could forge a valid cookie without knowing
// APP_PASSWORD would already be able to just log in normally with it, so a
// second secret would add setup steps without changing the actual threat
// model.
import { createHash, createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE_NAME = "plane_recap_session";
const SESSION_DAYS = 30;
export const SESSION_MAX_AGE_SECONDS = SESSION_DAYS * 24 * 60 * 60;

function secret(): string {
  const value = process.env.APP_PASSWORD;
  if (!value) throw new Error("APP_PASSWORD is not set");
  return value;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("hex");
}

export function createSessionCookieValue(): string {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = String(expiresAt);
  return `${payload}.${sign(payload)}`;
}

export function isValidSessionCookieValue(value: string | undefined | null): boolean {
  if (!value) return false;
  const dot = value.indexOf(".");
  if (dot < 0) return false;
  const payload = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  if (!payload || !signature) return false;

  const expected = sign(payload);
  const actual = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  // Different lengths would make timingSafeEqual throw rather than just
  // return false, and comparing garbage input against it is exactly the
  // case that needs to not throw.
  if (actual.length !== expectedBuf.length || !timingSafeEqual(actual, expectedBuf)) {
    return false;
  }

  const expiresAt = Number(payload);
  return Number.isFinite(expiresAt) && expiresAt > Date.now();
}

// Fixed-length digest comparison (not a direct string ===) so neither the
// candidate's length nor its content leaks through comparison timing.
export function isCorrectPassword(candidate: string): boolean {
  const expected = createHash("sha256").update(secret()).digest();
  const actual = createHash("sha256").update(candidate).digest();
  return timingSafeEqual(actual, expected);
}
