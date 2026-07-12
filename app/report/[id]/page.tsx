import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/nav";
import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";
import { ReportViewer } from "@/components/report/report-viewer";
import {
  isRenderableReportContent,
  type ReportContent,
  type SpeakerAnalytics,
  type NumericalData,
} from "@/lib/report-generation";

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

  if (!isRenderableReportContent(report.content)) {
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
          region={report.meetingRequest.region}
          listenSrc={report.summaryAudioUrl ?? undefined}
        />
      </main>
    </>
  );
}
