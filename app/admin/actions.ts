"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { transcribeSourceFile } from "@/lib/transcription";
import { sendReportReadyEmail } from "@/lib/email";
import {
  generateReportContent,
  isRenderableReportContent,
  type GeneratedReport,
  type ReportContent,
  type ReportGenerationBudget,
} from "@/lib/report-generation";

export type ActionResult<T> =
  | { ok: true; data: T; emailWarning?: string }
  | { ok: false; error: string };

// Auth is mocked in this build and there's no admin identity, so the
// specialist who locks a report is recorded as a fixed "admin". Real auth
// would replace this with the signed-in reviewer.
const LOCKED_BY = "admin";

export async function runTranscription(
  meetingRequestId: string,
  opts?: { force?: boolean; deepgramKey?: string }
): Promise<ActionResult<{ rawText: string; speakerCount: number }>> {
  const meetingRequest = await prisma.meetingRequest.findUnique({
    where: { id: meetingRequestId },
    include: { sourceFiles: { include: { transcript: true } } },
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

  // Reuse a transcript already produced earlier (e.g. by the compliance
  // snapshot step) instead of re-running Deepgram — unless a re-run is forced
  // (admin's "Re-run transcription"). Keeps a full /try run to one Deepgram call.
  if (!opts?.force && primaryFile.transcript) {
    await prisma.meetingRequest.update({
      where: { id: meetingRequestId },
      data: { status: "IN_REVIEW" },
    });
    const labels = primaryFile.transcript.speakerLabels;
    return {
      ok: true,
      data: {
        rawText: primaryFile.transcript.rawText,
        speakerCount: Array.isArray(labels) ? labels.length : 0,
      },
    };
  }

  await prisma.meetingRequest.update({
    where: { id: meetingRequestId },
    data: { status: "TRANSCRIBING" },
  });

  try {
    const { rawText, speakerLabels, source } = await transcribeSourceFile(
      primaryFile,
      opts?.deepgramKey
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
  budget?: ReportGenerationBudget,
  geminiKey?: string
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
    const generated = await generateReportContent(
      meetingRequestId,
      budget,
      geminiKey
    );

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
// lockedAt/lockedBy) and dispatches an email to the client. Moves the meeting
// request from IN_REVIEW → LOCKED (initial lock) or from LOCKED → DISPATCHED
// (email sent). This is the step that makes a report eligible to surface as
// the public /samples entry.
export async function lockReport(
  meetingRequestId: string
): Promise<
  ActionResult<{
    status: string;
    lockedAt: string;
    lockedBy: string;
    dispatched?: boolean;
  }>
> {
  const report = await prisma.report.findUnique({
    where: { meetingRequestId },
    include: { meetingRequest: { include: { user: true } } },
  });
  if (!report) {
    return { ok: false, error: "No report to lock for this request." };
  }

  // Already locked — retry email send if not yet dispatched.
  if (report.status === "LOCKED") {
    if (report.meetingRequest.status === "DISPATCHED") {
      return {
        ok: true,
        data: {
          status: report.status,
          lockedAt: (report.lockedAt ?? report.updatedAt).toISOString(),
          lockedBy: report.lockedBy ?? LOCKED_BY,
          dispatched: true,
        },
      };
    }
    // Retry path: attempt to send email and promote to DISPATCHED.
    const emailResult = await sendReportReadyEmail({
      to: report.meetingRequest.user.email,
      clientName: report.meetingRequest.user.companyName,
      companyName: report.meetingRequest.company,
      meetingTitle: report.meetingRequest.title,
      reportUrl: `${process.env.APP_URL}/report/${report.id}`,
    });

    if (emailResult.ok) {
      await prisma.$transaction([
        prisma.meetingRequest.update({
          where: { id: meetingRequestId },
          data: { status: "DISPATCHED" },
        }),
        prisma.report.update({
          where: { id: report.id },
          data: { dispatchedAt: new Date() },
        }),
      ]);
      revalidatePath("/admin");
      return {
        ok: true,
        data: {
          status: report.status,
          lockedAt: (report.lockedAt ?? report.updatedAt).toISOString(),
          lockedBy: report.lockedBy ?? LOCKED_BY,
          dispatched: true,
        },
      };
    } else {
      return {
        ok: true,
        data: {
          status: report.status,
          lockedAt: (report.lockedAt ?? report.updatedAt).toISOString(),
          lockedBy: report.lockedBy ?? LOCKED_BY,
          dispatched: false,
        },
        emailWarning: `Email send failed: ${emailResult.error}. Click again to retry.`,
      };
    }
  }

  // Fresh lock: DB lock first, then attempt email.
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

  // Email dispatch (best-effort, non-blocking).
  let emailWarning: string | undefined;
  const emailResult = await sendReportReadyEmail({
    to: report.meetingRequest.user.email,
    clientName: report.meetingRequest.user.companyName,
    companyName: report.meetingRequest.company,
    meetingTitle: report.meetingRequest.title,
    reportUrl: `${process.env.APP_URL}/report/${report.id}`,
  });

  if (emailResult.ok) {
    // Email succeeded — mark as DISPATCHED.
    await prisma.$transaction([
      prisma.meetingRequest.update({
        where: { id: meetingRequestId },
        data: { status: "DISPATCHED" },
      }),
      prisma.report.update({
        where: { id: report.id },
        data: { dispatchedAt: new Date() },
      }),
    ]);
  } else {
    // Email failed — stay at LOCKED, attach warning.
    emailWarning = `Email send failed: ${emailResult.error}. Click again to retry.`;
  }

  revalidatePath("/admin");
  revalidatePath("/samples");
  revalidatePath(`/report/${report.id}`);

  return {
    ok: true,
    data: {
      status: locked.status,
      lockedAt: (locked.lockedAt ?? lockedAt).toISOString(),
      lockedBy: locked.lockedBy ?? LOCKED_BY,
      dispatched: emailResult.ok,
    },
    emailWarning,
  };
}

// Saves reviewer edits to a DRAFT report's content — the "edit before lock"
// step. Content-only: unlike runReportGeneration (which re-runs the model and
// deletes+recreates compliance findings), this touches Report.content ONLY and
// never re-transcribes, re-generates, or disturbs findings / speakerAnalytics /
// numericalData / status. Rejected once locked — a locked report is frozen.
// (A later re-generate still overwrites these manual edits; no versioning yet.)
export async function saveReportContent(
  reportId: string,
  content: ReportContent
): Promise<ActionResult<{ id: string }>> {
  const report = await prisma.report.findUnique({ where: { id: reportId } });
  if (!report) {
    return { ok: false, error: "Report not found." };
  }
  if (report.status === "LOCKED") {
    return { ok: false, error: "Locked reports can't be edited." };
  }
  // Guard the incoming shape with the same predicate the renderer trusts, so a
  // malformed payload can't be persisted and later break /report or /samples.
  if (!isRenderableReportContent(content)) {
    return { ok: false, error: "Edited content is missing required fields." };
  }

  // Coerce vote/agenda numbers defensively — number <input> can yield NaN /
  // strings from the client; the renderer and charts expect finite numbers.
  const coerced: ReportContent = {
    ...content,
    agendaItems: content.agendaItems.map((a) => ({
      ...a,
      order: toInt(a.order),
    })),
    discussionLog: content.discussionLog.map((d) => ({
      ...d,
      agendaItemRef: d.agendaItemRef == null ? null : toInt(d.agendaItemRef),
    })),
    decisions: content.decisions.map((d) => ({
      ...d,
      agendaItemRef: d.agendaItemRef == null ? null : toInt(d.agendaItemRef),
    })),
    votes: content.votes.map((v) => ({
      ...v,
      agendaItemRef: v.agendaItemRef == null ? null : toInt(v.agendaItemRef),
      forCount: toInt(v.forCount),
      againstCount: toInt(v.againstCount),
      abstainCount: toInt(v.abstainCount),
    })),
  };

  try {
    await prisma.report.update({
      where: { id: reportId },
      data: { content: coerced },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save edits.";
    return { ok: false, error: message };
  }

  revalidatePath(`/report/${reportId}`);
  revalidatePath("/samples");
  revalidatePath("/admin");
  return { ok: true, data: { id: reportId } };
}

function toInt(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}
