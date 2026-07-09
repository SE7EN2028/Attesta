"use server";

import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getSessionUserId, setSessionUserId } from "@/lib/session";

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

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

  const meetingRequest = await prisma.meetingRequest.create({
    data: {
      userId,
      company: company.trim(),
      region: region.trim(),
      governingBody: governingBody.trim(),
      meetingDate: parsedDate,
      title: title.trim(),
      outputLanguage: outputLanguage.trim(),
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
): Promise<ActionResult<{ fileName: string; type: string }>> {
  const userId = getSessionUserId();
  if (!userId) return { ok: false, error: "Sign up first." };

  const meetingRequestId = String(formData.get("meetingRequestId") || "");
  const file = formData.get("file");

  if (!meetingRequestId) {
    return { ok: false, error: "Missing meeting request." };
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

  const safeFileName = file.name.replace(/[/\\]/g, "_");
  const dir = path.join(process.cwd(), "uploads", meetingRequestId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, safeFileName),
    Buffer.from(await file.arrayBuffer())
  );

  const storageUrl = `/uploads/${meetingRequestId}/${safeFileName}`;

  const sourceFile = await prisma.sourceFile.upsert({
    where: { meetingRequestId },
    update: { type, fileName: safeFileName, storageUrl },
    create: { meetingRequestId, type, fileName: safeFileName, storageUrl },
  });

  return {
    ok: true,
    data: { fileName: sourceFile.fileName, type: sourceFile.type },
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
    include: { sourceFile: true },
  });
  if (!existing) {
    return { ok: false, error: "Meeting request not found." };
  }
  if (!existing.sourceFile) {
    return { ok: false, error: "Upload a source file first." };
  }

  const updated = await prisma.meetingRequest.update({
    where: { id: meetingRequestId },
    data: { tier, notes: notes.trim() || null, status: "SUBMITTED" },
  });

  return { ok: true, data: { id: updated.id } };
}
