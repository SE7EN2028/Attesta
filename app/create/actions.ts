"use server";

import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getSessionUserId, setSessionUserId } from "@/lib/session";
import { extractPlainText } from "@/lib/transcription";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

type SourceFileRole = "PRIMARY_MEETING" | "SUPPORTING_DOCUMENT";

const SOURCE_FILE_TYPE_BY_EXTENSION: Record<string, "AUDIO" | "VIDEO" | "DOCX" | "PDF"> = {
  ".mp3": "AUDIO",
  ".wav": "AUDIO",
  ".m4a": "AUDIO",
  ".mp4": "VIDEO",
  ".docx": "DOCX",
  ".pdf": "PDF",
};

export async function signUp(input: {
  email: string;
  companyName: string;
}): Promise<ActionResult<{ id: string; email: string; companyName: string }>> {
  const email = input.email.trim().toLowerCase();
  const companyName = input.companyName.trim();

  if (!email || !email.includes("@")) {
    return { ok: false, error: "Enter a valid email." };
  }
  if (!companyName) {
    return { ok: false, error: "Company name is required." };
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: { companyName },
    create: { email, companyName },
  });

  setSessionUserId(user.id);

  return {
    ok: true,
    data: { id: user.id, email: user.email, companyName: user.companyName },
  };
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

  // Each file lives in its own dir keyed by SourceFile id so supporting
  // docs with the same original filename never collide on disk.
  const dir = path.join(process.cwd(), "uploads", meetingRequestId, sourceFile.id);
  await fs.mkdir(dir, { recursive: true });
  const absolutePath = path.join(dir, safeFileName);
  await fs.writeFile(absolutePath, buffer);
  const storageUrl = `/uploads/${meetingRequestId}/${sourceFile.id}/${safeFileName}`;

  // Supporting documents don't get transcribed — just pull their text now
  // so it's ready to feed into report generation later.
  const extractedText =
    role === "SUPPORTING_DOCUMENT"
      ? await extractPlainText(absolutePath, type as "DOCX" | "PDF")
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

  return { ok: true, data: { id: updated.id } };
}
