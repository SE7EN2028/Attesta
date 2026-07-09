import { cookies } from "next/headers";

export const SESSION_COOKIE = "attesta_uid";

export function getSessionUserId(): string | undefined {
  return cookies().get(SESSION_COOKIE)?.value;
}

export function setSessionUserId(userId: string) {
  cookies().set(SESSION_COOKIE, userId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}
