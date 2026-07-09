"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { runTranscription } from "@/app/admin/actions";
import {
  SourceFileLinks,
  type SourceFileLink,
} from "@/components/source-file-links";

type Row = {
  id: string;
  title: string;
  company: string;
  tier: string;
  ownerEmail: string;
  createdAt: string;
  sourceFile: { fileName: string; type: string } | null;
  supportingCount: number;
  files: SourceFileLink[];
};

type RowState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "done"; rawText: string; speakerCount: number }
  | { status: "error"; error: string };

export function AdminSubmittedList({ initialRows }: { initialRows: Row[] }) {
  const [rowStates, setRowStates] = useState<Record<string, RowState>>({});

  async function handleRun(id: string) {
    setRowStates((prev) => ({ ...prev, [id]: { status: "running" } }));
    const result = await runTranscription(id);
    if (!result.ok) {
      setRowStates((prev) => ({
        ...prev,
        [id]: { status: "error", error: result.error },
      }));
      return;
    }
    setRowStates((prev) => ({
      ...prev,
      [id]: {
        status: "done",
        rawText: result.data.rawText,
        speakerCount: result.data.speakerCount,
      },
    }));
  }

  if (initialRows.length === 0) {
    return (
      <p className="text-[14.5px] text-cream-400">
        No submitted requests waiting on transcription.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {initialRows.map((row) => {
        const state = rowStates[row.id] ?? { status: "idle" };
        return (
          <div
            key={row.id}
            className="rounded-md border border-cream-200/10 bg-ink-850 p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-rust-400">
                  {row.tier}
                </p>
                <h3 className="mt-1 font-serif text-lg text-cream-100">
                  {row.title}
                </h3>
                <p className="mt-1 text-[13px] text-cream-400">
                  {row.company} · {row.ownerEmail}
                </p>
                <div className="mt-3">
                  <SourceFileLinks files={row.files} />
                </div>
              </div>

              <Button
                size="sm"
                disabled={state.status === "running" || !row.sourceFile}
                onClick={() => handleRun(row.id)}
              >
                {state.status === "running"
                  ? "Transcribing…"
                  : state.status === "done"
                    ? "Re-run transcription"
                    : "Run transcription"}
              </Button>
            </div>

            {state.status === "error" && (
              <p className="mt-4 rounded border border-rust-400/30 bg-rust-400/5 px-4 py-3 text-[13px] text-rust-400">
                {state.error}
              </p>
            )}

            {state.status === "done" && (
              <div className="mt-4 rounded border border-green-400/20 bg-green-400/5 p-4">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-green-400">
                  Transcribed · {state.speakerCount} speaker
                  {state.speakerCount === 1 ? "" : "s"} · moved to in_review
                </p>
                <p
                  className={cn(
                    "mt-3 max-h-40 overflow-y-auto whitespace-pre-wrap text-[13px] leading-relaxed text-cream-300"
                  )}
                >
                  {state.rawText || "(empty transcript)"}
                </p>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
