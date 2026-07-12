import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/nav";
import { Container } from "@/components/container";
import Link from "next/link";
import { Eyebrow } from "@/components/eyebrow";
import { Button } from "@/components/ui/button";
import {
  AdminPipelineList,
  type PipelineRow,
} from "@/components/admin-pipeline-list";
import { AdminKeysProvider, AdminKeysPanel } from "@/components/admin-keys";

// Reads live meeting requests / reports from the DB — must render per-request,
// not be prerendered static (which freezes it to a build-time snapshot).
export const dynamic = "force-dynamic";

type SourceFileLink = {
  id: string;
  fileName: string;
  type: string;
  role: string;
};

function toFileLinks(
  sourceFiles: { id: string; fileName: string; type: string; role: string }[]
): SourceFileLink[] {
  // Primary meeting file first, supporting docs after.
  return [...sourceFiles]
    .sort((a, b) =>
      a.role === "PRIMARY_MEETING" ? -1 : b.role === "PRIMARY_MEETING" ? 1 : 0
    )
    .map((f) => ({
      id: f.id,
      fileName: f.fileName,
      type: f.type,
      role: f.role,
    }));
}

export default async function AdminPage() {
  // One query for the whole pipeline (everything except incomplete client
  // drafts), newest first. A single list means a request keeps its card and
  // position through its entire lifecycle instead of jumping between sections.
  const requests = await prisma.meetingRequest.findMany({
    where: { status: { not: "DRAFT" } },
    include: {
      sourceFiles: { include: { transcript: true } },
      report: true,
      user: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const rows: PipelineRow[] = requests.map((mr) => {
    const primary = mr.sourceFiles.find((f) => f.role === "PRIMARY_MEETING");
    return {
      meetingRequestId: mr.id,
      reportId: mr.report?.id ?? null,
      title: mr.title,
      company: mr.company,
      tier: mr.tier,
      ownerEmail: mr.user.email,
      createdAt: mr.createdAt.toISOString(),
      files: toFileLinks(mr.sourceFiles),
      hasPrimaryTranscript: Boolean(primary?.transcript),
      meetingRequestStatus: mr.status,
      reportStatus: mr.report?.status ?? null,
      lockedBy: mr.report?.lockedBy ?? null,
    };
  });

  return (
    <>
      <Nav />

      {/* Persistent temporary/testing notice — this operator console is not a
          customer-facing surface. */}
      <div className="border-b border-gold-400/30 bg-gold-400/10">
        <Container className="flex flex-wrap items-center gap-x-3 gap-y-1.5 py-3">
          <span className="shrink-0 rounded-full border border-gold-400/50 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.12em] text-gold-400">
            Admin only · testing
          </span>
          <p className="text-[13.5px] leading-relaxed text-cream-300">
            This is the internal admin / operator console — temporarily exposed
            here for testing the pipeline. It is not a customer-facing surface
            and isn&apos;t access-gated yet.
          </p>
        </Container>
      </div>

      <main className="min-h-screen bg-ink-900 py-16">
        <Container>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <Eyebrow>Admin</Eyebrow>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/prompts">Prompt library</Link>
            </Button>
          </div>
          <p className="mt-4 max-w-2xl font-mono text-[12px] leading-relaxed text-cream-500">
            Admin / operator side of the pipeline — process client requests from
            transcription through to a locked, dispatched report.
          </p>
          <h1 className="mt-5 font-serif text-3xl text-cream-100 md:text-4xl">
            Request pipeline
          </h1>
          <p className="mt-3 max-w-xl text-[15px] text-cream-300">
            Every submitted request, newest first. Each card advances through
            its stages in place — transcribe, generate, then finalize &amp;
            lock — without moving between lists.
          </p>

          <AdminKeysProvider>
            <div className="mt-8">
              <AdminKeysPanel />
            </div>
            <div className="mt-6">
              <AdminPipelineList initialRows={rows} />
            </div>
          </AdminKeysProvider>
        </Container>
      </main>
    </>
  );
}
