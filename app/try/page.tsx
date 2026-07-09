import { cookies } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";
import { Nav } from "@/components/nav";
import { Container } from "@/components/container";
import { CreateFlow } from "@/components/create-flow";

// Live demo path. Reuses the /create 4-step flow (CreateFlow) but with
// mode="live": after tier selection it runs transcription + report generation
// synchronously and redirects to the generated report, instead of the
// request → human-review queue that /create uses.
export default async function TryPage() {
  const userId = cookies().get(SESSION_COOKIE)?.value;
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : null;

  return (
    <>
      <Nav />

      {/* Persistent temporary/testing notice — this is not a permanent product surface. */}
      <div className="border-b border-gold-400/30 bg-gold-400/10">
        <Container className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3">
          <span className="shrink-0 rounded-full border border-gold-400/50 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-gold-400">
            Temporary · testing
          </span>
          <p className="text-[13.5px] leading-relaxed text-cream-300">
            This is a temporary demo path for testing the full pipeline live —
            it runs transcription and report generation right away and drops
            you on the finished report. The real product flow is a
            request-based process with human review, shown at{" "}
            <Link
              href="/create"
              className="text-rust-400 underline underline-offset-2 hover:text-rust-300"
            >
              Try the preview
            </Link>
            .
          </p>
        </Container>
      </div>

      <main className="min-h-screen bg-ink-900 py-16">
        <CreateFlow
          mode="live"
          initialUser={
            user
              ? { id: user.id, email: user.email, companyName: user.companyName }
              : null
          }
        />
      </main>
    </>
  );
}
