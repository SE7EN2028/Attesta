import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import {
  isRenderableReportContent,
  type ReportContent,
} from "@/lib/report-generation";
import { synthesizeSummaryAudio } from "@/lib/tts";

// Deepgram TTS is a plain REST call returning audio bytes — force the Node
// runtime (Buffer / streaming), same as the pptx export route.
export const runtime = "nodejs";

// Returns an already-generated report's executive summary as spoken audio (MP3).
// Fast path: if the report has a pre-generated summaryAudioUrl (created at
// generation time), redirect straight to it — no synthesis. Slow path (old
// reports / pre-gen failed): synthesize on demand, then best-effort cache the
// result onto the report so the next play is instant. Read-only w.r.t. the
// generation/transcription/dispatch pipeline. Access model matches /report/[id]
// and the pptx route (reachable by id, no owner gating — auth is deferred).
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const report = await prisma.report.findUnique({
    where: { id: params.id },
    select: { content: true, outputLanguage: true, summaryAudioUrl: true },
  });
  if (!report) {
    return new Response("Report not found.", { status: 404 });
  }

  // Fast path: already synthesized and stored — send them straight to it.
  if (report.summaryAudioUrl) {
    return Response.redirect(report.summaryAudioUrl, 302);
  }

  if (!isRenderableReportContent(report.content)) {
    return new Response("This report can't be read aloud.", { status: 422 });
  }
  const summary = (report.content as ReportContent).executiveSummary?.trim();
  if (!summary) {
    return new Response("This report has no executive summary.", {
      status: 422,
    });
  }

  let audio: Buffer;
  try {
    audio = await synthesizeSummaryAudio(summary, report.outputLanguage);
  } catch {
    return new Response("Text-to-speech is temporarily unavailable.", {
      status: 502,
    });
  }

  // Best-effort cache: store to Blob + record the URL so the next play is
  // instant. Never block the response on caching.
  try {
    const { url } = await put(`report-tts/${params.id}.mp3`, audio, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
    });
    await prisma.report.update({
      where: { id: params.id },
      data: { summaryAudioUrl: url },
    });
  } catch (error) {
    console.error(
      `[listen] failed to cache summary audio for ${params.id}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }

  return new Response(new Uint8Array(audio), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(audio.length),
      "Cache-Control": "private, no-store",
    },
  });
}
