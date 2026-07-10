import { prisma } from "@/lib/prisma";
import { isRenderableReportContent } from "@/lib/report-generation";

// The public sample is a curated, locked report — never "whatever got locked
// last", so a throwaway test lock can't front the marketing page. A pinned
// SAMPLE_REPORT_ID (defaults to the substantive "hi" CSE report) wins when it's
// locked + renderable; otherwise fall back to the most recently locked
// renderable report. Locking is what makes a report eligible here (see
// lockReport in app/admin/actions.ts); legacy-shape seed rows are skipped by
// the renderable guard.
//
// Shared by /samples and the landing page's #sample-report section so both
// show the same real report.
export const SAMPLE_REPORT_ID =
  process.env.SAMPLE_REPORT_ID ?? "cmrdo676y0000dfv76xrnwj0p";

export async function findSampleReport() {
  const locked = await prisma.report.findMany({
    where: { status: "LOCKED" },
    orderBy: { updatedAt: "desc" },
    include: { meetingRequest: true },
  });
  const renderable = locked.filter((r) => isRenderableReportContent(r.content));
  const pinned = renderable.find((r) => r.id === SAMPLE_REPORT_ID);
  return pinned ?? renderable[0] ?? null;
}
