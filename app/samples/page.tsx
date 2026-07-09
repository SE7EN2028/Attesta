import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/nav";
import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";
import { Button } from "@/components/ui/button";
import { ReportViewer } from "@/components/report/report-viewer";
import {
  isRenderableReportContent,
  type ReportContent,
  type SpeakerAnalytics,
  type NumericalData,
} from "@/lib/report-generation";

// The public sample is a curated, locked report — never "whatever got
// locked last", so a throwaway test lock can't front the marketing page.
// A pinned SAMPLE_REPORT_ID (defaults to the substantive "hi" CSE report)
// wins when it's locked + renderable; otherwise fall back to the most
// recently locked renderable report. Locking is what makes a report
// eligible here (see lockReport in app/admin/actions.ts); legacy-shape seed
// rows are skipped by the renderable guard.
const SAMPLE_REPORT_ID =
  process.env.SAMPLE_REPORT_ID ?? "cmrdo676y0000dfv76xrnwj0p";

async function findSampleReport() {
  const locked = await prisma.report.findMany({
    where: { status: "LOCKED" },
    orderBy: { updatedAt: "desc" },
    include: { meetingRequest: true },
  });
  const renderable = locked.filter((r) =>
    isRenderableReportContent(r.content)
  );
  const pinned = renderable.find((r) => r.id === SAMPLE_REPORT_ID);
  return pinned ?? renderable[0] ?? null;
}

export default async function SamplesPage() {
  const report = await findSampleReport();

  if (!report) {
    return (
      <>
        <Nav />
        <main className="flex min-h-screen items-center justify-center bg-ink-900 px-6">
          <div className="text-center">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-rust-400">
              Coming soon
            </p>
            <h1 className="mt-4 font-serif text-4xl text-cream-100">
              Sample reports
            </h1>
            <p className="mt-3 text-[15px] text-cream-400">
              No locked report is available to show yet.
            </p>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-ink-900 py-12 md:py-16">
        <Container>
          <div className="rounded-md border border-cream-200/10 bg-ink-850 p-6">
            <Eyebrow>The sample report</Eyebrow>
            <h1 className="mt-4 max-w-2xl font-serif text-2xl leading-[1.15] text-cream-100 md:text-3xl">
              A real, locked report — never client data.
            </h1>
            <p className="mt-3 max-w-2xl text-[15px] leading-[1.6] text-cream-300">
              No registration, no email. Flip through with the arrows or your
              keyboard. Look for the things that matter: votes pulled out
              automatically, speaker analytics, the sign-off block, and the
              full compliance audit.
            </p>
            <div className="mt-5">
              <Button asChild size="sm">
                <Link href="/create">Run your own preview</Link>
              </Button>
            </div>
          </div>
        </Container>

        <div className="mt-8">
          <ReportViewer
            reportId={report.id}
            content={report.content as unknown as ReportContent}
            speakerAnalytics={
              report.speakerAnalytics as unknown as SpeakerAnalytics
            }
            numericalData={report.numericalData as unknown as NumericalData}
            tier={report.tier}
            status={report.status}
            generatedBy={report.generatedBy}
            region={report.meetingRequest.region}
          />
        </div>
      </main>
    </>
  );
}
