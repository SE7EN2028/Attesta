"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  runTranscription,
  runReportGeneration,
  lockReport,
} from "@/app/admin/actions";
import type { GeneratedReport } from "@/lib/report-generation";
import {
  SourceFileLinks,
  type SourceFileLink,
} from "@/components/source-file-links";
import { useAdminKeys } from "@/components/admin-keys";

export type PipelineRow = {
  meetingRequestId: string;
  reportId: string | null;
  title: string;
  company: string;
  tier: string;
  ownerEmail: string;
  createdAt: string;
  files: SourceFileLink[];
  hasPrimaryTranscript: boolean;
  meetingRequestStatus: string; // SUBMITTED … DISPATCHED
  reportStatus: string | null; // DRAFT | LOCKED | null
  lockedBy: string | null;
};

// A request's whole lifecycle in one card. `base` stage is derived from server
// data; `local` (session-only, forward-only) lets a card advance in place after
// an async step without a re-fetch that would re-mount / relocate it.
type Stage = "transcribe" | "generate" | "finalize" | "locked" | "sent";
const RANK: Record<Stage, number> = {
  transcribe: 0,
  generate: 1,
  finalize: 2,
  locked: 3,
  sent: 4,
};

const STAGE_LABEL: Record<Stage, string> = {
  transcribe: "Awaiting transcription",
  generate: "Ready to generate",
  finalize: "Drafted",
  locked: "Locked",
  sent: "Sent",
};

type RowUi = {
  stage?: Stage; // local forward-only advance (only ever set to "generate")
  op?: "running" | "error";
  error?: string;
  transcript?: { rawText: string; speakerCount: number };
  generated?: GeneratedReport;
  emailWarning?: string;
};

function baseStage(row: PipelineRow): Stage {
  if (row.meetingRequestStatus === "DISPATCHED") return "sent";
  if (row.reportStatus === "LOCKED") return "locked";
  if (row.reportStatus === "DRAFT") return "finalize";
  if (row.hasPrimaryTranscript) return "generate";
  return "transcribe";
}

export function AdminPipelineList({
  initialRows,
}: {
  initialRows: PipelineRow[];
}) {
  const router = useRouter();
  const { geminiKey, deepgramKey } = useAdminKeys();
  const [ui, setUiState] = useState<Record<string, RowUi>>({});

  function patch(id: string, next: Partial<RowUi>) {
    setUiState((prev) => ({ ...prev, [id]: { ...prev[id], ...next } }));
  }

  async function handleTranscribe(id: string) {
    patch(id, { op: "running", error: undefined });
    // Admin always transcribes fresh (a re-run should re-hit Deepgram); the
    // reuse-existing default is for the /try snapshot→generate path.
    const result = await runTranscription(id, {
      force: true,
      deepgramKey: deepgramKey || undefined,
    });
    if (!result.ok) {
      patch(id, { op: "error", error: result.error });
      return;
    }
    // No refresh: keep the card in place with its transcript preview, and let
    // the admin consciously advance via "Move to report generation".
    patch(id, { op: undefined, transcript: result.data });
  }

  async function handleGenerate(id: string) {
    patch(id, { op: "running", error: undefined });
    const result = await runReportGeneration(id, undefined, geminiKey || undefined);
    if (!result.ok) {
      patch(id, { op: "error", error: result.error });
      return;
    }
    patch(id, { op: undefined, generated: result.data });
  }

  async function handleLock(id: string) {
    patch(id, { op: "running", error: undefined, emailWarning: undefined });
    const result = await lockReport(id);
    if (!result.ok) {
      patch(id, { op: "error", error: result.error });
      return;
    }
    // Hoist out of the closure so the truthy narrowing (string, not
    // string | undefined) is preserved for the warning field.
    const warning = result.emailWarning;
    patch(id, { op: undefined, emailWarning: warning });
    // Card stays in place (single stable list) — refresh only updates its props
    // to the new LOCKED / DISPATCHED state.
    router.refresh();
  }

  if (initialRows.length === 0) {
    return (
      <p className="text-[14.5px] text-cream-400">
        No requests in the pipeline yet.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {initialRows.map((row) => {
        const id = row.meetingRequestId;
        const state = ui[id] ?? {};
        const base = baseStage(row);
        const stage: Stage =
          state.stage && RANK[state.stage] > RANK[base] ? state.stage : base;
        const running = state.op === "running";
        const hasPrimaryFile = row.files.some(
          (f) => f.role === "PRIMARY_MEETING"
        );

        return (
          <div
            key={id}
            className="rounded-md border border-cream-200/10 bg-ink-850 p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-rust-400">
                    {row.tier}
                  </span>
                  <span className="rounded-full border border-cream-200/20 bg-cream-200/5 px-2.5 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.1em] text-cream-300">
                    {STAGE_LABEL[stage]}
                  </span>
                </div>
                <h3 className="mt-1.5 font-serif text-lg text-cream-100">
                  {row.title}
                </h3>
                <p className="mt-1 text-[13px] text-cream-400">
                  {row.company} · {row.ownerEmail}
                </p>
                <div className="mt-3">
                  <SourceFileLinks files={row.files} />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3">
                {stage === "transcribe" && (
                  <Button
                    size="sm"
                    disabled={running || !hasPrimaryFile}
                    onClick={() => handleTranscribe(id)}
                  >
                    {running
                      ? "Transcribing…"
                      : state.transcript
                        ? "Re-run transcription"
                        : "Run transcription"}
                  </Button>
                )}

                {stage === "generate" && (
                  <Button
                    size="sm"
                    disabled={running}
                    onClick={() => handleGenerate(id)}
                  >
                    {running && <Spinner />}
                    {running
                      ? "Generating…"
                      : state.generated
                        ? "Re-generate report"
                        : "Generate report"}
                  </Button>
                )}

                {stage === "finalize" && row.reportId && (
                  <>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/report/${row.reportId}`}>View report</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/edit/${row.reportId}`}>Edit</Link>
                    </Button>
                    <Button
                      size="sm"
                      disabled={running}
                      onClick={() => handleLock(id)}
                    >
                      {running ? "Locking…" : "Lock report"}
                    </Button>
                  </>
                )}

                {stage === "locked" && row.reportId && (
                  <>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/report/${row.reportId}`}>View report</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={running}
                      onClick={() => handleLock(id)}
                    >
                      {running ? "Retrying…" : "Resend email"}
                    </Button>
                  </>
                )}

                {stage === "sent" && (
                  <>
                    {row.reportId && (
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/report/${row.reportId}`}>
                          View report
                        </Link>
                      </Button>
                    )}
                    <span className="rounded-full border border-green-400/30 bg-green-400/5 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-green-400">
                      Sent ✓
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Error (any stage) */}
            {state.op === "error" && state.error && (
              <p className="mt-4 rounded border border-rust-400/30 bg-rust-400/5 px-4 py-3 text-[13px] text-rust-400">
                {state.error}
              </p>
            )}

            {/* Transcribe stage — success + conscious advance */}
            {stage === "transcribe" && state.transcript && (
              <div className="mt-4 rounded border border-green-400/20 bg-green-400/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-green-400">
                    Transcribed · {state.transcript.speakerCount} speaker
                    {state.transcript.speakerCount === 1 ? "" : "s"}
                  </p>
                  <Button size="sm" onClick={() => patch(id, { stage: "generate" })}>
                    Move to report generation →
                  </Button>
                </div>
                <p
                  className={cn(
                    "mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed text-cream-300"
                  )}
                >
                  {state.transcript.rawText || "(empty transcript)"}
                </p>
              </div>
            )}

            {/* Generate stage — running note */}
            {stage === "generate" && running && (
              <p className="mt-4 text-[13px] text-cream-400">
                Generating report — this can take several minutes due to AI
                processing load.
              </p>
            )}

            {/* Generate stage — success + conscious advance */}
            {stage === "generate" && state.generated && (
              <div className="mt-4 rounded border border-green-400/20 bg-green-400/5 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-green-400">
                    Report drafted · status: DRAFT · generated by:{" "}
                    {state.generated.generatedBy}
                  </p>
                  <Button size="sm" onClick={() => router.refresh()}>
                    Finalize report →
                  </Button>
                </div>
                <pre className="mt-3 max-h-96 overflow-y-auto whitespace-pre-wrap break-words rounded bg-ink-900 p-3 text-[11.5px] leading-relaxed text-cream-300">
                  {JSON.stringify(state.generated, null, 2)}
                </pre>
              </div>
            )}

            {/* Lock warning (email failed) */}
            {state.emailWarning && (
              <div className="mt-4">
                <p className="rounded border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-[13px] text-amber-500">
                  Locked — email not sent
                </p>
                <p className="mt-2 text-[12px] text-cream-500">
                  {state.emailWarning}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
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
  );
}
