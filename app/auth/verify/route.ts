import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashSignInToken } from "@/lib/auth-token";
import { createSessionToken, SESSION_COOKIE, SESSION_COOKIE_OPTS } from "@/lib/session";

// Magic-link verification. Consumes a single-use token: on success it creates
// (or updates) the user, issues the session JWT on the redirect response, and
// deletes the token so the link can't be reused. Reads/writes the DB — never
// prerender. Access is by possession of the emailed token only.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const base = process.env.APP_URL ?? url.origin;
  const rawToken = url.searchParams.get("token");

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/create?auth=${reason}`, base));

  if (!rawToken) return fail("invalid");

  const tokenHash = hashSignInToken(rawToken);
  const token = await prisma.signInToken.findUnique({ where: { tokenHash } });

  if (!token) return fail("invalid");

  if (token.expiresAt.getTime() < Date.now()) {
    await prisma.signInToken.delete({ where: { id: token.id } }).catch(() => {});
    return fail("expired");
  }

  // Verified — create/refresh the user, consume every token for this email, and
  // issue the session on the redirect response.
  const user = await prisma.user.upsert({
    where: { email: token.email },
    update: { companyName: token.companyName },
    create: { email: token.email, companyName: token.companyName },
  });
  await prisma.signInToken.deleteMany({ where: { email: token.email } });

  const response = NextResponse.redirect(new URL("/create", base));
  response.cookies.set(
    SESSION_COOKIE,
    createSessionToken(user.id),
    SESSION_COOKIE_OPTS
  );
  return response;
}
