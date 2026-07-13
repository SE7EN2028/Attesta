import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import {
  getSessionUserId,
  createSessionToken,
  SESSION_COOKIE,
  SESSION_COOKIE_OPTS,
  PENDING_COOKIE,
} from "@/lib/session";
import { hashSignInToken } from "@/lib/auth-token";

// Polled by the "check your email" screen. Two jobs:
//  1. Report whether this device is already signed in (and the user exists — so
//     a stale token doesn't bounce the poll back to the sign-in form).
//  2. Cross-device claim: if this device holds a pending handle (cookie) whose
//     sign-in was approved on another device, issue the session HERE now.
export const dynamic = "force-dynamic";

export async function GET() {
  const uid = getSessionUserId();
  if (uid) {
    const user = await prisma.user.findUnique({
      where: { id: uid },
      select: { id: true },
    });
    if (user) return NextResponse.json({ signedIn: true });
  }

  const pending = cookies().get(PENDING_COOKIE)?.value;
  if (pending) {
    const rec = await prisma.signInToken.findUnique({
      where: { pendingHash: hashSignInToken(pending) },
    });
    if (rec && rec.approvedUserId && rec.expiresAt.getTime() > Date.now()) {
      const response = NextResponse.json({ signedIn: true });
      response.cookies.set(
        SESSION_COOKIE,
        createSessionToken(rec.approvedUserId),
        SESSION_COOKIE_OPTS
      );
      response.cookies.set(PENDING_COOKIE, "", { path: "/", maxAge: 0 });
      await prisma.signInToken.delete({ where: { id: rec.id } }).catch(() => {});
      return response;
    }
  }

  return NextResponse.json({ signedIn: false });
}
