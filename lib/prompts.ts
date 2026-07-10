import { prisma } from "@/lib/prisma";

// Admin-editable prompt library. The instructional TEXT of every prompt the
// report engine sends lives here as PROMPT_DEFAULTS (the single source of
// truth). An admin can override any entry by saving a Prompt row (see
// app/admin/prompt-actions.ts); loadPrompts() reads those rows and falls back
// to the default when a key has no row — so an empty table means "all
// defaults". Prompt ASSEMBLY (labels, ordering, {{var}} interpolation) and
// RESPONSE_SHAPE validation stay in code in lib/report-generation.ts; only the
// prose blocks below are editable.
//
// Defaults are copied VERBATIM from the former string literals in
// report-generation.ts. `${governingBody}` / `${region}` became the tokens
// `{{governingBody}}` / `{{region}}`, substituted by fill() at assembly time.

export type PromptKey =
  | "system"
  | "tier_essential"
  | "tier_premium"
  | "tier_scope"
  | "report_general_framing"
  | "report_base_instruction"
  | "compliance_general"
  | "compliance_core"
  | "compliance_verified_suffix"
  | "compliance_unverified_suffix"
  | "snapshot_instruction"
  | "snapshot_base_instruction";

export type PromptDefault = { label: string; default: string };

export const PROMPT_DEFAULTS: Record<PromptKey, PromptDefault> = {
  system: {
    label: "System prompt",
    default:
      "You are Attesta's report-generation engine. You turn a meeting transcript (plus optional supporting reference documents) into structured statutory meeting minutes. You always respond with a single valid JSON object and nothing else — no markdown code fences, no commentary before or after the JSON.",
  },
  tier_essential: {
    label: "Tier — Essential",
    default:
      "ESSENTIAL: chronological summary only. executiveSummary + discussionLog in time order. agendaItems/decisions/votes = empty arrays, always.",
  },
  tier_premium: {
    label: "Tier — Premium",
    default:
      "PREMIUM: full agenda structure (agendaItems ordered; discussionLog/decisions/votes reference them via agendaItemRef). Fill decisions/votes where the transcript supports them. executiveSummary + closingNotes in a formal legal register.",
  },
  tier_scope: {
    label: "Tier — Scope (default)",
    default:
      "SCOPE: full agenda structure (agendaItems ordered; discussionLog/decisions/votes reference them via agendaItemRef). Fill decisions/votes where the transcript supports them.",
  },
  report_general_framing: {
    label: "Report — General-region framing",
    default:
      "GENERAL REPORT: produce a clear, professional meeting record — attendance, agenda, discussion log, decisions and votes where the transcript supports them. Keep it jurisdiction-neutral: do NOT reference any country's labour law, works-council framework, statutes, or legal/regulatory citations.",
  },
  report_base_instruction: {
    label: "Report — Base instruction",
    default:
      "Base every field strictly on the transcript above — no invented names, votes, or figures. onTopicScore is 0-100. numericalData covers any figures/amounts/counts/dates mentioned. Use an empty array or a short honest note instead of fabricating content.",
  },
  compliance_general: {
    label: "Compliance — General (no audit)",
    default:
      "COMPLIANCE FINDINGS: return an empty array []. This is a general professional meeting report and is NOT audited against any regulatory, statutory, or works-council framework. Produce no compliance findings and no legal or regulatory references of any kind.",
  },
  compliance_core: {
    label: "Compliance — Core audit ({{governingBody}})",
    default: `COMPLIANCE FINDINGS: audit the transcript itself (not the report you just wrote) against standard works-council procedure for a {{governingBody}} meeting. Check, where the transcript gives evidence either way: quorum (was a headcount or present/total stated, and does it meet a typical threshold?), notice/convocation period before the meeting, whether votes were called with a recorded headcount vs. just "no objection", approval of prior minutes, and standard documents a meeting of this type usually references (attendance sheet, written employer answers to prior questions) that are notably absent or notably present.
Each finding must cite what in the transcript supports it (fold that into description/impactDescription) — do not invent findings the transcript gives no evidence for. If the transcript is silent on something (e.g. convocation timing), either omit it or file it as MISSING_DOCUMENT/ADVISORY with lower confidence, not as a confident RISK. confidence (0-100) reflects your certainty given what the transcript actually shows. Include both problems (RISK/MISSING_DOCUMENT/RECOMMENDATION) and things done correctly (COMPLIANT) if evidenced. Empty array if the transcript gives no basis for any finding.`,
  },
  compliance_verified_suffix: {
    label: "Compliance — Verified-region suffix ({{region}})",
    default:
      "This meeting is under the verified {{region}} rule set. You may also check France-specific items where evidenced (e.g. BDESE consultation, statutory notice periods). ruleReference is a real statute/article (e.g. French Labour Code) ONLY if you are confident of the exact citation for {{region}}, otherwise null — never invent a citation.",
  },
  compliance_unverified_suffix: {
    label: "Compliance — Unverified-region suffix ({{region}})",
    default:
      "IMPORTANT — {{region}} is supported but Attesta has NOT verified a {{region}} statutory rule set. Keep every finding GENERAL and procedural: observations that hold for any works-council meeting, framed as general good practice, NOT as a jurisdiction-specific legal audit. Do NOT cite, name, or paraphrase any {{region}} statute, article, or labour-code provision. ruleReference MUST be null for every finding. Do not imply these findings are checked against {{region}} law.",
  },
  snapshot_instruction: {
    label: "Snapshot — Instruction",
    default:
      "INSTANT COMPLIANCE SNAPSHOT: this is a fast, free, read-only preview. Produce ONLY three outputs and nothing else — complianceFindings, speakerAnalytics, numericalData. Do NOT write minutes, agenda, discussion log, decisions, votes, or any narrative report content.",
  },
  snapshot_base_instruction: {
    label: "Snapshot — Base instruction",
    default:
      "speakerAnalytics: one entry per distinct speaker (talkTimeSeconds, contributionCount, onTopicScore 0-100). numericalData: any figures/amounts/counts/dates mentioned in the meeting or the supporting documents. Base everything strictly on the transcript and supporting documents — no invented names, figures, or findings.",
  },
};

// Placeholders each prompt MUST retain, so an edit can't silently drop a
// {{var}} the assembly relies on. Enforced by savePrompt.
export const REQUIRED_PLACEHOLDERS: Partial<Record<PromptKey, string[]>> = {
  compliance_core: ["{{governingBody}}"],
  compliance_verified_suffix: ["{{region}}"],
  compliance_unverified_suffix: ["{{region}}"],
};

export const PROMPT_KEYS = Object.keys(PROMPT_DEFAULTS) as PromptKey[];

export function isPromptKey(key: string): key is PromptKey {
  return key in PROMPT_DEFAULTS;
}

export type PromptResolver = { resolve: (key: PromptKey) => string };

// Reads all override rows once and returns a synchronous resolver — callers
// (buildPrompt/buildSnapshotPrompt) stay sync so the token-count pass is
// unaffected. dbText ?? default is the whole fallback story.
export async function loadPrompts(): Promise<PromptResolver> {
  const rows = await prisma.prompt.findMany();
  const overrides = new Map(rows.map((r) => [r.key, r.text]));
  return {
    resolve: (key) => overrides.get(key) ?? PROMPT_DEFAULTS[key].default,
  };
}

// Substitutes {{name}} tokens. Unknown tokens are left intact rather than
// blanked, so a typo is visible in the prompt instead of silently dropped.
export function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in vars ? vars[name] : match
  );
}
