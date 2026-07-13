import { createHash, randomBytes } from "crypto";

// A 256-bit URL-safe token — unguessable, so we can look it up by its hash
// without a timing-safe compare (an attacker can't brute-force the space).
export function generateSignInToken(): string {
  return randomBytes(32).toString("base64url");
}

// Only the hash is ever stored / looked up; the raw token lives only in the
// emailed link (and, for the pending handle, in the requesting device's cookie).
export function hashSignInToken(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

// Short human-comparable code shown on BOTH devices for cross-device sign-in.
// Not a secret — it exists so the person confirms the device they're approving
// is the one they started on. Unambiguous alphabet (no O/0/I/1).
export function generateMatchCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(4);
  let out = "";
  for (let i = 0; i < 4; i++) out += alphabet[bytes[i] % alphabet.length];
  return out;
}
