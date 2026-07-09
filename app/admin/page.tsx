import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/nav";
import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";
import { AdminSubmittedList } from "@/components/admin-submitted-list";

export default async function AdminPage() {
  const submitted = await prisma.meetingRequest.findMany({
    where: { status: "SUBMITTED" },
    include: { sourceFile: true, user: true },
    orderBy: { createdAt: "asc" },
  });

  const rows = submitted.map((mr) => ({
    id: mr.id,
    title: mr.title,
    company: mr.company,
    tier: mr.tier,
    ownerEmail: mr.user.email,
    createdAt: mr.createdAt.toISOString(),
    sourceFile: mr.sourceFile
      ? { fileName: mr.sourceFile.fileName, type: mr.sourceFile.type }
      : null,
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
        </Container>
      </main>
    </>
  );
}
