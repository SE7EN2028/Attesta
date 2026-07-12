import { DeepgramClient } from "@deepgram/sdk";

export type Segment = { start: number; end: number; text: string };
export type SpeakerLabel = { speakerId: string; name: string | null; segments: Segment[] };

export type TranscriptionResult = {
  rawText: string;
  speakerLabels: SpeakerLabel[];
  source: "DEEPGRAM" | "MANUAL";
};

// Source files live in Vercel Blob (SourceFile.storageUrl is the public https
// URL) — not on local disk, which doesn't survive Vercel's serverless
// filesystem. Fetch the bytes into memory for Deepgram / text extraction.
async function fetchSourceBuffer(storageUrl: string): Promise<Buffer> {
  const res = await fetch(storageUrl);
  if (!res.ok) {
    throw new Error(`Failed to fetch source file (HTTP ${res.status}).`);
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function transcribeSourceFile(
  sourceFile: {
    type: string;
    storageUrl: string;
  },
  // Optional per-run Deepgram key override (admin's own key when the shared key
  // is rate-limited). Falsy → the DEEPGRAM_API_KEY env default is used.
  deepgramKey?: string
): Promise<TranscriptionResult> {
  const buffer = await fetchSourceBuffer(sourceFile.storageUrl);

  switch (sourceFile.type) {
    case "AUDIO":
    case "VIDEO":
      return transcribeWithDeepgram(buffer, deepgramKey);
    case "DOCX":
    case "PDF": {
      const rawText = await extractPlainText(buffer, sourceFile.type);
      return { rawText, speakerLabels: [], source: "MANUAL" };
    }
    default:
      throw new Error(`Unsupported source file type: ${sourceFile.type}`);
  }
}

// Plain-text extraction with no transcription semantics — used both for
// DOCX/PDF meeting sources above and for supporting documents (which only ever
// need their raw text). Takes the in-memory buffer directly — callers already
// hold it (upload) or fetch it from Blob (transcribeSourceFile).
export async function extractPlainText(
  buffer: Buffer,
  type: "DOCX" | "PDF"
): Promise<string> {
  return type === "DOCX" ? extractDocx(buffer) : extractPdf(buffer);
}

async function transcribeWithDeepgram(
  buffer: Buffer,
  keyOverride?: string
): Promise<TranscriptionResult> {
  const apiKey = keyOverride || process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPGRAM_API_KEY is not set.");
  }

  const deepgram = new DeepgramClient({ apiKey });

  const response = await deepgram.listen.v1.media.transcribeFile(buffer, {
    model: "nova-2",
    diarize: true,
    punctuate: true,
    paragraphs: true,
    smart_format: true,
  });

  if (!("results" in response)) {
    throw new Error("Deepgram returned an unexpected (async) response.");
  }

  const alternative = response.results?.channels?.[0]?.alternatives?.[0];
  if (!alternative) {
    throw new Error("Deepgram returned no transcription alternatives.");
  }

  const rawText = alternative.transcript ?? "";
  const paragraphs = alternative.paragraphs?.paragraphs ?? [];

  const speakerLabels: SpeakerLabel[] = [];
  const bySpeaker = new Map<number, SpeakerLabel>();

  for (const paragraph of paragraphs) {
    const speakerNumber = paragraph.speaker ?? 0;
    let label = bySpeaker.get(speakerNumber);
    if (!label) {
      label = { speakerId: `S${speakerNumber + 1}`, name: null, segments: [] };
      bySpeaker.set(speakerNumber, label);
      speakerLabels.push(label);
    }

    const text = (paragraph.sentences ?? [])
      .map((sentence) => sentence.text ?? "")
      .join(" ")
      .trim();

    if (text) {
      label.segments.push({
        start: paragraph.start ?? 0,
        end: paragraph.end ?? 0,
        text,
      });
    }
  }

  // Very short clips sometimes come back without paragraph data even with
  // paragraphs:true — fall back to one segment spanning the whole word list.
  if (speakerLabels.length === 0) {
    const words = alternative.words ?? [];
    const start = words[0]?.start ?? 0;
    const end = words[words.length - 1]?.end ?? 0;
    speakerLabels.push({
      speakerId: "S1",
      name: null,
      segments: rawText ? [{ start, end, text: rawText }] : [],
    });
  }

  return { rawText, speakerLabels, source: "DEEPGRAM" };
}

async function extractDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer });
  return value.trim();
}

async function extractPdf(buffer: Buffer): Promise<string> {
  // unpdf ships a serverless-safe pdfjs build (no web worker, no native canvas),
  // avoiding the "DOMMatrix is not defined" and missing-pdf.worker.mjs failures
  // that pdf-parse/pdfjs hit on Vercel's serverless runtime.
  const { getDocumentProxy, extractText } = await import("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(buffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return (Array.isArray(text) ? text.join("\n") : text).trim();
}
