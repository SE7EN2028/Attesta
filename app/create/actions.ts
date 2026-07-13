"use server";

import path from "path";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import {
  getSessionUserId,
  setSessionUserId,
  PENDING_COOKIE,
} from "@/lib/session";
import {
  generateSignInToken,
  hashSignInToken,
  generateMatchCode,
} from "@/lib/auth-token";
import { sendSignInLinkEmail } from "@/lib/email";
import { extractPlainText, transcribeSourceFile } from "@/lib/transcription";
import {
  generateComplianceSnapshot,
  type ComplianceSnapshot,
  type SpeakerLabel,
} from "@/lib/report-generation";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

// The Instant Compliance Snapshot result: the model's three analytical blocks
// plus the meeting metadata the read-only view needs to render.
export type SnapshotResult = ComplianceSnapshot & {
  meetingTitle: string;
  company: string;
  region: string;
  governingBody: string;
  meetingDate: string;
};

type SourceFileRole = "PRIMARY_MEETING" | "SUPPORTING_DOCUMENT";

const SOURCE_FILE_TYPE_BY_EXTENSION: Record<string, "AUDIO" | "VIDEO" | "DOCX" | "PDF"> = {
  ".mp3": "AUDIO",
  ".wav": "AUDIO",
  ".m4a": "AUDIO",
  ".mp4": "VIDEO",
  ".docx": "DOCX",
  ".pdf": "PDF",
};

// Passwordless sign-in: emails a single-use, 20-minute magic link. The User row
// is NOT created here and NO session is issued — that happens only when the
// link is verified (app/auth/verify), so possessing the inbox is what proves
// identity. The companyName is stashed on the token and applied on verify.
export async function requestSignInLink(input: {
  email: string;
  companyName: string;
}): Promise<ActionResult<{ email: string; code: string }>> {
  const email = input.email.trim().toLowerCase();
  const companyName = input.companyName.trim();

  if (!email || !email.includes("@")) {
    return { ok: false, error: "Enter a valid email." };
  }
  if (!companyName) {
    return { ok: false, error: "Company name is required." };
  }

  // Cooldown: if a link was issued for this email in the last 45s, don't send
  // another — prevents email-bombing and avoids leaking whether the address is
  // known. Return the existing code so this device shows the right one.
  const recent = await prisma.signInToken.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  });
  if (recent && Date.now() - recent.createdAt.getTime() < 45_000) {
    return { ok: true, data: { email, code: recent.code ?? "" } };
  }

  const rawToken = generateSignInToken();
  const tokenHash = hashSignInToken(rawToken);
  const rawPending = generateSignInToken();
  const pendingHash = hashSignInToken(rawPending);
  const code = generateMatchCode();
  const expiresAt = new Date(Date.now() + 20 * 60 * 1000);

  // One active link per email.
  await prisma.signInToken.deleteMany({ where: { email } });
  await prisma.signInToken.create({
    data: { tokenHash, pendingHash, code, email, companyName, expiresAt },
  });

  const url = `${process.env.APP_URL}/auth/verify?token=${rawToken}`;
  const sent = await sendSignInLinkEmail({ to: email, url });
  if (!sent.ok) {
    // Don't leave a dangling link if the email failed to send.
    await prisma.signInToken.deleteMany({ where: { tokenHash } });
    return { ok: false, error: "Couldn't send the sign-in email. Try again." };
  }

  // This (requesting) device holds the pending handle so it can claim the
  // session once the link is confirmed — even if confirmed on another device.
  cookies().set(PENDING_COOKIE, rawPending, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 20 * 60,
  });

  return { ok: true, data: { email, code } };
}

// Approves a magic-link token — called ONLY from the "Continue" button on the
// verify interstitial (never on a bare GET, so email-scanner prefetches can't
// burn the link). Signs in THIS device immediately (same-device sign-in) AND
// marks the pending sign-in approved so the original device can claim it by
// polling. The record is deleted when claimed (or on expiry).
export async function completeSignIn(
  token: string
): Promise<ActionResult<{ email: string; code: string | null }>> {
  if (!token) return { ok: false, error: "Missing sign-in token." };

  const row = await prisma.signInToken.findUnique({
    where: { tokenHash: hashSignInToken(token) },
  });
  if (!row || row.expiresAt.getTime() < Date.now()) {
    if (row) {
      await prisma.signInToken.delete({ where: { id: row.id } }).catch(() => {});
    }
    return { ok: false, error: "This sign-in link expired. Request a new one." };
  }

  const user = await prisma.user.upsert({
    where: { email: row.email },
    update: { companyName: row.companyName },
    create: { email: row.email, companyName: row.companyName },
  });
  await prisma.signInToken.update({
    where: { id: row.id },
    data: { approvedUserId: user.id },
  });

  setSessionUserId(user.id);
  return { ok: true, data: { email: user.email, code: row.code } };
}

export async function createDraftMeetingRequest(input: {
  company: string;
  region: string;
  governingBody: string;
  meetingDate: string;
  title: string;
  outputLanguage: string;
  // Passed when the user has stepped back and re-submits the metadata step —
  // update the existing draft in place instead of creating a duplicate.
  meetingRequestId?: string;
}): Promise<ActionResult<{ id: string }>> {
  const userId = getSessionUserId();
  if (!userId) return { ok: false, error: "Sign up first." };

  const { company, region, governingBody, meetingDate, title, outputLanguage } =
    input;

  if (
    !company.trim() ||
    !region.trim() ||
    !governingBody.trim() ||
    !meetingDate.trim() ||
    !title.trim() ||
    !outputLanguage.trim()
  ) {
    return { ok: false, error: "All meeting fields are required." };
  }

  const parsedDate = new Date(meetingDate);
  if (Number.isNaN(parsedDate.getTime())) {
    return { ok: false, error: "Invalid meeting date." };
  }

  const data = {
    company: company.trim(),
    region: region.trim(),
    governingBody: governingBody.trim(),
    meetingDate: parsedDate,
    title: title.trim(),
    outputLanguage: outputLanguage.trim(),
  };

  // Re-editing metadata after stepping back: update the existing owned draft.
  if (input.meetingRequestId) {
    const existing = await prisma.meetingRequest.findFirst({
      where: { id: input.meetingRequestId, userId, status: "DRAFT" },
    });
    if (existing) {
      const updated = await prisma.meetingRequest.update({
        where: { id: existing.id },
        data,
      });
      return { ok: true, data: { id: updated.id } };
    }
  }

  const meetingRequest = await prisma.meetingRequest.create({
    data: {
      userId,
      ...data,
      // Placeholder — the user picks the real tier in step 4; this row
      // exists early only so a SourceFile has somewhere to attach to.
      tier: "ESSENTIAL",
      status: "DRAFT",
    },
  });

  return { ok: true, data: { id: meetingRequest.id } };
}

export async function uploadSourceFile(
  formData: FormData
): Promise<ActionResult<{ id: string; fileName: string; type: string; role: string }>> {
  const userId = getSessionUserId();
  if (!userId) return { ok: false, error: "Sign up first." };

  const meetingRequestId = String(formData.get("meetingRequestId") || "");
  const role = String(formData.get("role") || "PRIMARY_MEETING") as SourceFileRole;
  const file = formData.get("file");

  if (!meetingRequestId) {
    return { ok: false, error: "Missing meeting request." };
  }
  if (role !== "PRIMARY_MEETING" && role !== "SUPPORTING_DOCUMENT") {
    return { ok: false, error: "Invalid file role." };
  }
  if (!(file instanceof File)) {
    return { ok: false, error: "No file provided." };
  }

  const meetingRequest = await prisma.meetingRequest.findFirst({
    where: { id: meetingRequestId, userId },
  });
  if (!meetingRequest) {
    return { ok: false, error: "Meeting request not found." };
  }

  const extension = path.extname(file.name).toLowerCase();
  const type = SOURCE_FILE_TYPE_BY_EXTENSION[extension];
  if (!type) {
    return {
      ok: false,
      error: "Unsupported file type. Use MP3, MP4, WAV, M4A, DOCX or PDF.",
    };
  }
  if (role === "SUPPORTING_DOCUMENT" && type !== "DOCX" && type !== "PDF") {
    return {
      ok: false,
      error: "Supporting documents must be DOCX or PDF.",
    };
  }

  const safeFileName = file.name.replace(/[/\\]/g, "_");
  const buffer = Buffer.from(await file.arrayBuffer());

  // A meeting has at most one primary file — re-uploading replaces it.
  // Supporting documents just accumulate, one row per file.
  let sourceFile =
    role === "PRIMARY_MEETING"
      ? await prisma.sourceFile.findFirst({
          where: { meetingRequestId, role: "PRIMARY_MEETING" },
        })
      : null;

  sourceFile = sourceFile
    ? await prisma.sourceFile.update({
        where: { id: sourceFile.id },
        data: { type, fileName: safeFileName },
      })
    : await prisma.sourceFile.create({
        data: { meetingRequestId, type, role, fileName: safeFileName, storageUrl: "" },
      });

  // Store the file in Vercel Blob (public) — keyed by SourceFile id so
  // supporting docs with the same filename never collide, and re-uploading a
  // primary overwrites in place. storageUrl is the returned public https URL;
  // no local disk (which doesn't survive Vercel's serverless filesystem).
  const { url: storageUrl } = await put(
    `${meetingRequestId}/${sourceFile.id}/${safeFileName}`,
    buffer,
    { access: "public", allowOverwrite: true }
  );

  // Supporting documents don't get transcribed — just pull their text now
  // (from the in-memory buffer) so it's ready to feed into report generation.
  const extractedText =
    role === "SUPPORTING_DOCUMENT"
      ? await extractPlainText(buffer, type as "DOCX" | "PDF")
      : null;

  sourceFile = await prisma.sourceFile.update({
    where: { id: sourceFile.id },
    data: { storageUrl, extractedText },
  });

  return {
    ok: true,
    data: {
      id: sourceFile.id,
      fileName: sourceFile.fileName,
      type: sourceFile.type,
      role: sourceFile.role,
    },
  };
}

export async function submitMeetingRequest(input: {
  meetingRequestId: string;
  tier: "ESSENTIAL" | "SCOPE" | "PREMIUM";
  notes: string;
}): Promise<ActionResult<{ id: string }>> {
  const userId = getSessionUserId();
  if (!userId) return { ok: false, error: "Sign up first." };

  const { meetingRequestId, tier, notes } = input;
  if (!meetingRequestId) {
    return { ok: false, error: "Missing meeting request." };
  }
  if (!["ESSENTIAL", "SCOPE", "PREMIUM"].includes(tier)) {
    return { ok: false, error: "Choose a tier." };
  }

  const existing = await prisma.meetingRequest.findFirst({
    where: { id: meetingRequestId, userId },
    include: { sourceFiles: true },
  });
  if (!existing) {
    return { ok: false, error: "Meeting request not found." };
  }
  const hasPrimaryFile = existing.sourceFiles.some(
    (f) => f.role === "PRIMARY_MEETING"
  );
  if (!hasPrimaryFile) {
    return { ok: false, error: "Upload a source file first." };
  }

  const updated = await prisma.meetingRequest.update({
    where: { id: meetingRequestId },
    data: { tier, notes: notes.trim() || null, status: "SUBMITTED" },
  });

  // Invalidate the admin router cache so a newly submitted request shows up
  // there on navigation without a manual hard refresh.
  revalidatePath("/admin");

  return { ok: true, data: { id: updated.id } };
}

// Instant Compliance Snapshot — runs AFTER upload, BEFORE tier selection.
// Self-contained: transcribes the primary file in-memory (reusing an existing
// transcript if one happens to exist) and generates the lightweight snapshot.
// Deliberately does NOT persist a Transcript or change the request status — it
// is a free read-only preview, not part of the request/report lifecycle. Uses
// the fail-fast budget (short timeout, 2 tries) since the user is waiting.
export async function runComplianceSnapshot(
  meetingRequestId: string
): Promise<ActionResult<SnapshotResult>> {
  const userId = getSessionUserId();
  if (!userId) return { ok: false, error: "Sign up first." };

  const mr = await prisma.meetingRequest.findFirst({
    where: { id: meetingRequestId, userId },
    include: { sourceFiles: { include: { transcript: true } } },
  });
  if (!mr) return { ok: false, error: "Meeting request not found." };

  const primary = mr.sourceFiles.find((f) => f.role === "PRIMARY_MEETING");
  if (!primary) return { ok: false, error: "Upload a source file first." };

  try {
    let transcriptRawText: string;
    let speakerLabels: SpeakerLabel[];
    if (primary.transcript) {
      transcriptRawText = primary.transcript.rawText;
      speakerLabels = primary.transcript.speakerLabels as unknown as SpeakerLabel[];
    } else {
      const t = await transcribeSourceFile(primary);
      transcriptRawText = t.rawText;
      speakerLabels = t.speakerLabels as unknown as SpeakerLabel[];
      // Cache the transcript so the later full-report generation reuses it
      // instead of re-running Deepgram (runTranscription reuses by default).
      await prisma.transcript.upsert({
        where: { sourceFileId: primary.id },
        update: { rawText: t.rawText, speakerLabels: t.speakerLabels, source: t.source },
        create: {
          sourceFileId: primary.id,
          rawText: t.rawText,
          speakerLabels: t.speakerLabels,
          source: t.source,
        },
      });
    }

    const supportingDocsText = mr.sourceFiles
      .filter((f) => f.role === "SUPPORTING_DOCUMENT" && f.extractedText)
      .map((f) => f.extractedText as string)
      .join("\n\n");

    const meetingDate = mr.meetingDate.toISOString().slice(0, 10);
    const snapshot = await generateComplianceSnapshot(
      {
        company: mr.company,
        region: mr.region,
        governingBody: mr.governingBody,
        meetingDate,
        title: mr.title,
        outputLanguage: mr.outputLanguage,
        transcriptRawText,
        speakerLabels,
        supportingDocsText,
      },
      { timeoutMs: 90_000, retries: 2 }
    );

    return {
      ok: true,
      data: {
        ...snapshot,
        meetingTitle: mr.title,
        company: mr.company,
        region: mr.region,
        governingBody: mr.governingBody,
        meetingDate,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Compliance snapshot failed.";
    return { ok: false, error: message };
  }
}
