import { prisma } from "@/lib/prisma";
import { countTokens } from "gpt-tokenizer";
import { loadPrompts, fill, type PromptResolver } from "@/lib/prompts";

type ProviderName = "gemini";

type Segment = { start: number; end: number; text: string };
export type SpeakerLabel = { speakerId: string; name: string | null; segments: Segment[] };

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

// The Instant Compliance Snapshot — a lightweight, read-only preview produced
// before tier selection. A trimmed subset of the full report: no narrative
// content (agenda/discussion/votes/minutes), just the three analytical blocks.
export type ComplianceSnapshot = {
  speakerAnalytics: SpeakerAnalytics;
  numericalData: NumericalData;
  complianceFindings: ComplianceFindingData[];
};

export type ReportGenerationBudget = {
  timeoutMs?: number;
  retries?: number;
};

export async function generateReportContent(
  meetingRequestId: string,
  budget?: ReportGenerationBudget,
  geminiKey?: string
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
  // Load admin prompt overrides once (DB, with code fallback) and reuse the
  // resolver for both the token-count pass and the real prompt build.
  const prompts = await loadPrompts();
  const rawTranscriptTokens = countTokens(rawTranscriptText);
  const transcriptTokens = countTokens(transcriptText);
  const supportingDocsTokens = countTokens(supportingDocsCombinedText);
  const fixedPromptTokens = countTokens(
    buildPrompt({ ...promptMetadata, transcriptText: "" }, prompts)
  );
  console.log(
    `[report-generation] token breakdown — transcript raw: ${rawTranscriptTokens}, transcript after whitespace compaction: ${transcriptTokens}, supporting docs (excluded from prompt): ${supportingDocsTokens}, fixed prompt/schema: ${fixedPromptTokens}, total sent: ${transcriptTokens + fixedPromptTokens}`
  );

  const prompt = buildPrompt({ ...promptMetadata, transcriptText }, prompts);

  const validated = await callModelForJson(
    prompt,
    prompts.resolve("system"),
    budget,
    validateShape,
    geminiKey
  );
  const generated: GeneratedReport = { ...validated, generatedBy: "gemini" };
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

function tierInstructions(tier: string, prompts: PromptResolver): string {
  // Branch stays in code; only the text is resolved from the prompt library.
  switch (tier) {
    case "ESSENTIAL":
      return prompts.resolve("tier_essential");
    case "PREMIUM":
      return prompts.resolve("tier_premium");
    case "SCOPE":
    default:
      return prompts.resolve("tier_scope");
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

function complianceInstructions(
  region: string,
  governingBody: string,
  prompts: PromptResolver
): string {
  // Branch (which region gets which text) stays in code; the prose is resolved
  // from the prompt library and {{governingBody}}/{{region}} filled here.
  if (region === GENERAL_REGION) {
    return prompts.resolve("compliance_general");
  }

  const core = fill(prompts.resolve("compliance_core"), { governingBody });

  if (VERIFIED_RULESET_REGIONS.has(region)) {
    const suffix = fill(prompts.resolve("compliance_verified_suffix"), {
      region,
    });
    return `${core}\n${suffix}`;
  }

  const suffix = fill(prompts.resolve("compliance_unverified_suffix"), {
    region,
  });
  return `${core}\n${suffix}`;
}

// NOTE: supporting-document text is deliberately not a param here — see
// the comment in generateReportContent. Re-add a supportingDocs param and
// section when that scope cut is reversed.
function buildPrompt(
  input: {
    company: string;
    region: string;
    governingBody: string;
    meetingDate: string;
    title: string;
    outputLanguage: string;
    tier: string;
    transcriptText: string;
  },
  prompts: PromptResolver
): string {
  const isGeneral = input.region === GENERAL_REGION;
  // Assembly keeps the exact surrounding newlines the literal used; the prose
  // itself is resolved from the prompt library.
  const generalFraming = isGeneral
    ? `\n${prompts.resolve("report_general_framing")}\n`
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

TIER: ${tierInstructions(input.tier, prompts)}
${generalFraming}
${languageLine}

TRANSCRIPT (chronological, diarized where available — primary source of truth):
${input.transcriptText}

OUTPUT FORMAT — respond with ONE JSON object, exactly this shape:
${RESPONSE_SHAPE}

${prompts.resolve("report_base_instruction")}

${complianceInstructions(input.region, input.governingBody, prompts)}`;
}

// Gemini is the sole provider. Groq (12K TPM free-tier cap) and NIM
// (shared-pool hard capacity ceiling — "Worker local total request limit
// reached (49/48)") were both confirmed unable to handle this app's real
// prompt sizes (~40-50K tokens) even after prompt-size reduction work.
// Gemini's free tier has a large-enough TPM ceiling (hundreds of thousands
// to 1M+, not a shared community pool) for this app's actual usage pattern
// — occasional, single-request, admin-triggered report generation. Its low
// RPM/RPD free-tier caps are request-count limits, not the token-volume
// limit that was the actual blocker, so they don't bind here.
// Model fallback chain (first = primary). On quota exhaustion (or a model that
// stays unavailable after its retries) generation advances to the next model.
// Override with GEMINI_MODELS (comma-separated) or a single GEMINI_MODEL.
function resolveModels(): string[] {
  const csv = process.env.GEMINI_MODELS;
  if (csv) {
    const list = csv.split(",").map((s) => s.trim()).filter(Boolean);
    if (list.length) return list;
  }
  if (process.env.GEMINI_MODEL) return [process.env.GEMINI_MODEL];
  return ["gemini-2.5-flash", "gemini-3.5-flash"];
}
const GEMINI_MODELS = resolveModels();

function resolveGeminiApiKey(override?: string): string {
  // A per-run override (admin's own key when the shared key is rate-limited)
  // wins; falsy → the GEMINI_API_KEY env default.
  const apiKey = override || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set.");
  }
  return apiKey;
}

// Retry on transient-looking failures (rate limits, timeouts, 5xx) before
// giving up.
const TRANSIENT_RETRY_ATTEMPTS = 3;
const TRANSIENT_RETRY_DELAY_MS = 15_000;

// Quota exhaustion won't recover on retry — bail to the next model immediately.
function isExhaustionError(message: string): boolean {
  return /429|RESOURCE_EXHAUSTED|quota/i.test(message);
}
// Overload / network / timeout — worth retrying the same model before moving on.
function isRetriableTransient(message: string): boolean {
  return /503|UNAVAILABLE|Service Unavailable|timed out|fetch failed|ECONNRESET|ETIMEDOUT|socket hang up|network/i.test(
    message
  );
}
// Either kind means "this model isn't giving us an answer" → try the next one.
function isModelAvailabilityError(message: string): boolean {
  return isExhaustionError(message) || isRetriableTransient(message);
}

// One model: retry on transient overload/network errors, but NOT on quota
// exhaustion (that just wastes time before the caller falls to the next model).
async function attemptModel<T>(
  apiKey: string,
  prompt: string,
  systemPrompt: string,
  timeoutMs: number,
  model: string,
  maxAttempts: number,
  validate: (parsed: unknown) => T
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await callProviderWithRetry(apiKey, prompt, systemPrompt, timeoutMs, model, validate);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      // Exhausted, or a non-availability error (bad JSON, blocked prompt) —
      // no point retrying this model; let the caller decide (switch / surface).
      if (isExhaustionError(message) || !isRetriableTransient(message)) {
        throw error;
      }
      if (attempt === maxAttempts) throw error;
      console.error(
        `[report-generation] ${model} attempt ${attempt}/${maxAttempts} transient error (${message.slice(0, 140)}) — retrying in ${TRANSIENT_RETRY_DELAY_MS / 1000}s.`
      );
      await new Promise((resolve) => setTimeout(resolve, TRANSIENT_RETRY_DELAY_MS));
    }
  }
  throw lastError;
}

// Walk the model chain: primary first, fall to the next model on quota
// exhaustion or persistent unavailability. Non-availability errors (invalid
// JSON, blocked prompt) surface immediately.
async function callModelForJson<T>(
  prompt: string,
  systemPrompt: string,
  budget: ReportGenerationBudget | undefined,
  validate: (parsed: unknown) => T,
  apiKeyOverride?: string
): Promise<T> {
  const apiKey = resolveGeminiApiKey(apiKeyOverride);
  const maxAttempts = budget?.retries ?? TRANSIENT_RETRY_ATTEMPTS;
  const timeoutMs = budget?.timeoutMs ?? PROVIDER_TIMEOUT_MS;

  let lastError: unknown;
  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    const model = GEMINI_MODELS[i];
    const isLastModel = i === GEMINI_MODELS.length - 1;
    try {
      return await attemptModel(apiKey, prompt, systemPrompt, timeoutMs, model, maxAttempts, validate);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!isLastModel && isModelAvailabilityError(message)) {
        console.error(
          `[report-generation] model ${model} unavailable (${message.slice(0, 140)}) — falling back to ${GEMINI_MODELS[i + 1]}.`
        );
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

// If the response isn't valid JSON, retry once with a stricter
// no-markdown-fences instruction before giving up entirely.
async function callProviderWithRetry<T>(
  apiKey: string,
  prompt: string,
  systemPrompt: string,
  timeoutMs: number,
  model: string,
  validate: (parsed: unknown) => T
): Promise<T> {
  const first = await callChatCompletion(apiKey, prompt, systemPrompt, timeoutMs, model);
  const parsed = tryParseJson(first);
  if (parsed) return validate(parsed);

  const strictPrompt = `${prompt}\n\nIMPORTANT: Your previous response was not valid JSON. Return ONLY a single valid JSON object — no markdown code fences (no \`\`\`), no commentary, no explanation. The response must start with { and end with }.`;
  const second = await callChatCompletion(apiKey, strictPrompt, systemPrompt, timeoutMs, model);
  const parsedSecond = tryParseJson(second);
  if (parsedSecond) return validate(parsedSecond);

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
  systemPrompt: string,
  timeoutMs: number,
  model: string
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  let res: Response;
  try {
    res = await Promise.race([
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
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

/* ---------- Instant Compliance Snapshot (pre-tier, lightweight) ---------- */

// Trimmed response shape — only the three analytical blocks, no narrative
// report content. Keeps the snapshot fast and cheap vs. the full report.
const SNAPSHOT_RESPONSE_SHAPE = `{
  "complianceFindings": [ { "category": "RISK"|"MISSING_DOCUMENT"|"COMPLIANCE_REFERENCE"|"RECOMMENDATION"|"COMPLIANT", "riskLevel": "CRITICAL"|"HIGH"|"MEDIUM"|"ADVISORY"|"COMPLIANT", "description": string, "ruleReference": string|null, "impactDescription": string|null, "confidence": number } ],
  "speakerAnalytics": [ { "speakerName": string, "talkTimeSeconds": number, "contributionCount": number, "onTopicScore": number } ],
  "numericalData": [ { "label": string, "value": string, "context": string } ]
}`;

function validateSnapshotShape(parsed: unknown): ComplianceSnapshot {
  if (
    !parsed ||
    typeof parsed !== "object" ||
    !("speakerAnalytics" in parsed) ||
    !("numericalData" in parsed) ||
    !("complianceFindings" in parsed) ||
    !Array.isArray((parsed as { speakerAnalytics: unknown }).speakerAnalytics) ||
    !Array.isArray((parsed as { numericalData: unknown }).numericalData) ||
    !Array.isArray((parsed as { complianceFindings: unknown }).complianceFindings)
  ) {
    throw new Error("Model JSON did not match the expected snapshot shape.");
  }
  return parsed as ComplianceSnapshot;
}

// Snapshot prompt. Unlike buildPrompt, supporting-document text IS included
// (the snapshot reads the meeting + supporting docs together, per spec) and no
// narrative report content is requested. Reuses complianceInstructions so the
// France / unverified-region / General honesty rules apply identically.
function buildSnapshotPrompt(
  input: {
    company: string;
    region: string;
    governingBody: string;
    meetingDate: string;
    title: string;
    outputLanguage: string;
    transcriptText: string;
    supportingDocsText: string;
  },
  prompts: PromptResolver
): string {
  const isGeneral = input.region === GENERAL_REGION;
  const languageLine = isGeneral
    ? `LANGUAGE: write narrative fields in ${input.outputLanguage}.`
    : `LANGUAGE: write narrative fields in ${input.outputLanguage}. Keep any legal/regulatory citations tied to the ${input.region} jurisdiction in their original, untranslated form.`;
  const docsSection = input.supportingDocsText.trim()
    ? `\nSUPPORTING DOCUMENTS (read together with the transcript — cross-check figures and claims against these):\n${input.supportingDocsText}\n`
    : "";

  return `MEETING METADATA
Company: ${input.company}
Region: ${input.region}
Governing body: ${input.governingBody}
Meeting date: ${input.meetingDate}
Title: ${input.title}
Output language: ${input.outputLanguage}

${prompts.resolve("snapshot_instruction")}
${languageLine}
${docsSection}
TRANSCRIPT (chronological, diarized where available — primary source of truth):
${input.transcriptText}

OUTPUT FORMAT — respond with ONE JSON object, exactly this shape:
${SNAPSHOT_RESPONSE_SHAPE}

${prompts.resolve("snapshot_base_instruction")}

${complianceInstructions(input.region, input.governingBody, prompts)}`;
}

export type SnapshotInput = {
  company: string;
  region: string;
  governingBody: string;
  meetingDate: string;
  title: string;
  outputLanguage: string;
  transcriptRawText: string;
  speakerLabels: SpeakerLabel[];
  supportingDocsText: string;
};

export async function generateComplianceSnapshot(
  input: SnapshotInput,
  budget?: ReportGenerationBudget
): Promise<ComplianceSnapshot> {
  const transcriptText = compactWhitespace(
    formatTranscript(input.transcriptRawText, input.speakerLabels)
  );
  const prompts = await loadPrompts();
  const prompt = buildSnapshotPrompt({ ...input, transcriptText }, prompts);
  const snapshot = await callModelForJson(
    prompt,
    prompts.resolve("system"),
    budget,
    validateSnapshotShape
  );
  // Same General guarantee as the full report — never audit against a rule set.
  if (input.region === GENERAL_REGION) {
    return { ...snapshot, complianceFindings: [] };
  }
  return snapshot;
}
