import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/nav";
import { Container } from "@/components/container";
import Link from "next/link";
import { Eyebrow } from "@/components/eyebrow";
import { Button } from "@/components/ui/button";
import { AdminSubmittedList } from "@/components/admin-submitted-list";
import { AdminReviewList } from "@/components/admin-review-list";
import { AdminCompletedList } from "@/components/admin-completed-list";

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
  const submitted = await prisma.meetingRequest.findMany({
    where: { status: "SUBMITTED" },
    include: { sourceFiles: true, user: true },
    orderBy: { createdAt: "asc" },
  });

  const rows = submitted.map((mr) => {
    const primary = mr.sourceFiles.find((f) => f.role === "PRIMARY_MEETING");
    const supportingCount = mr.sourceFiles.filter(
      (f) => f.role === "SUPPORTING_DOCUMENT"
    ).length;

    return {
      id: mr.id,
      title: mr.title,
      company: mr.company,
      tier: mr.tier,
      ownerEmail: mr.user.email,
      createdAt: mr.createdAt.toISOString(),
      sourceFile: primary
        ? { fileName: primary.fileName, type: primary.type }
        : null,
      supportingCount,
      files: toFileLinks(mr.sourceFiles),
    };
  });

  const inReview = await prisma.meetingRequest.findMany({
    where: { status: "IN_REVIEW", report: null },
    include: { sourceFiles: { include: { transcript: true } }, user: true },
    orderBy: { createdAt: "asc" },
  });

  const reviewRows = inReview
    .filter((mr) =>
      mr.sourceFiles.some((f) => f.role === "PRIMARY_MEETING" && f.transcript)
    )
    .map((mr) => ({
      id: mr.id,
      title: mr.title,
      company: mr.company,
      tier: mr.tier,
      ownerEmail: mr.user.email,
      supportingCount: mr.sourceFiles.filter(
        (f) => f.role === "SUPPORTING_DOCUMENT"
      ).length,
      files: toFileLinks(mr.sourceFiles),
    }));

  const withReport = await prisma.meetingRequest.findMany({
    where: { report: { isNot: null } },
    include: { report: true, user: true },
    orderBy: { updatedAt: "desc" },
  });

  const completedRows = withReport.map((mr) => ({
    meetingRequestId: mr.id,
    reportId: mr.report!.id,
    title: mr.title,
    company: mr.company,
    ownerEmail: mr.user.email,
    tier: mr.tier,
    reportStatus: mr.report!.status,
    lockedBy: mr.report!.lockedBy,
    meetingRequestStatus: mr.status,
  }));

  return (
    <>
      <Nav />
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
            Submitted requests
          </h1>
          <p className="mt-3 max-w-xl text-[15px] text-cream-300">
            Meeting requests waiting on transcription. Running it sends the
            source file to Deepgram (or extracts text directly for DOCX/PDF)
            and moves the request into review.
          </p>

          <div className="mt-10">
            <AdminSubmittedList initialRows={rows} />
          </div>

          <h2 className="mt-16 font-serif text-2xl text-cream-100 md:text-3xl">
            Ready for report generation
          </h2>
          <p className="mt-3 max-w-xl text-[15px] text-cream-300">
            Transcribed requests without a report yet. Generation sends the
            transcript and any supporting documents to the model and drafts
            the full structured report — this takes real time.
          </p>

          <div className="mt-10">
            <AdminReviewList initialRows={reviewRows} />
          </div>

          <h2 className="mt-16 font-serif text-2xl text-cream-100 md:text-3xl">
            Completed reports
          </h2>
          <p className="mt-3 max-w-xl text-[15px] text-cream-300">
            Drafted reports, ready to view in the report viewer. Locking a
            report freezes the draft, stamps the sign-off, and makes it
            eligible to appear as the public sample.
          </p>

          <div className="mt-10">
            <AdminCompletedList initialRows={completedRows} />
          </div>
        </Container>
      </main>
    </>
  );
}
