"use server";

import { prisma } from "@/lib/prisma";
import { transcribeSourceFile } from "@/lib/transcription";
import {
  generateReportContent,
  type GeneratedReport,
} from "@/lib/report-generation";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

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
  meetingRequestId: string
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
    const generated = await generateReportContent(meetingRequestId);

    await prisma.report.upsert({
      where: { meetingRequestId },
      update: {
        tier: meetingRequest.tier,
        outputLanguage: meetingRequest.outputLanguage,
        content: generated.content,
        speakerAnalytics: generated.speakerAnalytics,
        numericalData: generated.numericalData,
        status: "DRAFT",
      },
      create: {
        meetingRequestId,
        tier: meetingRequest.tier,
        outputLanguage: meetingRequest.outputLanguage,
        content: generated.content,
        speakerAnalytics: generated.speakerAnalytics,
        numericalData: generated.numericalData,
        status: "DRAFT",
      },
    });

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
