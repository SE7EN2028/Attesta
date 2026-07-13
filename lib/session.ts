import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export const SESSION_COOKIE = "attesta_uid";
// Held by the device that REQUESTED sign-in; used to claim the session once the
// emailed link is confirmed (possibly on another device).
export const PENDING_COOKIE = "attesta_pending";

const THIRTY_DAYS_SEC = 60 * 60 * 24 * 30;

// JWT_SECRET signs/verifies the session token. MUST be set (locally in .env,
// and in Vercel's environment before deploy) — a strong random value, e.g.
// `openssl rand -base64 32`. Read lazily so a missing value fails loudly at
// the auth boundary rather than at module import.
function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set — required to sign/verify sessions.");
  }
  return secret;
}

// Issues a signed, 30-day JWT holding the user id as `sub` and stores it in an
// httpOnly cookie. Replaces the former raw-userId cookie: the value is now
// tamper-evident + expiring. Sync (jsonwebtoken) so callers keep their exact
// signatures — no `await`, no call-site churn.
// Cookie attributes for the session token — shared so a route handler can set
// the same cookie on a NextResponse (redirects need the cookie on the response
// object, not via next/headers).
export const SESSION_COOKIE_OPTS = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  maxAge: THIRTY_DAYS_SEC,
};

// Signs a 30-day session JWT (user id as `sub`). Used by setSessionUserId and
// directly by the magic-link verify route (which sets it on its redirect
// response).
export function createSessionToken(userId: string): string {
  return jwt.sign({ sub: userId }, getSecret(), {
    expiresIn: THIRTY_DAYS_SEC,
  });
}

export function setSessionUserId(userId: string) {
  cookies().set(SESSION_COOKIE, createSessionToken(userId), SESSION_COOKIE_OPTS);
}

// Verifies the session JWT and returns the user id (`sub`), or undefined for a
// missing / malformed / tampered / expired token — callers treat undefined as
// signed-out.
export function getSessionUserId(): string | undefined {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return undefined;
  try {
    const payload = jwt.verify(token, getSecret());
    if (typeof payload === "object" && typeof payload.sub === "string") {
      return payload.sub;
    }
    return undefined;
  } catch {
    // Invalid signature, malformed token, or expired — treat as signed-out.
    return undefined;
  }
}
