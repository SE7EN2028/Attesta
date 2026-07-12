"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";
import { Button } from "@/components/ui/button";
import type {
  NumericalData,
  ReportContent,
  SpeakerAnalytics,
} from "@/lib/report-generation";
import { buildReportPages } from "@/components/report/report-pages";

type FlipState = { dir: number; fromDrag: boolean } | null;

export function ReportViewer({
  reportId,
  content,
  speakerAnalytics,
  numericalData,
  tier,
  status,
  generatedBy,
  region,
}: {
  reportId: string;
  content: ReportContent;
  speakerAnalytics: SpeakerAnalytics;
  numericalData: NumericalData;
  tier: string;
  status: string;
  generatedBy: string | null;
  region?: string;
}) {
  // General reports have no compliance audit — hide its entry point. Fall back
  // to the region embedded in the report content when not passed explicitly.
  const isGeneral = (region ?? content.coverInfo.region) === "General";
  // buildReportPages is pure over these inputs; recompute only when they change.
  const pagesRef = useRef(
    buildReportPages(content, speakerAnalytics, numericalData, {
      tier,
      status,
      generatedBy,
    })
  );
  const pages = pagesRef.current;
  const totalSpreads = Math.ceil(pages.length / 2);

  const [spread, setSpread] = useState(0);
  const [flip, setFlip] = useState<FlipState>(null);

  // Read-aloud (Listen) — plays the executive summary via the /listen route.
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [audioState, setAudioState] = useState<
    "idle" | "loading" | "playing" | "paused" | "error"
  >("idle");
  const toggleListen = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audioState === "playing") {
      audio.pause();
      return;
    }
    if (audioState === "paused") {
      void audio.play();
      return;
    }
    // idle | error: (re)start playback from the route.
    if (!audio.src) audio.src = `/api/report/${reportId}/listen`;
    if (audioState === "error") audio.load();
    setAudioState("loading");
    void audio.play().catch(() => setAudioState("error"));
  }, [audioState, reportId]);

  const leafRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const busyRef = useRef(false);
  const drag = useRef({ sx: 0, dir: 0, dragging: false, progress: 0, w: 1 });
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = matchMedia("(prefers-reduced-motion: reduce)").matches;
    return () => {
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, []);

  const canFlip = useCallback(
    (dir: number) => (dir > 0 ? spread < totalSpreads - 1 : spread > 0),
    [spread, totalSpreads]
  );

  const doFlip = useCallback(
    (dir: number) => {
      if (busyRef.current || !canFlip(dir)) return;
      if (reduced.current) {
        setSpread((s) => s + dir);
        return;
      }
      busyRef.current = true;
      setFlip({ dir, fromDrag: false });
    },
    [canFlip]
  );

  // Animate a click / key / button flip: kick the leaf to ±180 on the next
  // frame, then commit the spread when the turn finishes.
  useEffect(() => {
    if (!flip || flip.fromDrag) return;
    const leaf = leafRef.current;
    if (!leaf) return;
    const { dir } = flip;
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        leaf.style.transition = "transform .6s cubic-bezier(.3,.4,.2,1)";
        leaf.style.transform = `rotateY(${dir > 0 ? -180 : 180}deg)`;
      })
    );
    const t = setTimeout(() => {
      setSpread((s) => s + dir);
      setFlip(null);
      busyRef.current = false;
    }, 640);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [flip]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") doFlip(-1);
      if (e.key === "ArrowRight") doFlip(1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [doFlip]);

  /* ---- drag a page corner ---- */
  function onPointerDown(e: React.PointerEvent) {
    if (busyRef.current || e.button > 0) return;
    const stage = stageRef.current;
    if (!stage) return;
    const r = stage.getBoundingClientRect();
    drag.current = {
      sx: e.clientX,
      dir: e.clientX - r.left > r.width / 2 ? 1 : -1,
      dragging: false,
      progress: 0,
      w: r.width,
    };
    stage.setPointerCapture(e.pointerId);
    stage.style.cursor = "grabbing";
  }
  function onPointerMove(e: React.PointerEvent) {
    const stage = stageRef.current;
    if (!stage || !stage.hasPointerCapture(e.pointerId)) return;
    const d = drag.current;
    const dx = e.clientX - d.sx;
    if (!d.dragging && Math.abs(dx) > 8 && canFlip(d.dir) && !busyRef.current) {
      d.dragging = true;
      busyRef.current = true;
      setFlip({ dir: d.dir, fromDrag: true });
    }
    if (d.dragging && leafRef.current) {
      const prog = Math.max(0, Math.min(1, (d.dir > 0 ? -dx : dx) / (d.w * 0.75)));
      d.progress = prog;
      leafRef.current.style.transition = "none";
      leafRef.current.style.transform = `rotateY(${d.dir > 0 ? -prog * 180 : prog * 180}deg)`;
    }
  }
  function onPointerUp(e: React.PointerEvent) {
    const stage = stageRef.current;
    if (stage && stage.hasPointerCapture(e.pointerId))
      stage.releasePointerCapture(e.pointerId);
    if (stage) stage.style.cursor = "grab";
    const d = drag.current;
    if (!d.dragging) {
      if (Math.abs(e.clientX - d.sx) < 8 && e.type === "pointerup") doFlip(d.dir);
      return;
    }
    const leaf = leafRef.current;
    if (!leaf) {
      busyRef.current = false;
      setFlip(null);
      return;
    }
    const commit = d.progress > 0.38;
    const dir = d.dir;
    leaf.style.transition = "transform .35s cubic-bezier(.3,.4,.2,1)";
    leaf.style.transform = commit
      ? `rotateY(${dir > 0 ? -180 : 180}deg)`
      : "rotateY(0deg)";
    settleTimer.current = setTimeout(() => {
      if (commit) setSpread((s) => s + dir);
      setFlip(null);
      busyRef.current = false;
    }, 370);
    d.dragging = false;
  }

  /* ---- which page index sits where ---- */
  let leftIdx = 2 * spread;
  let rightIdx = 2 * spread + 1;
  if (flip) {
    if (flip.dir > 0) rightIdx = 2 * spread + 3; // reveal the page under the leaf
    else leftIdx = 2 * spread - 2;
  }
  const leaf =
    flip &&
    (flip.dir > 0
      ? { front: 2 * spread + 1, back: 2 * spread + 2, side: "right" as const }
      : { front: 2 * spread, back: 2 * spread - 1, side: "left" as const });

  function face(idx: number) {
    const page = pages[idx] ?? null;
    if (!page) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-paper-500">
          <p className="font-serif text-sm italic text-slate-300">· end ·</p>
        </div>
      );
    }
    return (
      <div className="flex h-full w-full flex-col overflow-y-auto bg-paper-500 p-8 text-slate-900">
        <div className="flex shrink-0 items-center justify-between">
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
            {page.label}
          </p>
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
            P. {idx + 1}
          </p>
        </div>
        <div className="mt-4 flex-1">{page.body}</div>
      </div>
    );
  }

  const shade = (deg: number) =>
    `linear-gradient(${deg}deg, rgba(13,19,27,.16), transparent 45%)`;

  const hasRight = 2 * spread + 1 < pages.length;
  const pageCounterLabel = hasRight
    ? `Pages ${2 * spread + 1}–${2 * spread + 2} / ${pages.length}`
    : `Page ${2 * spread + 1} / ${pages.length}`;

  return (
    <Container>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Eyebrow>Report</Eyebrow>
            {status === "LOCKED" ? (
              <span className="rounded-full border border-green-400/30 bg-green-400/5 px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-green-400">
                Locked &amp; signed
              </span>
            ) : (
              <span className="rounded-full border border-cream-200/20 bg-cream-200/5 px-3 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-cream-400">
                Draft · not yet locked
              </span>
            )}
          </div>
          <h1 className="mt-5 font-serif text-3xl text-cream-100 md:text-4xl">
            {content.coverInfo.meetingTitle}
          </h1>
          <p className="mt-3 max-w-xl text-[15px] text-cream-300">
            {content.coverInfo.company} · {content.coverInfo.region} ·{" "}
            {content.coverInfo.governingBody}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {!isGeneral && (
            <Button asChild variant="outline" size="sm">
              <Link href={`/report/${reportId}/compliance`}>
                View compliance audit
              </Link>
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleListen}
            disabled={audioState === "loading"}
          >
            {audioState === "loading"
              ? "Preparing…"
              : audioState === "playing"
                ? "Pause"
                : audioState === "paused"
                  ? "Resume"
                  : audioState === "error"
                    ? "Unavailable"
                    : "Listen"}
          </Button>
          <Button asChild variant="primary" size="sm">
            <a href={`/api/report/${reportId}/pptx`}>Download deck (.pptx)</a>
          </Button>
          <audio
            ref={audioRef}
            className="hidden"
            onPlaying={() => setAudioState("playing")}
            onPause={() =>
              setAudioState((s) => (s === "playing" ? "paused" : s))
            }
            onEnded={() => setAudioState("idle")}
            onError={() => setAudioState("error")}
          />
        </div>
      </div>

      <div
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="relative mt-10 h-[600px] cursor-grab touch-pan-y select-none rounded-md"
        style={{ perspective: "2200px" }}
      >
        {/* stacked-paper depth */}
        <div className="absolute inset-0 translate-x-1 translate-y-[5px] rounded-md bg-[#E2DCCB] shadow-[0_26px_50px_-26px_rgba(13,19,27,0.6),0_6px_16px_-8px_rgba(13,19,27,0.35)]" />
        <div className="absolute inset-0 translate-x-0.5 translate-y-[2.5px] rounded-md bg-[#EDE8DB] shadow-[0_0_0_1px_rgba(26,34,46,0.07)]" />

        {/* left / right faces */}
        <div className="absolute left-0 top-0 h-full w-1/2 overflow-hidden rounded-l-md shadow-[0_0_0_1px_rgba(26,34,46,0.12)]">
          {face(leftIdx)}
        </div>
        <div className="absolute right-0 top-0 h-full w-1/2 overflow-hidden rounded-r-md shadow-[0_0_0_1px_rgba(26,34,46,0.12)]">
          {face(rightIdx)}
        </div>

        {/* centre gutter shadow */}
        <div
          className="pointer-events-none absolute left-1/2 top-0 z-[4] h-full w-6 -translate-x-1/2"
          style={{
            background:
              "linear-gradient(90deg,transparent,rgba(13,19,27,.13) 50%,transparent)",
          }}
        />

        {/* turning leaf */}
        {leaf && (
          <div
            ref={leafRef}
            className="absolute top-0 z-10 h-full w-1/2 [transform-style:preserve-3d] [will-change:transform]"
            style={{
              left: leaf.side === "right" ? "50%" : 0,
              transformOrigin:
                leaf.side === "right" ? "left center" : "right center",
            }}
          >
            <div className="absolute inset-0 overflow-hidden bg-paper-500 [backface-visibility:hidden] shadow-[0_0_0_1px_rgba(26,34,46,0.12)]">
              {face(leaf.front)}
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: shade(leaf.side === "right" ? -90 : 90) }}
              />
            </div>
            <div
              className="absolute inset-0 overflow-hidden bg-paper-500 [backface-visibility:hidden] shadow-[0_0_0_1px_rgba(26,34,46,0.12),-8px_0_24px_-12px_rgba(13,19,27,0.35)]"
              style={{ transform: "rotateY(180deg)" }}
            >
              {face(leaf.back)}
              <div
                className="pointer-events-none absolute inset-0"
                style={{ background: shade(leaf.side === "right" ? 90 : -90) }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={() => doFlip(-1)}
          disabled={spread === 0}
          aria-label="Previous page"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-cream-200/20 text-cream-300 transition-colors hover:border-cream-200/50 hover:text-cream-100 disabled:pointer-events-none disabled:opacity-30"
        >
          ←
        </button>
        <p className="min-w-[130px] text-center font-mono text-[11px] uppercase tracking-[0.1em] text-cream-400">
          {pageCounterLabel}
        </p>
        <button
          type="button"
          onClick={() => doFlip(1)}
          disabled={spread >= totalSpreads - 1}
          aria-label="Next page"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-cream-200/20 text-cream-300 transition-colors hover:border-cream-200/50 hover:text-cream-100 disabled:pointer-events-none disabled:opacity-30"
        >
          →
        </button>
      </div>
    </Container>
  );
}
