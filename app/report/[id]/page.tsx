import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/nav";
import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";
import { ReportViewer } from "@/components/report/report-viewer";
import type {
  ReportContent,
  SpeakerAnalytics,
  NumericalData,
} from "@/lib/report-generation";

// Some early seed/fixture rows predate the current ReportContent schema
// (e.g. attendance as a summary object instead of an array, agendaItems as
// plain strings) — the viewer is built against the real generation
// pipeline's shape, so guard against those here rather than crashing.
function isRenderableContent(content: unknown): content is ReportContent {
  if (!content || typeof content !== "object") return false;
  const c = content as Record<string, unknown>;
  const coverInfo = c.coverInfo as Record<string, unknown> | undefined;
  return (
    typeof coverInfo?.meetingTitle === "string" &&
    typeof coverInfo?.company === "string" &&
    Array.isArray(c.attendance) &&
    Array.isArray(c.agendaItems) &&
    Array.isArray(c.discussionLog) &&
    Array.isArray(c.decisions) &&
    Array.isArray(c.votes) &&
    Array.isArray(c.proceduralNotes)
  );
}

export default async function ReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: { meetingRequest: true },
  });

  if (!report) {
    notFound();
  }

  if (!isRenderableContent(report.content)) {
    return (
      <>
        <Nav />
        <main className="min-h-screen bg-ink-900 py-16">
          <Container>
            <Eyebrow>Report</Eyebrow>
            <h1 className="mt-5 font-serif text-3xl text-cream-100">
              {report.meetingRequest.title}
            </h1>
            <p className="mt-4 max-w-md text-[15px] text-cream-300">
              This report was generated in an older, incompatible format and
              can&apos;t be rendered by the current viewer. Re-run report
              generation for this meeting request to view it here.
            </p>
          </Container>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-ink-900 py-12 md:py-16">
        <ReportViewer
          reportId={report.id}
          content={report.content as unknown as ReportContent}
          speakerAnalytics={report.speakerAnalytics as unknown as SpeakerAnalytics}
          numericalData={report.numericalData as unknown as NumericalData}
          tier={report.tier}
          status={report.status}
          generatedBy={report.generatedBy}
        />
      </main>
    </>
  );
}
