"use server";

import { prisma } from "@/lib/prisma";
import { transcribeSourceFile } from "@/lib/transcription";

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
