import { createHash, randomBytes } from "crypto";

// A 256-bit URL-safe token — unguessable, so we can look it up by its hash
// without a timing-safe compare (an attacker can't brute-force the space).
export function generateSignInToken(): string {
  return randomBytes(32).toString("base64url");
}

// Only the hash is ever stored / looked up; the raw token lives only in the
// emailed link.
export function hashSignInToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}
