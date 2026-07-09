import { promises as fs } from "fs";
import path from "path";
import { DeepgramClient } from "@deepgram/sdk";

export type Segment = { start: number; end: number; text: string };
export type SpeakerLabel = { speakerId: string; name: string | null; segments: Segment[] };

export type TranscriptionResult = {
  rawText: string;
  speakerLabels: SpeakerLabel[];
  source: "DEEPGRAM" | "MANUAL";
};

export function resolveUploadPath(storageUrl: string): string {
  return path.join(process.cwd(), storageUrl.replace(/^\//, ""));
}

export async function transcribeSourceFile(sourceFile: {
  type: string;
  storageUrl: string;
}): Promise<TranscriptionResult> {
  const absolutePath = resolveUploadPath(sourceFile.storageUrl);

  switch (sourceFile.type) {
    case "AUDIO":
    case "VIDEO":
      return transcribeWithDeepgram(absolutePath);
    case "DOCX":
    case "PDF": {
      const rawText = await extractPlainText(absolutePath, sourceFile.type);
      return { rawText, speakerLabels: [], source: "MANUAL" };
    }
    default:
      throw new Error(`Unsupported source file type: ${sourceFile.type}`);
  }
}

// Plain-text extraction with no transcription semantics — used both for
// DOCX/PDF meeting sources above and for supporting documents, which only
// ever need their raw text (see lib/transcription.ts callers in
// app/create/actions.ts).
export async function extractPlainText(
  absolutePath: string,
  type: "DOCX" | "PDF"
): Promise<string> {
  return type === "DOCX" ? extractDocx(absolutePath) : extractPdf(absolutePath);
}

async function transcribeWithDeepgram(
  absolutePath: string
): Promise<TranscriptionResult> {
  const apiKey = process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPGRAM_API_KEY is not set.");
  }

  const buffer = await fs.readFile(absolutePath);
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

async function extractDocx(absolutePath: string): Promise<string> {
  const mammoth = await import("mammoth");
  const buffer = await fs.readFile(absolutePath);
  const { value } = await mammoth.extractRawText({ buffer });
  return value.trim();
}

async function extractPdf(absolutePath: string): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const buffer = await fs.readFile(absolutePath);
  const parser = new PDFParse({ data: buffer });
  try {
    const result = await parser.getText();
    return result.text.trim();
  } finally {
    await parser.destroy();
  }
}
