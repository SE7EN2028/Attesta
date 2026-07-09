import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/nav";
import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";
import { AdminSubmittedList } from "@/components/admin-submitted-list";
import { AdminReviewList } from "@/components/admin-review-list";

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
    }));

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-ink-900 py-16">
        <Container>
          <Eyebrow>Admin</Eyebrow>
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
        </Container>
      </main>
    </>
  );
}
