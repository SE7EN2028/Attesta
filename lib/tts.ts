// Shared Deepgram text-to-speech for the executive-summary "Listen" feature.
// Used both by the on-demand /listen route and by the pre-generation step in
// report generation (so a viewer's click plays instantly). Kept as a plain REST
// call (mirrors how Gemini is called) — no @deepgram/sdk coupling.

const DEEPGRAM_SPEAK_URL = "https://api.deepgram.com/v1/speak";

// English Aura-2 voice — always available, used as the universal fallback.
export const DEFAULT_VOICE = "aura-2-thalia-en";

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

function speak(text: string, voice: string, apiKey: string): Promise<Response> {
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

// Synthesizes the given text to a single MP3 Buffer. Voice is chosen from the
// report's outputLanguage (English fallback). Throws on hard failure — callers
// wrap this best-effort. `apiKeyOverride` falls back to DEEPGRAM_API_KEY.
export async function synthesizeSummaryAudio(
  text: string,
  outputLanguage: string,
  apiKeyOverride?: string
): Promise<Buffer> {
  const apiKey = apiKeyOverride || process.env.DEEPGRAM_API_KEY;
  if (!apiKey) {
    throw new Error("DEEPGRAM_API_KEY is not set.");
  }
  const summary = text.trim();
  if (!summary) {
    throw new Error("No text to synthesize.");
  }

  const mappedVoice = VOICE_BY_LANGUAGE[outputLanguage] ?? DEFAULT_VOICE;
  const chunks = chunkText(summary);
  const buffers: Buffer[] = [];

  for (const chunk of chunks) {
    let res = await speak(chunk, mappedVoice, apiKey);
    // A non-English mapped voice was rejected — fall back to the English voice.
    if (!res.ok && mappedVoice !== DEFAULT_VOICE) {
      res = await speak(chunk, DEFAULT_VOICE, apiKey);
    }
    if (!res.ok) {
      throw new Error(`Deepgram TTS failed (${res.status}).`);
    }
    buffers.push(Buffer.from(await res.arrayBuffer()));
  }

  return Buffer.concat(buffers);
}
