import { prisma } from "@/lib/prisma";
import { hashSignInToken } from "@/lib/auth-token";
import { Nav } from "@/components/nav";
import { Container } from "@/components/container";
import { VerifyContinue } from "@/components/verify-continue";

// Interstitial — a GET here (including email-client / scanner prefetches) must
// NOT consume the token. Only the explicit "Continue" button (a server action)
// signs the user in. We do a read-only validity check so the page can show the
// right state immediately without burning the link.
export const dynamic = "force-dynamic";

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  let status: "valid" | "expired" | "invalid" = "invalid";
  let code: string | null = null;
  if (token) {
    const row = await prisma.signInToken.findUnique({
      where: { tokenHash: hashSignInToken(token) },
    });
    if (row) {
      status = row.expiresAt.getTime() < Date.now() ? "expired" : "valid";
      code = row.code;
    }
  }

  return (
    <>
      <Nav />
      <main className="flex min-h-screen items-center justify-center bg-ink-900 px-6">
        <Container className="max-w-md text-center">
          <VerifyContinue token={token ?? ""} status={status} code={code} />
        </Container>
      </main>
    </>
  );
}
