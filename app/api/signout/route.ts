import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

// Clears the session cookie and returns to /create (signed out). The app had no
// sign-out before; this also lets a stale session be cleared cleanly.
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const base = process.env.APP_URL ?? new URL(request.url).origin;
  const response = NextResponse.redirect(new URL("/create", base));
  response.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return response;
}
