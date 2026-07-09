"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";
import { cn } from "@/lib/utils";
import type {
  NumericalData,
  ReportContent,
  SpeakerAnalytics,
} from "@/lib/report-generation";
import { buildReportPages, type ReportPageDef } from "@/components/report/report-pages";

function ReportPageHalf({
  page,
  pageNumber,
  bordered,
}: {
  page: ReportPageDef | null;
  pageNumber: number | null;
  bordered: boolean;
}) {
  if (!page) {
    return (
      <div
        className={cn(
          "flex h-[600px] w-1/2 items-center justify-center",
          bordered && "border-r border-slate-900/10"
        )}
      >
        <p className="font-serif text-sm italic text-slate-300">· end ·</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-[600px] w-1/2 flex-col overflow-y-auto p-8",
        bordered && "border-r border-slate-900/10"
      )}
    >
      <div className="flex shrink-0 items-center justify-between">
        <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
          {page.label}
        </p>
        {pageNumber != null && (
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
            P. {pageNumber}
          </p>
        )}
      </div>
      <div className="mt-4 flex-1">{page.body}</div>
    </div>
  );
}

export function ReportViewer({
  content,
  speakerAnalytics,
  numericalData,
  tier,
  status,
  generatedBy,
}: {
  content: ReportContent;
  speakerAnalytics: SpeakerAnalytics;
  numericalData: NumericalData;
  tier: string;
  status: string;
  generatedBy: string | null;
}) {
  const pages = useMemo(
    () => buildReportPages(content, speakerAnalytics, numericalData, { tier, status, generatedBy }),
    [content, speakerAnalytics, numericalData, tier, status, generatedBy]
  );
  const totalSpreads = Math.ceil(pages.length / 2);
  const [spread, setSpread] = useState(0);

  const goPrev = useCallback(() => setSpread((s) => Math.max(0, s - 1)), []);
  const goNext = useCallback(
    () => setSpread((s) => Math.min(totalSpreads - 1, s + 1)),
    [totalSpreads]
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goPrev, goNext]);

  const leftIndex = spread * 2;
  const rightIndex = leftIndex + 1;
  const leftPage = pages[leftIndex] ?? null;
  const rightPage = pages[rightIndex] ?? null;

  const pageCounterLabel = rightPage
    ? `Pages ${leftIndex + 1}–${rightIndex + 1} / ${pages.length}`
    : `Page ${leftIndex + 1} / ${pages.length}`;

  return (
    <Container>
      <Eyebrow>Report</Eyebrow>
      <h1 className="mt-5 font-serif text-3xl text-cream-100 md:text-4xl">
        {content.coverInfo.meetingTitle}
      </h1>
      <p className="mt-3 max-w-xl text-[15px] text-cream-300">
        {content.coverInfo.company} · {content.coverInfo.region} ·{" "}
        {content.coverInfo.governingBody}
      </p>

      <div className="mt-10 flex overflow-hidden rounded-md bg-paper-500 text-slate-900 shadow-[0_26px_50px_-26px_rgba(13,19,27,0.6),0_6px_16px_-8px_rgba(13,19,27,0.35)]">
        <ReportPageHalf page={leftPage} pageNumber={leftIndex + 1} bordered />
        <ReportPageHalf page={rightPage} pageNumber={rightPage ? rightIndex + 1 : null} bordered={false} />
      </div>

      <div className="mt-5 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={goPrev}
          disabled={spread === 0}
          aria-label="Previous page"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-cream-200/20 text-cream-300 transition-colors hover:border-cream-200/50 hover:text-cream-100 disabled:pointer-events-none disabled:opacity-30"
        >
          ←
        </button>
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-cream-400">
          {pageCounterLabel}
        </p>
        <button
          type="button"
          onClick={goNext}
          disabled={spread === totalSpreads - 1}
          aria-label="Next page"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-cream-200/20 text-cream-300 transition-colors hover:border-cream-200/50 hover:text-cream-100 disabled:pointer-events-none disabled:opacity-30"
        >
          →
        </button>
      </div>
    </Container>
  );
}
