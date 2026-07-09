import { prisma } from "@/lib/prisma";

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const DEEPSEEK_MODEL = "deepseek-chat";

type Segment = { start: number; end: number; text: string };
type SpeakerLabel = { speakerId: string; name: string | null; segments: Segment[] };

export type ReportContent = {
  coverInfo: {
    company: string;
    meetingTitle: string;
    date: string;
    region: string;
    governingBody: string;
  };
  executiveSummary: string;
  attendance: { name: string; role: string; present: boolean }[];
  agendaItems: { order: number; title: string }[];
  discussionLog: {
    agendaItemRef: number | null;
    speakerName: string;
    text: string;
    timestamp: string;
  }[];
  decisions: { agendaItemRef: number | null; description: string }[];
  votes: {
    agendaItemRef: number | null;
    description: string;
    forCount: number;
    againstCount: number;
    abstainCount: number;
  }[];
  proceduralNotes: string[];
  closingNotes: string;
};

export type SpeakerAnalytics = {
  speakerName: string;
  talkTimeSeconds: number;
  contributionCount: number;
  onTopicScore: number;
}[];

export type NumericalData = { label: string; value: string; context: string }[];

export type GeneratedReport = {
  content: ReportContent;
  speakerAnalytics: SpeakerAnalytics;
  numericalData: NumericalData;
};

export async function generateReportContent(
  meetingRequestId: string
): Promise<GeneratedReport> {
  const meetingRequest = await prisma.meetingRequest.findUnique({
    where: { id: meetingRequestId },
    include: { sourceFiles: { include: { transcript: true } } },
  });
  if (!meetingRequest) {
    throw new Error("Meeting request not found.");
  }

  const primaryFile = meetingRequest.sourceFiles.find(
    (f) => f.role === "PRIMARY_MEETING"
  );
  if (!primaryFile?.transcript) {
    throw new Error("No transcript available for this meeting request.");
  }

  const supportingDocs = meetingRequest.sourceFiles.filter(
    (f) => f.role === "SUPPORTING_DOCUMENT" && f.extractedText
  );

  const transcriptText = formatTranscript(
    primaryFile.transcript.rawText,
    primaryFile.transcript.speakerLabels as unknown as SpeakerLabel[]
  );

  const prompt = buildPrompt({
    company: meetingRequest.company,
    region: meetingRequest.region,
    governingBody: meetingRequest.governingBody,
    meetingDate: meetingRequest.meetingDate.toISOString().slice(0, 10),
    title: meetingRequest.title,
    outputLanguage: meetingRequest.outputLanguage,
    tier: meetingRequest.tier,
    transcriptText,
    supportingDocs: supportingDocs.map((f) => ({
      fileName: f.fileName,
      text: f.extractedText as string,
    })),
  });

  return callModelForJson(prompt);
}

function formatTranscript(rawText: string, speakerLabels: SpeakerLabel[]): string {
  if (!speakerLabels?.length) return rawText;

  const allSegments = speakerLabels.flatMap((speaker) =>
    speaker.segments.map((segment) => ({
      ...segment,
      speaker: speaker.name || speaker.speakerId,
    }))
  );
  if (!allSegments.length) return rawText;

  allSegments.sort((a, b) => a.start - b.start);
  return allSegments
    .map((seg) => `[${formatTimestamp(seg.start)}] ${seg.speaker}: ${seg.text}`)
    .join("\n");
}

function formatTimestamp(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function tierInstructions(tier: string): string {
  switch (tier) {
    case "ESSENTIAL":
      return [
        "ESSENTIAL tier — chronological summary only:",
        "- Populate executiveSummary and discussionLog strictly in time order from the transcript.",
        "- agendaItems MUST be an empty array — do not impose agenda structure at this tier.",
        "- decisions and votes MUST be empty arrays, even if the transcript mentions a vote or decision.",
      ].join("\n");
    case "PREMIUM":
      return [
        "PREMIUM tier — full agenda-based structure, formal register:",
        "- Identify distinct agenda items from the transcript, in order, and reference them from discussionLog/decisions/votes via agendaItemRef (matching agendaItems[].order).",
        "- Populate decisions and votes wherever the transcript actually supports them.",
        "- Write executiveSummary and closingNotes in a formal legal register — precise, neutral, procedurally careful language suitable for a document that may be signed and relied upon.",
      ].join("\n");
    case "SCOPE":
    default:
      return [
        "SCOPE tier — full agenda-based structure:",
        "- Identify distinct agenda items from the transcript, in order, and reference them from discussionLog/decisions/votes via agendaItemRef (matching agendaItems[].order).",
        "- Populate decisions and votes wherever the transcript actually supports them.",
      ].join("\n");
  }
}

const RESPONSE_SHAPE = `{
  "content": {
    "coverInfo": { "company": string, "meetingTitle": string, "date": string, "region": string, "governingBody": string },
    "executiveSummary": string,
    "attendance": [ { "name": string, "role": string, "present": boolean } ],
    "agendaItems": [ { "order": number, "title": string } ],
    "discussionLog": [ { "agendaItemRef": number | null, "speakerName": string, "text": string, "timestamp": string } ],
    "decisions": [ { "agendaItemRef": number | null, "description": string } ],
    "votes": [ { "agendaItemRef": number | null, "description": string, "forCount": number, "againstCount": number, "abstainCount": number } ],
    "proceduralNotes": [ string ],
    "closingNotes": string
  },
  "speakerAnalytics": [ { "speakerName": string, "talkTimeSeconds": number, "contributionCount": number, "onTopicScore": number } ],
  "numericalData": [ { "label": string, "value": string, "context": string } ]
}`;

function buildPrompt(input: {
  company: string;
  region: string;
  governingBody: string;
  meetingDate: string;
  title: string;
  outputLanguage: string;
  tier: string;
  transcriptText: string;
  supportingDocs: { fileName: string; text: string }[];
}): string {
  const supportingSection = input.supportingDocs.length
    ? input.supportingDocs
        .map((doc) => `--- ${doc.fileName} ---\n${doc.text}`)
        .join("\n\n")
    : null;

  return `MEETING METADATA
Company: ${input.company}
Region: ${input.region}
Governing body: ${input.governingBody}
Meeting date: ${input.meetingDate}
Title: ${input.title}
Output language: ${input.outputLanguage}
Report tier: ${input.tier}

TIER INSTRUCTIONS
${tierInstructions(input.tier)}

LANGUAGE INSTRUCTIONS
Write all narrative fields (executiveSummary, discussionLog text, proceduralNotes, closingNotes, attendance/agenda labels) in ${input.outputLanguage}. Do NOT translate legal or regulatory citations, article numbers, or statutory references — keep those tied to the ${input.region} jurisdiction exactly as they would actually be cited there, regardless of the output language.

MEETING TRANSCRIPT (chronological, diarized where available — this is the primary source of truth)
${input.transcriptText}

${
  supportingSection
    ? `SUPPORTING REFERENCE DOCUMENTS (context only — these are NOT the meeting transcript and nothing in them was said at the meeting; use them only to cross-check policies, figures or prior minutes referenced in the discussion)\n${supportingSection}`
    : "No supporting documents were provided for this meeting."
}

OUTPUT FORMAT
Respond with a single JSON object with EXACTLY this shape (no extra top-level keys, no missing keys):
${RESPONSE_SHAPE}

Base attendance, agendaItems, discussionLog, decisions, votes, speakerAnalytics and numericalData strictly on what is actually present in the transcript above. speakerAnalytics.onTopicScore is 0-100, your judgment of how much of that speaker's contributions were relevant to the agenda vs. tangential. numericalData covers any figures, amounts, counts, dates or metrics mentioned in the transcript (vote tallies, budget figures, headcounts, deadlines, etc). Do not invent names, votes or figures that are not there — if a field genuinely has no material, use an empty array (or an honest short string) rather than fabricating content.`;
}

const SYSTEM_PROMPT =
  "You are Attesta's report-generation engine. You turn a meeting transcript (plus optional supporting reference documents) into structured statutory meeting minutes. You always respond with a single valid JSON object and nothing else — no markdown code fences, no commentary before or after the JSON.";

async function callModelForJson(prompt: string): Promise<GeneratedReport> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPSEEK_API_KEY is not set.");
  }

  const first = await callDeepSeek(prompt, apiKey);
  const parsed = tryParseJson(first);
  if (parsed) return validateShape(parsed);

  // First response wasn't valid JSON — retry once with a stricter,
  // no-markdown-fences instruction rather than silently storing garbage.
  const strictPrompt = `${prompt}\n\nIMPORTANT: Your previous response was not valid JSON. Return ONLY a single valid JSON object — no markdown code fences (no \`\`\`), no commentary, no explanation. The response must start with { and end with }.`;
  const second = await callDeepSeek(strictPrompt, apiKey);
  const parsedSecond = tryParseJson(second);
  if (parsedSecond) return validateShape(parsedSecond);

  throw new Error(
    "Model did not return valid JSON after one retry — aborting rather than storing malformed content."
  );
}

async function callDeepSeek(prompt: string, apiKey: string): Promise<string> {
  const res = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEEPSEEK_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 8000,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`DeepSeek API error ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("DeepSeek returned no content.");
  }
  return content;
}

function tryParseJson(text: string): unknown | null {
  const cleaned = text
    .trim()
    .replace(/^```(json)?/i, "")
    .replace(/```$/, "")
    .trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    return null;
  }
}

function validateShape(parsed: unknown): GeneratedReport {
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("content" in parsed) ||
    !("speakerAnalytics" in parsed) ||
    !("numericalData" in parsed) ||
    typeof (parsed as { content: unknown }).content !== "object" ||
    !Array.isArray((parsed as { speakerAnalytics: unknown }).speakerAnalytics) ||
    !Array.isArray((parsed as { numericalData: unknown }).numericalData)
  ) {
    throw new Error("Model JSON did not match the expected report shape.");
  }
  return parsed as GeneratedReport;
}
