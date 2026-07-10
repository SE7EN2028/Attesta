import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/nav";
import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";
import { Button } from "@/components/ui/button";
import { ReportEditor } from "@/components/admin/report-editor";
import {
  isRenderableReportContent,
  type ReportContent,
} from "@/lib/report-generation";

// Admin-only edit-before-lock step. Guards here (not just in the action) so a
// locked or legacy-shape report never reaches the client editor at all.
export default async function EditReportPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { meetingRequest: true },
  });

  if (!report) {
    return <NotEditable reason="This report doesn't exist." />;
  }
  if (report.status === "LOCKED") {
    return (
      <NotEditable
        reportId={reportId}
        reason="This report is locked. Locked reports are frozen and can't be edited."
      />
    );
  }
  if (!isRenderableReportContent(report.content)) {
    return (
      <NotEditable
        reportId={reportId}
        reason="This report uses an older format the structured editor can't open. Re-generate it first."
      />
    );
  }

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-ink-900 py-12 md:py-16">
        <Container>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <Eyebrow>Edit before lock · draft</Eyebrow>
              <h1 className="mt-4 font-serif text-2xl text-cream-100 md:text-3xl">
                {report.content.coverInfo.meetingTitle}
              </h1>
              <p className="mt-1 text-[13px] text-cream-400">
                {report.meetingRequest.company}
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin">← Back to admin</Link>
            </Button>
          </div>

          <p className="mt-4 max-w-2xl text-[13px] leading-[1.6] text-cream-500">
            Structured edits to the report body only. Compliance findings,
            speaker analytics and numerical data are unchanged. Re-generating
            this report later overwrites edits made here.
          </p>

          <div className="mt-8">
            <ReportEditor
              reportId={reportId}
              content={report.content as ReportContent}
            />
          </div>
        </Container>
      </main>
    </>
  );
}

function NotEditable({
  reason,
  reportId,
}: {
  reason: string;
  reportId?: string;
}) {
  return (
    <>
      <Nav />
      <main className="flex min-h-screen items-center justify-center bg-ink-900 px-6">
        <div className="max-w-md text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-rust-400">
            Not editable
          </p>
          <h1 className="mt-4 font-serif text-2xl text-cream-100">
            Can&apos;t edit this report
          </h1>
          <p className="mt-3 text-[14.5px] leading-[1.6] text-cream-400">
            {reason}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin">← Back to admin</Link>
            </Button>
            {reportId && (
              <Button asChild size="sm">
                <Link href={`/report/${reportId}`}>View report</Link>
              </Button>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
