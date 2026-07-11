"use client";

import { useReducer, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createDraftMeetingRequest,
  runComplianceSnapshot,
  signUp,
  submitMeetingRequest,
  uploadSourceFile,
  type SnapshotResult,
} from "@/app/create/actions";
import { runReportGeneration, runTranscription } from "@/app/admin/actions";
import { getReportIdForRequest } from "@/app/try/actions";
import { ComplianceSnapshotView } from "@/components/compliance-snapshot-view";

type Step = 1 | 2 | 3 | "snapshot" | 4 | "done";

type Tier = "ESSENTIAL" | "SCOPE" | "PREMIUM";

// Flow behaviour after tier selection:
//  - "request" (default, /create): submit → SUBMITTED → "we'll be in touch".
//  - "live" (/try demo): submit → transcribe → generate → redirect to report.
type FlowMode = "request" | "live";

type LiveState =
  | { phase: "transcribing" }
  | { phase: "generating" }
  | { phase: "redirecting" }
  | { phase: "error"; stage: "submit" | "transcribe" | "generate"; message: string };

type FlowState = {
  step: Step;
  user: { id: string; email: string; companyName: string } | null;
  meetingRequestId: string | null;
  email: string;
  companyName: string;
  company: string;
  region: string;
  governingBody: string;
  meetingDate: string;
  title: string;
  outputLanguage: string;
  sourceFile: { fileName: string; type: string } | null;
  supportingFiles: { fileName: string; type: string }[];
  tier: Tier | null;
  notes: string;
  submitting: boolean;
  error: string | null;
};

type StringField =
  | "email"
  | "companyName"
  | "company"
  | "region"
  | "governingBody"
  | "meetingDate"
  | "title"
  | "outputLanguage"
  | "notes";

type Action =
  | { type: "SET_FIELD"; field: StringField; value: string }
  | { type: "SET_ERROR"; error: string | null }
  | { type: "SET_SUBMITTING"; submitting: boolean }
  | {
    type: "SIGNED_UP";
    user: { id: string; email: string; companyName: string };
  }
  | { type: "DRAFT_CREATED"; meetingRequestId: string }
  | { type: "FILE_UPLOADED"; fileName: string; fileType: string }
  | { type: "SUPPORTING_FILE_UPLOADED"; fileName: string; fileType: string }
  | { type: "SET_TIER"; tier: Tier }
  | { type: "GO_TO"; step: Step }
  | { type: "RESET_SOURCE_FILE" }
  | { type: "SUBMITTED" };

function reducer(state: FlowState, action: Action): FlowState {
  switch (action.type) {
    case "SET_FIELD":
      return { ...state, [action.field]: action.value, error: null };
    case "SET_ERROR":
      return { ...state, error: action.error, submitting: false };
    case "SET_SUBMITTING":
      return { ...state, submitting: action.submitting, error: null };
    case "SIGNED_UP":
      return {
        ...state,
        user: action.user,
        company: action.user.companyName,
        step: 2,
        submitting: false,
        error: null,
      };
    case "DRAFT_CREATED":
      return {
        ...state,
        meetingRequestId: action.meetingRequestId,
        step: 3,
        submitting: false,
        error: null,
      };
    case "FILE_UPLOADED":
      return {
        ...state,
        sourceFile: { fileName: action.fileName, type: action.fileType },
        submitting: false,
        error: null,
      };
    case "SUPPORTING_FILE_UPLOADED":
      return {
        ...state,
        supportingFiles: [
          ...state.supportingFiles,
          { fileName: action.fileName, type: action.fileType },
        ],
        submitting: false,
        error: null,
      };
    case "SET_TIER":
      return { ...state, tier: action.tier };
    case "GO_TO":
      return { ...state, step: action.step, error: null };
    case "RESET_SOURCE_FILE":
      return { ...state, sourceFile: null };
    case "SUBMITTED":
      return { ...state, step: "done", submitting: false, error: null };
    default:
      return state;
  }
}

const REGIONS = [
  // "General" is jurisdiction-neutral — a plain professional report with no
  // works-council / labour-law framing and no compliance audit. Listed first.
  { value: "General", live: true },
  { value: "France", live: true },
  { value: "Germany", live: true },
  { value: "Belgium", live: true },
  { value: "Netherlands", live: true },
  { value: "UK", live: false },
  { value: "USA", live: false },
  { value: "Canada", live: false },
];

// Governing bodies are region-specific — each region's real statutory
// works-council structures. All live regions run the same transcription +
// report pipeline; compliance-audit depth differs (only France has a verified
// rule set — see lib/report-generation.ts). "General" has no jurisdiction-
// specific body and no compliance audit at all.
const GOVERNING_BODIES_BY_REGION: Record<
  string,
  { value: string; label: string }[]
> = {
  General: [{ value: "General", label: "Standard meeting — general / other" }],
  France: [
    { value: "CSE", label: "CSE — works council" },
    { value: "CSSCT", label: "CSSCT — health & safety" },
    { value: "HR", label: "HR — internal meeting" },
    { value: "AG", label: "AG — general assembly" },
  ],
  Germany: [{ value: "Betriebsrat", label: "Betriebsrat — works council" }],
  Belgium: [
    {
      value: "CE/OR",
      label: "Conseil d'Entreprise / Ondernemingsraad — works council",
    },
    { value: "CPPT/CPBW", label: "CPPT / CPBW — health & safety" },
  ],
  Netherlands: [
    {
      value: "Ondernemingsraad",
      label: "Ondernemingsraad — works council (OR)",
    },
    {
      value: "PVT",
      label: "Personeelsvertegenwoordiging — staff representation (PVT)",
    },
  ],
};

const OUTPUT_LANGUAGES = [
  "English",
  "Français",
  "Deutsch",
  "Español",
  "Italiano",
  "Nederlands",
  "Português",
  "Polski",
];

const TIERS: { value: Tier; name: string; features: string[] }[] = [
  {
    value: "ESSENTIAL",
    name: "Essential",
    features: [
      "Chronological summary",
      "Basic compliance check",
      "Speaker-name correction only",
      "PDF output",
    ],
  },
  {
    value: "SCOPE",
    name: "Scope",
    features: [
      "Agenda-based structure",
      "Full compliance audit",
      "Full text + speaker edits",
      "PDF + DOCX + decision log",
    ],
  },
  {
    value: "PREMIUM",
    name: "Premium",
    features: [
      "Formal legal layout",
      "Clause-by-clause review",
      "Human reviewer pass (optional)",
      "Signed + branded + audit-trail",
    ],
  },
];

const ACCEPTED_EXTENSIONS = [".mp3", ".mp4", ".wav", ".m4a", ".docx", ".pdf"];
const SUPPORTING_DOC_EXTENSIONS = [".docx", ".pdf"];

function initialState(
  initialUser: { id: string; email: string; companyName: string } | null
): FlowState {
  return {
    step: initialUser ? 2 : 1,
    user: initialUser,
    meetingRequestId: null,
    email: "",
    companyName: "",
    company: initialUser?.companyName ?? "",
    region: "",
    governingBody: "",
    meetingDate: "",
    title: "",
    outputLanguage: "",
    sourceFile: null,
    supportingFiles: [],
    tier: null,
    notes: "",
    submitting: false,
    error: null,
  };
}

export function CreateFlow({
  initialUser,
  mode = "request",
}: {
  initialUser: { id: string; email: string; companyName: string } | null;
  mode?: FlowMode;
}) {
  const [state, dispatch] = useReducer(reducer, initialUser, initialState);
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supportingInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [draggingSupporting, setDraggingSupporting] = useState(false);
  const [live, setLive] = useState<LiveState | null>(null);
  const [snapshot, setSnapshot] = useState<SnapshotResult | null>(null);
  const [snapPhase, setSnapPhase] = useState<"idle" | "running" | "error">(
    "idle"
  );
  const [snapError, setSnapError] = useState("");

  const numericStep = state.step === "done" ? 4 : state.step;

  async function handleSignUp() {
    dispatch({ type: "SET_SUBMITTING", submitting: true });
    const result = await signUp({
      email: state.email,
      companyName: state.companyName,
    });
    if (!result.ok) {
      dispatch({ type: "SET_ERROR", error: result.error });
      return;
    }
    dispatch({ type: "SIGNED_UP", user: result.data });
  }

  async function handleCreateDraft() {
    dispatch({ type: "SET_SUBMITTING", submitting: true });
    const result = await createDraftMeetingRequest({
      company: state.company,
      region: state.region,
      governingBody: state.governingBody,
      meetingDate: state.meetingDate,
      title: state.title,
      outputLanguage: state.outputLanguage,
      meetingRequestId: state.meetingRequestId ?? undefined,
    });
    if (!result.ok) {
      dispatch({ type: "SET_ERROR", error: result.error });
      return;
    }
    dispatch({ type: "DRAFT_CREATED", meetingRequestId: result.data.id });
  }

  async function handleFile(file: File) {
    if (!state.meetingRequestId) return;
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      dispatch({
        type: "SET_ERROR",
        error: "Unsupported file type. Use MP3, MP4, WAV, M4A, DOCX or PDF.",
      });
      return;
    }

    dispatch({ type: "SET_SUBMITTING", submitting: true });
    const formData = new FormData();
    formData.set("meetingRequestId", state.meetingRequestId);
    formData.set("role", "PRIMARY_MEETING");
    formData.set("file", file);
    const result = await uploadSourceFile(formData);
    if (!result.ok) {
      dispatch({ type: "SET_ERROR", error: result.error });
      return;
    }
    dispatch({
      type: "FILE_UPLOADED",
      fileName: result.data.fileName,
      fileType: result.data.type,
    });
  }

  async function handleSupportingFiles(files: File[]) {
    if (!state.meetingRequestId) return;

    for (const file of files) {
      const extension = "." + file.name.split(".").pop()?.toLowerCase();
      if (!SUPPORTING_DOC_EXTENSIONS.includes(extension)) {
        dispatch({
          type: "SET_ERROR",
          error: "Supporting documents must be DOCX or PDF.",
        });
        continue;
      }

      dispatch({ type: "SET_SUBMITTING", submitting: true });
      const formData = new FormData();
      formData.set("meetingRequestId", state.meetingRequestId);
      formData.set("role", "SUPPORTING_DOCUMENT");
      formData.set("file", file);
      const result = await uploadSourceFile(formData);
      if (!result.ok) {
        dispatch({ type: "SET_ERROR", error: result.error });
        continue;
      }
      dispatch({
        type: "SUPPORTING_FILE_UPLOADED",
        fileName: result.data.fileName,
        fileType: result.data.type,
      });
    }
  }

  async function handleSubmit() {
    if (!state.meetingRequestId || !state.tier) return;
    if (mode === "live") {
      runLive("submit");
      return;
    }
    dispatch({ type: "SET_SUBMITTING", submitting: true });
    const result = await submitMeetingRequest({
      meetingRequestId: state.meetingRequestId,
      tier: state.tier,
      notes: state.notes,
    });
    if (!result.ok) {
      dispatch({ type: "SET_ERROR", error: result.error });
      return;
    }
    dispatch({ type: "SUBMITTED" });
  }

  // Live demo path: run the real pipeline synchronously and land on the
  // generated report. Resumable — a retry re-enters at the failed stage so a
  // generation-only failure doesn't re-run Deepgram.
  async function runLive(from: "submit" | "transcribe" | "generate") {
    const id = state.meetingRequestId;
    if (!id || !state.tier) return;
    let stage: "submit" | "transcribe" | "generate" = from;

    if (stage === "submit") {
      setLive({ phase: "transcribing" });
      const s = await submitMeetingRequest({
        meetingRequestId: id,
        tier: state.tier,
        notes: state.notes,
      });
      if (!s.ok) {
        setLive({ phase: "error", stage: "submit", message: s.error });
        return;
      }
      stage = "transcribe";
    }

    if (stage === "transcribe") {
      setLive({ phase: "transcribing" });
      const t = await runTranscription(id);
      if (!t.ok) {
        setLive({ phase: "error", stage: "transcribe", message: t.error });
        return;
      }
      stage = "generate";
    }

    if (stage === "generate") {
      setLive({ phase: "generating" });
      // Fail-fast budget for live demo: 90s timeout, 2 attempts (~2 min total)
      const g = await runReportGeneration(id, {
        timeoutMs: 90_000,
        retries: 2,
      });
      if (!g.ok) {
        setLive({ phase: "error", stage: "generate", message: g.error });
        return;
      }
      const r = await getReportIdForRequest(id);
      if (!r.ok) {
        setLive({ phase: "error", stage: "generate", message: r.error });
        return;
      }
      setLive({ phase: "redirecting" });
      router.push(`/report/${r.data.reportId}`);
    }
  }

  // Runs the free Instant Compliance Snapshot after upload, before tier. On
  // success it advances to the read-only snapshot screen; on failure it shows
  // an error with retry. Shared by /create and /try.
  async function handleRunSnapshot() {
    if (!state.meetingRequestId) return;
    setSnapPhase("running");
    setSnapError("");
    const res = await runComplianceSnapshot(state.meetingRequestId);
    if (!res.ok) {
      setSnapPhase("error");
      setSnapError(res.error);
      return;
    }
    setSnapshot(res.data);
    setSnapPhase("idle");
    dispatch({ type: "GO_TO", step: "snapshot" });
  }

  const step2Valid =
    state.company.trim() &&
    REGIONS.some((r) => r.live && r.value === state.region) &&
    state.governingBody &&
    state.meetingDate &&
    state.title.trim() &&
    state.outputLanguage;

  const step1Valid = state.email.includes("@") && state.companyName.trim();

  if (snapPhase === "running") {
    return (
      <Container className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <svg
          className="h-10 w-10 animate-spin text-rust-400"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <Eyebrow className="mt-6">Compliance snapshot</Eyebrow>
        <h1 className="mt-4 max-w-xl font-serif text-3xl text-cream-100 md:text-4xl">
          Analyzing your meeting…
        </h1>
        <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-cream-300">
          Building your free, read-only compliance snapshot from the recording
          and any supporting documents — a quick preview before you choose a
          tier.
        </p>
        <p className="mt-3 max-w-md text-[13px] leading-relaxed text-cream-500">
          Large or complex meetings can take a minute or more to analyze.
        </p>
      </Container>
    );
  }

  if (snapPhase === "error") {
    return (
      <Container className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Eyebrow>Snapshot failed</Eyebrow>
        <h1 className="mt-4 font-serif text-3xl text-cream-100 md:text-4xl">
          Couldn&apos;t build the snapshot.
        </h1>
        <p className="mt-3 max-w-lg text-[14.5px] leading-relaxed text-rust-400">
          {snapError}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={handleRunSnapshot}>Retry</Button>
          <Button
            variant="outline"
            onClick={() => {
              setSnapPhase("idle");
              dispatch({ type: "GO_TO", step: 3 });
            }}
          >
            ← Back to upload
          </Button>
        </div>
      </Container>
    );
  }

  if (state.step === "snapshot" && snapshot) {
    return (
      <Container>
        <div>
          <Eyebrow>Compliance snapshot · free preview</Eyebrow>
          <h1 className="mt-4 font-serif text-3xl text-cream-100 md:text-4xl">
            {snapshot.meetingTitle}
          </h1>
          <p className="mt-3 max-w-xl text-[15px] text-cream-300">
            {snapshot.company} · {snapshot.region} · {snapshot.governingBody} ·
            read-only
          </p>
        </div>

        <div className="mt-10">
          <ComplianceSnapshotView {...snapshot} />
        </div>

        <div className="mt-12 flex flex-wrap items-center justify-between gap-3 border-t border-cream-200/10 pt-8">
          <Button
            variant="outline"
            onClick={() => dispatch({ type: "GO_TO", step: 3 })}
          >
            ← Back
          </Button>
          <Button onClick={() => dispatch({ type: "GO_TO", step: 4 })}>
            Continue to tier selection →
          </Button>
        </div>
      </Container>
    );
  }

  if (state.step === "done") {
    return (
      <Container className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <Eyebrow>Request received</Eyebrow>
        <h1 className="mt-5 font-serif text-4xl text-cream-100 md:text-5xl">
          We&apos;ll be in touch.
        </h1>
        <p className="mt-4 max-w-md text-[15px] leading-relaxed text-cream-300">
          Your request for <span className="text-cream-100">{state.title}</span>{" "}
          is in the queue. A specialist reviews the transcript, runs the
          compliance audit, and locks the report before it reaches your
          account.
        </p>
        <Button asChild className="mt-8">
          <Link href="/">Back to home</Link>
        </Button>
      </Container>
    );
  }

  if (mode === "live" && live) {
    if (live.phase === "error") {
      const heading =
        live.stage === "transcribe"
          ? "Transcription failed"
          : live.stage === "generate"
            ? "Report generation didn't complete"
            : "Submission failed";
      const softMessage =
        live.stage === "generate"
          ? "The model can be busy right now — this may fail occasionally. Feel free to try again."
          : live.message;
      return (
        <Container className="flex min-h-[60vh] flex-col items-center justify-center text-center">
          <Eyebrow>Pipeline failed</Eyebrow>
          <h1 className="mt-4 font-serif text-3xl text-cream-100 md:text-4xl">
            {heading}
          </h1>
          <p className="mt-3 max-w-lg text-[14.5px] leading-relaxed text-rust-400">
            {softMessage}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button onClick={() => runLive(live.stage)}>Retry</Button>
            <Button asChild variant="outline">
              <Link href="/">Back to home</Link>
            </Button>
          </div>
        </Container>
      );
    }

    const heading =
      live.phase === "transcribing"
        ? "Transcribing your meeting…"
        : live.phase === "generating"
          ? "Generating your report — this can take a few minutes…"
          : "Report ready — opening it now…";
    const subtext =
      live.phase === "transcribing"
        ? "Sending your source to transcription (Deepgram for audio/video, text extraction for documents)."
        : live.phase === "generating"
          ? "Drafting the full structured report from the transcript — attendance, agenda, discussion, decisions and votes."
          : "Taking you straight to your generated report.";
    return (
      <Container className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <svg
          className="h-10 w-10 animate-spin text-rust-400"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <Eyebrow className="mt-6">Live pipeline</Eyebrow>
        <h1 className="mt-4 max-w-xl font-serif text-3xl text-cream-100 md:text-4xl">
          {heading}
        </h1>
        <p className="mt-4 max-w-md text-[14.5px] leading-relaxed text-cream-300">
          {subtext}
        </p>
        {live.phase === "generating" && (
          <p className="mt-3 max-w-md text-[13px] leading-relaxed text-cream-500">
            Large or complex meetings take longer — a full report can run
            several minutes.
          </p>
        )}
      </Container>
    );
  }

  return (
    <Container>
      <div className="flex items-center justify-between">
        <Eyebrow>Create your report</Eyebrow>
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-cream-500">
          Step {numericStep} / 4
        </p>
      </div>

      {state.step === 1 && (
        <div className="mt-8 max-w-md">
          <h1 className="font-serif text-3xl text-cream-100">Sign up</h1>
          <p className="mt-3 text-[14.5px] text-cream-300">
            No password needed yet — this just ties your requests to an
            accountable owner.
          </p>

          <div className="mt-8 space-y-4 rounded-md border border-cream-200/10 bg-ink-850 p-8">
            <LabeledInput
              label="Email"
              type="email"
              value={state.email}
              onChange={(v) =>
                dispatch({ type: "SET_FIELD", field: "email", value: v })
              }
              placeholder="you@company.com"
            />
            <LabeledInput
              label="Company name"
              value={state.companyName}
              onChange={(v) =>
                dispatch({
                  type: "SET_FIELD",
                  field: "companyName",
                  value: v,
                })
              }
              placeholder="Style IT"
            />

            {state.error && <ErrorText>{state.error}</ErrorText>}

            <Button
              className="w-full"
              disabled={!step1Valid || state.submitting}
              onClick={handleSignUp}
            >
              {state.submitting ? "Continuing…" : "Continue"}
            </Button>
          </div>
        </div>
      )}

      {state.step === 2 && (
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <div className="rounded-md border border-cream-200/10 bg-ink-850 p-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-rust-400">
              Step 2 · About your meeting
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <LabeledInput
                label="Company"
                value={state.company}
                onChange={(v) =>
                  dispatch({ type: "SET_FIELD", field: "company", value: v })
                }
              />
              <LabeledInput
                label="Meeting title"
                value={state.title}
                onChange={(v) =>
                  dispatch({ type: "SET_FIELD", field: "title", value: v })
                }
                placeholder="September ordinary session"
              />
            </div>

            <div className="mt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-cream-500">
                Region
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {REGIONS.map((r) => {
                  const selected = state.region === r.value;
                  return (
                    <button
                      key={r.value}
                      type="button"
                      disabled={!r.live}
                      onClick={() => {
                        // Switching region resets the governing body to that
                        // region's first option — bodies differ per region.
                        dispatch({
                          type: "SET_FIELD",
                          field: "region",
                          value: r.value,
                        });
                        dispatch({
                          type: "SET_FIELD",
                          field: "governingBody",
                          value:
                            GOVERNING_BODIES_BY_REGION[r.value]?.[0]?.value ?? "",
                        });
                      }}
                      className={cn(
                        "rounded-full border px-3 py-1 font-mono text-[11px] transition-colors",
                        selected
                          ? "border-rust-400/40 bg-rust-400/10 text-rust-400"
                          : r.live
                            ? "border-cream-200/15 text-cream-300 hover:border-cream-200/30"
                            : "cursor-not-allowed border-cream-200/10 text-cream-500 opacity-60"
                      )}
                    >
                      {r.value}
                      {!r.live && " — coming soon"}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-cream-500">
                Governing body
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {(GOVERNING_BODIES_BY_REGION[state.region] ?? []).length === 0 && (
                  <span className="font-mono text-[11px] text-cream-500">
                    Select a region first
                  </span>
                )}
                {(GOVERNING_BODIES_BY_REGION[state.region] ?? []).map((g) => {
                  const selected = state.governingBody === g.value;
                  return (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() =>
                        dispatch({
                          type: "SET_FIELD",
                          field: "governingBody",
                          value: g.value,
                        })
                      }
                      className={cn(
                        "rounded-full border px-3 py-1 font-mono text-[11px] transition-colors",
                        selected
                          ? "border-rust-400/40 bg-rust-400/10 text-rust-400"
                          : "border-cream-200/15 text-cream-300 hover:border-cream-200/30"
                      )}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <LabeledInput
                label="Meeting date"
                type="date"
                value={state.meetingDate}
                onChange={(v) =>
                  dispatch({
                    type: "SET_FIELD",
                    field: "meetingDate",
                    value: v,
                  })
                }
              />
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-cream-500">
                  Report language
                </p>
                <select
                  value={state.outputLanguage}
                  onChange={(e) =>
                    dispatch({
                      type: "SET_FIELD",
                      field: "outputLanguage",
                      value: e.target.value,
                    })
                  }
                  className="mt-1.5 w-full rounded border border-cream-200/15 bg-ink-900 px-3 py-2 text-[13px] text-cream-100"
                >
                  <option value="">Select a language</option>
                  {OUTPUT_LANGUAGES.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <p className="mt-6 font-mono text-[11px] text-cream-500">
              Selection: {state.region || "—"} → {state.governingBody || "—"} →{" "}
              {state.outputLanguage || "—"}
            </p>

            {state.error && <ErrorText className="mt-4">{state.error}</ErrorText>}

            <Button
              className="mt-6 w-full"
              disabled={!step2Valid || state.submitting}
              onClick={handleCreateDraft}
            >
              {state.submitting ? "Continuing…" : "Continue"}
            </Button>
          </div>

          <SummaryCard state={state} />
        </div>
      )}

      {state.step === 3 && (
        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <div className="rounded-md border border-cream-200/10 bg-ink-850 p-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-rust-400">
              Step 3 · Source file
            </p>

            {!state.sourceFile ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const file = e.dataTransfer.files?.[0];
                  if (file) void handleFile(file);
                }}
                className={cn(
                  "mt-4 rounded-md border-2 border-dashed p-10 text-center transition-colors",
                  dragging
                    ? "border-rust-400/60 bg-rust-400/5"
                    : "border-cream-200/15"
                )}
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-cream-400">
                  {state.submitting
                    ? "Uploading…"
                    : "Drag a file here, or"}
                </p>
                {!state.submitting && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 font-mono text-[13px] text-rust-400 underline underline-offset-4"
                  >
                    browse your files
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_EXTENSIONS.join(",")}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) void handleFile(file);
                  }}
                />
                <p className="mt-4 font-mono text-[10.5px] text-cream-500">
                  MP3 · MP4 · WAV · M4A · DOCX · PDF
                </p>
              </div>
            ) : (
              <div className="mt-4">
                <div className="flex items-center justify-between rounded border border-cream-200/10 px-4 py-3">
                  <span className="text-[13px] text-cream-200">
                    {state.sourceFile.fileName}
                  </span>
                  <span className="font-mono text-[11px] text-cream-500">
                    {state.sourceFile.type}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => dispatch({ type: "RESET_SOURCE_FILE" })}
                  className="mt-2 font-mono text-[10.5px] text-cream-500 underline underline-offset-4 hover:text-cream-300"
                >
                  Replace file
                </button>
              </div>
            )}

            <div className="mt-8 border-t border-cream-200/10 pt-6">
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-cream-500">
                Supporting documents (optional) — policies, contracts, prior
                minutes
              </p>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDraggingSupporting(true);
                }}
                onDragLeave={() => setDraggingSupporting(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDraggingSupporting(false);
                  const files = Array.from(e.dataTransfer.files ?? []);
                  if (files.length) void handleSupportingFiles(files);
                }}
                className={cn(
                  "mt-2 rounded-md border-2 border-dashed p-6 text-center transition-colors",
                  draggingSupporting
                    ? "border-rust-400/60 bg-rust-400/5"
                    : "border-cream-200/15"
                )}
              >
                <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-cream-400">
                  {state.submitting ? "Uploading…" : "Drag files here, or"}
                </p>
                {!state.submitting && (
                  <button
                    type="button"
                    onClick={() => supportingInputRef.current?.click()}
                    className="mt-2 font-mono text-[12px] text-rust-400 underline underline-offset-4"
                  >
                    browse your files
                  </button>
                )}
                <input
                  ref={supportingInputRef}
                  type="file"
                  accept={SUPPORTING_DOC_EXTENSIONS.join(",")}
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length) void handleSupportingFiles(files);
                    e.target.value = "";
                  }}
                />
                <p className="mt-3 font-mono text-[10px] text-cream-500">
                  DOCX · PDF — multiple files allowed
                </p>
              </div>

              {state.supportingFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {state.supportingFiles.map((f) => (
                    <div
                      key={f.fileName}
                      className="flex items-center justify-between rounded border border-cream-200/10 px-4 py-2.5"
                    >
                      <span className="text-[13px] text-cream-200">
                        {f.fileName}
                      </span>
                      <span className="font-mono text-[11px] text-cream-500">
                        {f.type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {state.error && <ErrorText className="mt-4">{state.error}</ErrorText>}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                variant="outline"
                disabled={state.submitting}
                onClick={() => dispatch({ type: "GO_TO", step: 2 })}
              >
                ← Back
              </Button>
              {mode === "live" ? (
                // /try only: the free snapshot preview is optional — skip
                // straight to the full report, or run the snapshot first.
                <>
                  <Button
                    variant="outline"
                    disabled={!state.sourceFile || state.submitting}
                    onClick={() => dispatch({ type: "GO_TO", step: 4 })}
                  >
                    Skip to full report
                  </Button>
                  <Button
                    className="flex-1"
                    disabled={!state.sourceFile || state.submitting}
                    onClick={handleRunSnapshot}
                  >
                    Get free compliance snapshot →
                  </Button>
                </>
              ) : (
                // /create: straight to tier + report request, no snapshot.
                <Button
                  className="flex-1"
                  disabled={!state.sourceFile || state.submitting}
                  onClick={() => dispatch({ type: "GO_TO", step: 4 })}
                >
                  Continue →
                </Button>
              )}
            </div>
          </div>

          <SummaryCard state={state} />
        </div>
      )}

      {state.step === 4 && (
        <div className="mt-14 max-w-3xl">
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-rust-400">
            Step 4 · Tier &amp; notes
          </p>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {TIERS.map((t) => {
              const selected = state.tier === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => dispatch({ type: "SET_TIER", tier: t.value })}
                  className={cn(
                    "rounded-md border p-6 text-left transition-colors",
                    selected
                      ? "border-rust-400/40 bg-ink-950"
                      : "border-cream-200/10 bg-ink-850 hover:border-cream-200/20"
                  )}
                >
                  <h3 className="font-serif text-lg text-cream-100">
                    {t.name}
                  </h3>
                  <ul className="mt-3 space-y-1.5">
                    {t.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2 text-[12.5px] leading-relaxed text-cream-300"
                      >
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-rust-400" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-cream-500">
              Notes for the reviewer (optional)
            </p>
            <textarea
              value={state.notes}
              onChange={(e) =>
                dispatch({ type: "SET_FIELD", field: "notes", value: e.target.value })
              }
              rows={4}
              className="mt-1.5 w-full rounded border border-cream-200/15 bg-ink-900 px-3 py-2 text-[13px] text-cream-100"
              placeholder="Anything the reviewer should know about this session…"
            />
          </div>

          {state.error && <ErrorText className="mt-4">{state.error}</ErrorText>}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button
              variant="outline"
              disabled={state.submitting || live !== null}
              onClick={() => dispatch({ type: "GO_TO", step: 3 })}
            >
              ← Back
            </Button>
            <Button
              disabled={!state.tier || state.submitting || live !== null}
              onClick={handleSubmit}
            >
              {mode === "live"
                ? "Generate report now →"
                : state.submitting
                  ? "Submitting…"
                  : "Submit request"}
            </Button>
          </div>
        </div>
      )}
    </Container>
  );
}

function SummaryCard({ state }: { state: FlowState }) {
  return (
    <div className="att-lined-paper rounded-md p-8 text-slate-900">
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
        Summary report · builds as you type
      </p>
      <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
        Minutes · {state.governingBody || "—"}
      </p>
      <h3 className="mt-1 font-serif text-lg text-slate-900">
        {state.title || "Your meeting title"}
      </h3>
      <p className="mt-1 text-[12.5px] text-slate-600">
        {state.company || "Your company"}
      </p>

      <div className="mt-8 space-y-2 border-t border-slate-900/10 pt-4">
        {[
          ["Region", state.region || "—"],
          ["Governing body", state.governingBody || "—"],
          ["Language", state.outputLanguage || "—"],
          [
            "Date",
            state.meetingDate
              ? new Date(state.meetingDate).toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "long",
                year: "numeric",
              })
              : "—",
          ],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between text-[11px]">
            <span className="font-mono uppercase tracking-[0.08em] text-slate-400">
              {k}
            </span>
            <span className="font-semibold text-slate-900">{v}</span>
          </div>
        ))}
      </div>

      <p className="mt-8 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-400">
        Attesta · Draft cover
      </p>

      <p className="mt-10 text-[13px] leading-relaxed text-slate-500">
        This is a preview of your report cover. It updates as you type.
      </p>
    </div>
  );
}

function LabeledInput({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-cream-500">
        {label}
      </p>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        // For date inputs, clicking anywhere on the field opens the native
        // picker (not just the small calendar icon).
        onClick={
          type === "date"
            ? (e) => {
                const el = e.currentTarget;
                if (typeof el.showPicker === "function") el.showPicker();
              }
            : undefined
        }
        className={cn(
          "mt-1.5 w-full rounded border border-cream-200/15 bg-ink-900 px-3 py-2 text-[13px] text-cream-100",
          type === "date" && "cursor-pointer"
        )}
      />
    </div>
  );
}

function ErrorText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-[13px] text-rust-400", className)}>{children}</p>
  );
}
