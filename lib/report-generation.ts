import { prisma } from "@/lib/prisma";
import { countTokens } from "gpt-tokenizer";

type ProviderName = "gemini";

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

export type ComplianceFindingData = {
  category:
    | "RISK"
    | "MISSING_DOCUMENT"
    | "COMPLIANCE_REFERENCE"
    | "RECOMMENDATION"
    | "COMPLIANT";
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "ADVISORY" | "COMPLIANT";
  description: string;
  ruleReference: string | null;
  impactDescription: string | null;
  confidence: number;
};

export type GeneratedReport = {
  content: ReportContent;
  speakerAnalytics: SpeakerAnalytics;
  numericalData: NumericalData;
  complianceFindings: ComplianceFindingData[];
  generatedBy: ProviderName;
};

export type ReportGenerationBudget = {
  timeoutMs?: number;
  retries?: number;
};

export async function generateReportContent(
  meetingRequestId: string,
  budget?: ReportGenerationBudget
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

  const rawTranscriptText = formatTranscript(
    primaryFile.transcript.rawText,
    primaryFile.transcript.speakerLabels as unknown as SpeakerLabel[]
  );
  // Deterministic whitespace/formatting compaction — no content is touched,
  // only redundant blank lines and run-on spaces (real DOCX/PDF extractions
  // carry a lot of table-layout padding that's pure token waste once flattened
  // to plain text). A regex pass does this losslessly for free; no need to
  // burn an LLM call reducing whitespace when the transform is this
  // mechanical.
  const transcriptText = compactWhitespace(rawTranscriptText);

  const promptMetadata = {
    company: meetingRequest.company,
    region: meetingRequest.region,
    governingBody: meetingRequest.governingBody,
    meetingDate: meetingRequest.meetingDate.toISOString().slice(0, 10),
    title: meetingRequest.title,
    outputLanguage: meetingRequest.outputLanguage,
    tier: meetingRequest.tier,
  };

  // Token breakdown, logged before the call. Supporting docs are counted
  // here for visibility but deliberately NOT included in the prompt below
  // (scope cut: validate the core transcript-to-report path first).
  const supportingDocsCombinedText = supportingDocs
    .map((f) => f.extractedText as string)
    .join("\n\n");
  const rawTranscriptTokens = countTokens(rawTranscriptText);
  const transcriptTokens = countTokens(transcriptText);
  const supportingDocsTokens = countTokens(supportingDocsCombinedText);
  const fixedPromptTokens = countTokens(
    buildPrompt({ ...promptMetadata, transcriptText: "" })
  );
  console.log(
    `[report-generation] token breakdown — transcript raw: ${rawTranscriptTokens}, transcript after whitespace compaction: ${transcriptTokens}, supporting docs (excluded from prompt): ${supportingDocsTokens}, fixed prompt/schema: ${fixedPromptTokens}, total sent: ${transcriptTokens + fixedPromptTokens}`
  );

  const prompt = buildPrompt({ ...promptMetadata, transcriptText });

  const generated = await callModelForJson(prompt, budget);
  // Guarantee no compliance findings for General regardless of what the model
  // returned — General reports are never audited against a rule set.
  if (meetingRequest.region === GENERAL_REGION) {
    return { ...generated, complianceFindings: [] };
  }
  return generated;
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

// Collapses redundant whitespace without touching any actual word/character
// content: trims trailing spaces per line, folds runs of spaces/tabs within
// a line down to one, and caps blank-line runs at a single blank line.
function compactWhitespace(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function tierInstructions(tier: string): string {
  switch (tier) {
    case "ESSENTIAL":
      return "ESSENTIAL: chronological summary only. executiveSummary + discussionLog in time order. agendaItems/decisions/votes = empty arrays, always.";
    case "PREMIUM":
      return "PREMIUM: full agenda structure (agendaItems ordered; discussionLog/decisions/votes reference them via agendaItemRef). Fill decisions/votes where the transcript supports them. executiveSummary + closingNotes in a formal legal register.";
    case "SCOPE":
    default:
      return "SCOPE: full agenda structure (agendaItems ordered; discussionLog/decisions/votes reference them via agendaItemRef). Fill decisions/votes where the transcript supports them.";
  }
}

// Kept intentionally terse — every word here is prompt overhead sent on
// every call. Field names must stay exact (they're the actual contract).
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
  "numericalData": [ { "label": string, "value": string, "context": string } ],
  "complianceFindings": [ { "category": "RISK"|"MISSING_DOCUMENT"|"COMPLIANCE_REFERENCE"|"RECOMMENDATION"|"COMPLIANT", "riskLevel": "CRITICAL"|"HIGH"|"MEDIUM"|"ADVISORY"|"COMPLIANT", "description": string, "ruleReference": string|null, "impactDescription": string|null, "confidence": number } ]
}`;

// France is the only region with a verified statutory rule set, so it gets a
// jurisdiction-specific audit (real article citations allowed). Germany,
// Belgium and the Netherlands are fully supported for transcription and report
// generation, but Attesta has NOT verified their labour-code rule sets — so
// their findings are kept general/procedural and are forbidden from citing any
// statute. This keeps the audit honest rather than fabricating foreign law.
const VERIFIED_RULESET_REGIONS = new Set(["France"]);

// "General" is a jurisdiction-neutral report: no works-council framing, no
// compliance audit at all. The prompt tells the model to skip findings and
// generateReportContent also force-clears them (belt and suspenders).
export const GENERAL_REGION = "General";

function complianceInstructions(region: string, governingBody: string): string {
  if (region === GENERAL_REGION) {
    return `COMPLIANCE FINDINGS: return an empty array []. This is a general professional meeting report and is NOT audited against any regulatory, statutory, or works-council framework. Produce no compliance findings and no legal or regulatory references of any kind.`;
  }

  const core = `COMPLIANCE FINDINGS: audit the transcript itself (not the report you just wrote) against standard works-council procedure for a ${governingBody} meeting. Check, where the transcript gives evidence either way: quorum (was a headcount or present/total stated, and does it meet a typical threshold?), notice/convocation period before the meeting, whether votes were called with a recorded headcount vs. just "no objection", approval of prior minutes, and standard documents a meeting of this type usually references (attendance sheet, written employer answers to prior questions) that are notably absent or notably present.
Each finding must cite what in the transcript supports it (fold that into description/impactDescription) — do not invent findings the transcript gives no evidence for. If the transcript is silent on something (e.g. convocation timing), either omit it or file it as MISSING_DOCUMENT/ADVISORY with lower confidence, not as a confident RISK. confidence (0-100) reflects your certainty given what the transcript actually shows. Include both problems (RISK/MISSING_DOCUMENT/RECOMMENDATION) and things done correctly (COMPLIANT) if evidenced. Empty array if the transcript gives no basis for any finding.`;

  if (VERIFIED_RULESET_REGIONS.has(region)) {
    return `${core}
This meeting is under the verified ${region} rule set. You may also check France-specific items where evidenced (e.g. BDESE consultation, statutory notice periods). ruleReference is a real statute/article (e.g. French Labour Code) ONLY if you are confident of the exact citation for ${region}, otherwise null — never invent a citation.`;
  }

  return `${core}
IMPORTANT — ${region} is supported but Attesta has NOT verified a ${region} statutory rule set. Keep every finding GENERAL and procedural: observations that hold for any works-council meeting, framed as general good practice, NOT as a jurisdiction-specific legal audit. Do NOT cite, name, or paraphrase any ${region} statute, article, or labour-code provision. ruleReference MUST be null for every finding. Do not imply these findings are checked against ${region} law.`;
}

// NOTE: supporting-document text is deliberately not a param here — see
// the comment in generateReportContent. Re-add a supportingDocs param and
// section when that scope cut is reversed.
function buildPrompt(input: {
  company: string;
  region: string;
  governingBody: string;
  meetingDate: string;
  title: string;
  outputLanguage: string;
  tier: string;
  transcriptText: string;
}): string {
  const isGeneral = input.region === GENERAL_REGION;
  const generalFraming = isGeneral
    ? `\nGENERAL REPORT: produce a clear, professional meeting record — attendance, agenda, discussion log, decisions and votes where the transcript supports them. Keep it jurisdiction-neutral: do NOT reference any country's labour law, works-council framework, statutes, or legal/regulatory citations.\n`
    : "";
  const languageLine = isGeneral
    ? `LANGUAGE: write narrative fields in ${input.outputLanguage}.`
    : `LANGUAGE: write narrative fields in ${input.outputLanguage}. Keep legal/regulatory citations tied to the ${input.region} jurisdiction in their original, untranslated form.`;

  return `MEETING METADATA
Company: ${input.company}
Region: ${input.region}
Governing body: ${input.governingBody}
Meeting date: ${input.meetingDate}
Title: ${input.title}
Output language: ${input.outputLanguage}
Report tier: ${input.tier}

TIER: ${tierInstructions(input.tier)}
${generalFraming}
${languageLine}

TRANSCRIPT (chronological, diarized where available — primary source of truth):
${input.transcriptText}

OUTPUT FORMAT — respond with ONE JSON object, exactly this shape:
${RESPONSE_SHAPE}

Base every field strictly on the transcript above — no invented names, votes, or figures. onTopicScore is 0-100. numericalData covers any figures/amounts/counts/dates mentioned. Use an empty array or a short honest note instead of fabricating content.

${complianceInstructions(input.region, input.governingBody)}`;
}

const SYSTEM_PROMPT =
  "You are Attesta's report-generation engine. You turn a meeting transcript (plus optional supporting reference documents) into structured statutory meeting minutes. You always respond with a single valid JSON object and nothing else — no markdown code fences, no commentary before or after the JSON.";

// Gemini is the sole provider. Groq (12K TPM free-tier cap) and NIM
// (shared-pool hard capacity ceiling — "Worker local total request limit
// reached (49/48)") were both confirmed unable to handle this app's real
// prompt sizes (~40-50K tokens) even after prompt-size reduction work.
// Gemini's free tier has a large-enough TPM ceiling (hundreds of thousands
// to 1M+, not a shared community pool) for this app's actual usage pattern
// — occasional, single-request, admin-triggered report generation. Its low
// RPM/RPD free-tier caps are request-count limits, not the token-volume
// limit that was the actual blocker, so they don't bind here.
// Overridable via GEMINI_MODEL env. Default is gemini-2.5-flash — the
// previous default (gemini-3.5-flash) was persistently returning 503
// "high demand", so it's no longer the target.
const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";

function resolveGeminiApiKey(): string {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }
  return apiKey;
}

// Retry on transient-looking failures (rate limits, timeouts, 5xx) before
// giving up.
const TRANSIENT_RETRY_ATTEMPTS = 3;
const TRANSIENT_RETRY_DELAY_MS = 15_000;

function isTransientProviderError(message: string): boolean {
  return /429|503|RESOURCE_EXHAUSTED|UNAVAILABLE|Service Unavailable|timed out|fetch failed|ECONNRESET|ETIMEDOUT|socket hang up|network/i.test(
    message
  );
}

async function callModelForJson(
  prompt: string,
  budget?: ReportGenerationBudget
): Promise<GeneratedReport> {
  const apiKey = resolveGeminiApiKey();
  const maxAttempts = budget?.retries ?? TRANSIENT_RETRY_ATTEMPTS;
  const timeoutMs = budget?.timeoutMs ?? PROVIDER_TIMEOUT_MS;

  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await callProviderWithRetry(apiKey, prompt, timeoutMs);
      return { ...result, generatedBy: "gemini" };
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const isLastAttempt = attempt === maxAttempts;
      if (!isTransientProviderError(message) || isLastAttempt) {
        throw error;
      }
      console.error(
        `[report-generation] gemini attempt ${attempt}/${maxAttempts} hit a transient error (${message}) — retrying in ${TRANSIENT_RETRY_DELAY_MS / 1000}s.`
      );
      await new Promise((resolve) => setTimeout(resolve, TRANSIENT_RETRY_DELAY_MS));
    }
  }
  throw lastError;
}

// If the response isn't valid JSON, retry once with a stricter
// no-markdown-fences instruction before giving up entirely.
async function callProviderWithRetry(
  apiKey: string,
  prompt: string,
  timeoutMs: number
): Promise<Omit<GeneratedReport, "generatedBy">> {
  const first = await callChatCompletion(apiKey, prompt, timeoutMs);
  const parsed = tryParseJson(first);
  if (parsed) return validateShape(parsed);

  const strictPrompt = `${prompt}\n\nIMPORTANT: Your previous response was not valid JSON. Return ONLY a single valid JSON object — no markdown code fences (no \`\`\`), no commentary, no explanation. The response must start with { and end with }.`;
  const second = await callChatCompletion(apiKey, strictPrompt, timeoutMs);
  const parsedSecond = tryParseJson(second);
  if (parsedSecond) return validateShape(parsedSecond);

  throw new Error(
    "gemini did not return valid JSON after one retry — aborting rather than storing malformed content."
  );
}

// 240s was tuned for the old Groq/NIM setup and proved too tight for
// Gemini on this app's ~37K-token prompts with a large max-output JSON
// response — observed two clean 240s timeouts back to back with no error
// content, i.e. the request was still in flight, not stuck/erroring.
const PROVIDER_TIMEOUT_MS = 400_000;

async function callChatCompletion(
  apiKey: string,
  prompt: string,
  timeoutMs: number
): Promise<string> {
  // Next.js patches the global fetch for its data cache, and in practice
  // that patched fetch does not reliably honor an AbortSignal here — a
  // signal-based timeout was observed to never fire. Race against a plain
  // timer instead so this function itself always settles within the
  // budget, regardless of what the abandoned fetch does afterwards.
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(
      () => reject(new Error(`gemini request timed out after ${timeoutMs / 1000}s.`)),
      timeoutMs
    );
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  let res: Response;
  try {
    res = await Promise.race([
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            // Bumped from 16384 — complianceFindings adds real output volume
            // on top of an already-large discussionLog/speakerAnalytics
            // payload for a full-length transcript.
            maxOutputTokens: 32768,
            responseMimeType: "application/json",
          },
        }),
      }),
      timeout,
    ]);
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : `gemini request failed: ${String(error)}`
    );
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`gemini API error ${res.status}: ${body.slice(0, 500)}`);
  }

  const data = await res.json();

  const blockReason = data.promptFeedback?.blockReason;
  if (blockReason) {
    throw new Error(`gemini blocked the prompt: ${blockReason}`);
  }

  const candidate = data.candidates?.[0];
  const content: string | undefined = candidate?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("");
  if (!content) {
    throw new Error("gemini returned no content.");
  }
  // A real meeting's full discussionLog/speakerAnalytics/numericalData can
  // be large — surface a truncation clearly rather than a confusing JSON
  // parse failure downstream.
  if (candidate?.finishReason === "MAX_TOKENS") {
    throw new Error(
      "gemini response was truncated at the max output token limit — the report content is too large for the current cap and needs a bigger limit or a more compressed prompt."
    );
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

// Some early seed/fixture rows predate the current ReportContent schema
// (e.g. attendance as a summary object instead of an array, agendaItems as
// plain strings). The viewer is built against the real generation
// pipeline's shape, so callers guard with this before rendering rather than
// crashing. Shared by /report/[id] and /samples.
export function isRenderableReportContent(
  content: unknown
): content is ReportContent {
  if (!content || typeof content !== "object") return false;
  const c = content as Record<string, unknown>;
  const coverInfo = c.coverInfo as Record<string, unknown> | undefined;
  return (
    typeof coverInfo?.meetingTitle === "string" &&
    typeof coverInfo?.company === "string" &&
    Array.isArray(c.attendance) &&
    Array.isArray(c.agendaItems) &&
    Array.isArray(c.discussionLog) &&
    Array.isArray(c.decisions) &&
    Array.isArray(c.votes) &&
    Array.isArray(c.proceduralNotes)
  );
}

function validateShape(parsed: unknown): Omit<GeneratedReport, "generatedBy"> {
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("content" in parsed) ||
    !("speakerAnalytics" in parsed) ||
    !("numericalData" in parsed) ||
    !("complianceFindings" in parsed) ||
    typeof (parsed as { content: unknown }).content !== "object" ||
    !Array.isArray((parsed as { speakerAnalytics: unknown }).speakerAnalytics) ||
    !Array.isArray((parsed as { numericalData: unknown }).numericalData) ||
    !Array.isArray((parsed as { complianceFindings: unknown }).complianceFindings)
  ) {
    throw new Error("Model JSON did not match the expected report shape.");
  }
  return parsed as Omit<GeneratedReport, "generatedBy">;
}
