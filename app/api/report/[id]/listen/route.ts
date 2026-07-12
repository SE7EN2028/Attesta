import { prisma } from "@/lib/prisma";
import {
  isRenderableReportContent,
  type ReportContent,
} from "@/lib/report-generation";

// Deepgram TTS is a plain REST call returning audio bytes — force the Node
// runtime (Buffer / streaming), same as the pptx export route.
export const runtime = "nodejs";

const DEEPGRAM_SPEAK_URL = "https://api.deepgram.com/v1/speak";

// English Aura-2 voice — always available, used as the universal fallback.
const DEFAULT_VOICE = "aura-2-thalia-en";

// Report `outputLanguage` -> a Deepgram Aura-2 voice where Deepgram offers one.
// Anything not listed falls back to the English default. If a mapped voice is
// rejected by Deepgram (catalog drift), the request retries once with the
// English default so playback still works. Verify/extend against Deepgram's
// current voice catalog: https://developers.deepgram.com/docs/tts-models
const VOICE_BY_LANGUAGE: Record<string, string> = {
  English: DEFAULT_VOICE,
  Español: "aura-2-celeste-es",
};

// Deepgram /v1/speak caps input length per request (~2000 chars). Split the
// summary on sentence boundaries into safe chunks so long (Premium) summaries
// aren't silently truncated; the MP3 buffers are concatenated for playback.
const MAX_CHARS = 1800;

function chunkText(text: string): string[] {
  const clean = text.trim();
  if (clean.length <= MAX_CHARS) return [clean];

  const sentences = clean.match(/[^.!?]+[.!?]+|\s*[^.!?]+$/g) ?? [clean];
  const chunks: string[] = [];
  let cur = "";
  for (const s of sentences) {
    if (cur && cur.length + s.length > MAX_CHARS) {
      chunks.push(cur.trim());
      cur = "";
    }
    if (s.length > MAX_CHARS) {
      // A single sentence longer than the cap: hard-split it.
      for (let i = 0; i < s.length; i += MAX_CHARS) {
        chunks.push(s.slice(i, i + MAX_CHARS).trim());
      }
      continue;
    }
    cur += s;
  }
  if (cur.trim()) chunks.push(cur.trim());
  return chunks.filter(Boolean);
}

function synthesize(
  text: string,
  voice: string,
  apiKey: string
): Promise<Response> {
  const url = `${DEEPGRAM_SPEAK_URL}?model=${voice}&encoding=mp3&bit_rate=48000`;
  return fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Token ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });
}

// Reads an already-generated report's executive summary and streams it back as
// spoken audio (MP3). Read-only: no change to generation/transcription/dispatch.
// Access model matches /report/[id] and the pptx route (reachable by report id,
// no owner gating — auth is a deferred item).
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    return new Response("Text-to-speech is not configured.", { status: 503 });
  }

  const report = await prisma.report.findUnique({
    where: { id: params.id },
    select: { content: true, outputLanguage: true },
  });
  if (!report) {
    return new Response("Report not found.", { status: 404 });
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

  const mappedVoice = VOICE_BY_LANGUAGE[report.outputLanguage] ?? DEFAULT_VOICE;
  const chunks = chunkText(summary);
  const buffers: Buffer[] = [];

  for (const chunk of chunks) {
    let res = await synthesize(chunk, mappedVoice, apiKey);
    // A non-English mapped voice was rejected — fall back to the English voice.
    if (!res.ok && mappedVoice !== DEFAULT_VOICE) {
      res = await synthesize(chunk, DEFAULT_VOICE, apiKey);
    }
    if (!res.ok) {
      return new Response("Text-to-speech is temporarily unavailable.", {
        status: 502,
      });
    }
    buffers.push(Buffer.from(await res.arrayBuffer()));
  }

  const audio = Buffer.concat(buffers);
  return new Response(new Uint8Array(audio), {
    headers: {
      "Content-Type": "audio/mpeg",
      "Content-Length": String(audio.length),
      "Cache-Control": "private, no-store",
    },
  });
}
