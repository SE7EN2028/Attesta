"use server";

import { prisma } from "@/lib/prisma";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// The live demo path (/try) runs transcription + generation, then needs the
// resulting report's id to redirect to /report/[id]. Reports are keyed by
// meetingRequestId (unique), so this is a direct lookup — kept separate from
// the admin actions so those stay untouched.
export async function getReportIdForRequest(
  meetingRequestId: string
): Promise<ActionResult<{ reportId: string }>> {
  const report = await prisma.report.findUnique({
    where: { meetingRequestId },
    select: { id: true },
  });
  if (!report) {
    return { ok: false, error: "No report found for this request." };
  }
  return { ok: true, data: { reportId: report.id } };
}
