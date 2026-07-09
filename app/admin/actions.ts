"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { transcribeSourceFile } from "@/lib/transcription";
import {
  generateReportContent,
  type GeneratedReport,
  type ReportGenerationBudget,
} from "@/lib/report-generation";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// Auth is mocked in this build and there's no admin identity, so the
// specialist who locks a report is recorded as a fixed "admin". Real auth
// would replace this with the signed-in reviewer.
const LOCKED_BY = "admin";

export async function runTranscription(
  meetingRequestId: string
): Promise<ActionResult<{ rawText: string; speakerCount: number }>> {
  const meetingRequest = await prisma.meetingRequest.findUnique({
    where: { id: meetingRequestId },
    include: { sourceFiles: true },
  });

  if (!meetingRequest) {
    return { ok: false, error: "Meeting request not found." };
  }
  const primaryFile = meetingRequest.sourceFiles.find(
    (f) => f.role === "PRIMARY_MEETING"
  );
  if (!primaryFile) {
    return { ok: false, error: "No source file uploaded for this request." };
  }

  await prisma.meetingRequest.update({
    where: { id: meetingRequestId },
    data: { status: "TRANSCRIBING" },
  });

  try {
    const { rawText, speakerLabels, source } = await transcribeSourceFile(
      primaryFile
    );

    await prisma.transcript.upsert({
      where: { sourceFileId: primaryFile.id },
      update: { rawText, speakerLabels, source },
      create: {
        sourceFileId: primaryFile.id,
        rawText,
        speakerLabels,
        source,
      },
    });

    await prisma.meetingRequest.update({
      where: { id: meetingRequestId },
      data: { status: "IN_REVIEW" },
    });

    return { ok: true, data: { rawText, speakerCount: speakerLabels.length } };
  } catch (error) {
    // Revert to SUBMITTED — there's no dedicated "failed" status in the
    // schema, so the row goes back to the queue and the error is surfaced
    // to the caller for display instead of being persisted.
    await prisma.meetingRequest.update({
      where: { id: meetingRequestId },
      data: { status: "SUBMITTED" },
    });

    const message =
      error instanceof Error ? error.message : "Transcription failed.";
    return { ok: false, error: message };
  }
}

export async function runReportGeneration(
  meetingRequestId: string,
  budget?: ReportGenerationBudget
): Promise<ActionResult<GeneratedReport>> {
  const meetingRequest = await prisma.meetingRequest.findUnique({
    where: { id: meetingRequestId },
  });
  if (!meetingRequest) {
    return { ok: false, error: "Meeting request not found." };
  }

  await prisma.meetingRequest.update({
    where: { id: meetingRequestId },
    data: { status: "GENERATING" },
  });

  try {
    const generated = await generateReportContent(meetingRequestId, budget);

    const report = await prisma.report.upsert({
      where: { meetingRequestId },
      update: {
        tier: meetingRequest.tier,
        outputLanguage: meetingRequest.outputLanguage,
        content: generated.content,
        speakerAnalytics: generated.speakerAnalytics,
        numericalData: generated.numericalData,
        generatedBy: generated.generatedBy,
        status: "DRAFT",
      },
      create: {
        meetingRequestId,
        tier: meetingRequest.tier,
        outputLanguage: meetingRequest.outputLanguage,
        content: generated.content,
        speakerAnalytics: generated.speakerAnalytics,
        numericalData: generated.numericalData,
        generatedBy: generated.generatedBy,
        status: "DRAFT",
      },
    });

    // Re-generation replaces findings wholesale rather than merging —
    // stale findings from a previous draft shouldn't linger next to fresh
    // ones from a re-run.
    await prisma.complianceFinding.deleteMany({ where: { reportId: report.id } });
    if (generated.complianceFindings.length > 0) {
      await prisma.complianceFinding.createMany({
        data: generated.complianceFindings.map((f) => ({
          reportId: report.id,
          category: f.category,
          riskLevel: f.riskLevel,
          description: f.description,
          ruleReference: f.ruleReference,
          impactDescription: f.impactDescription,
          confidence: f.confidence,
        })),
      });
    }

    await prisma.meetingRequest.update({
      where: { id: meetingRequestId },
      data: { status: "IN_REVIEW" },
    });

    return { ok: true, data: generated };
  } catch (error) {
    // Report generation failed — back to IN_REVIEW (where it started) so
    // it's retryable from the same admin row, error surfaced to the caller.
    await prisma.meetingRequest.update({
      where: { id: meetingRequestId },
      data: { status: "IN_REVIEW" },
    });

    const message =
      error instanceof Error ? error.message : "Report generation failed.";
    return { ok: false, error: message };
  }
}

// Locks a drafted report: freezes the draft (Report.status LOCKED, stamps
// lockedAt/lockedBy) and moves the meeting request to LOCKED. This is the
// step that makes a report eligible to surface as the public /samples
// entry. Idempotent-ish: re-locking an already-locked report is a no-op
// that just returns the current lock metadata.
export async function lockReport(
  meetingRequestId: string
): Promise<ActionResult<{ status: string; lockedAt: string; lockedBy: string }>> {
  const report = await prisma.report.findUnique({
    where: { meetingRequestId },
  });
  if (!report) {
    return { ok: false, error: "No report to lock for this request." };
  }
  if (report.status === "LOCKED") {
    return {
      ok: true,
      data: {
        status: report.status,
        lockedAt: (report.lockedAt ?? report.updatedAt).toISOString(),
        lockedBy: report.lockedBy ?? LOCKED_BY,
      },
    };
  }

  const lockedAt = new Date();
  const [locked] = await prisma.$transaction([
    prisma.report.update({
      where: { id: report.id },
      data: { status: "LOCKED", lockedAt, lockedBy: LOCKED_BY },
    }),
    prisma.meetingRequest.update({
      where: { id: meetingRequestId },
      data: { status: "LOCKED" },
    }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/samples");
  revalidatePath(`/report/${report.id}`);

  return {
    ok: true,
    data: {
      status: locked.status,
      lockedAt: (locked.lockedAt ?? lockedAt).toISOString(),
      lockedBy: locked.lockedBy ?? LOCKED_BY,
    },
  };
}
