"use client";

import { useState } from "react";
import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";

const values = [
  { label: "Time", body: "Two days of writing becomes a report delivered in 1–2 hours." },
  { label: "Accuracy", body: "Written from the audio, speaker by speaker — not from memory three days later." },
  { label: "Defensibility", body: "Who edited, approved and locked what, and when — logged on every report." },
];

const chipStyle: React.CSSProperties = {
  position: "absolute",
  background: "#FDFCF8",
  border: "1px solid rgba(26,34,46,.2)",
  borderRadius: 4,
  padding: "9px 13px",
  fontFamily: "var(--font-mono)",
  fontSize: "clamp(9px,1.15vw,12px)",
  color: "#3A4350",
  boxShadow: "0 6px 14px -8px rgba(26,34,46,.4)",
};

const noteStyle: React.CSSProperties = {
  position: "absolute",
  background: "#F3E9C0",
  boxShadow: "0 8px 16px -8px rgba(26,34,46,.45)",
  fontFamily: "var(--font-serif)",
  fontStyle: "italic",
  color: "#4A4230",
};

export function ProblemSection() {
  const [pos, setPos] = useState(62);

  return (
    <section id="problem" className="border-t border-cream-200/10 py-24 md:py-32">
      <Container>
        <Eyebrow>The problem</Eyebrow>
        <h2 className="mt-5 max-w-3xl font-serif text-3xl leading-[1.15] text-cream-100 md:text-[44px]">
          Statutory minutes are a legal record. Most are still written like
          notes.
        </h2>
        <p className="mt-6 max-w-2xl text-[17px] leading-[1.65] text-cream-300">
          A works-council meeting runs three hours. Then someone — usually
          the secretary, rarely thanked for it — spends two days turning a
          recording and a page of scribbles into a document that has to
          survive a labour inspector. One misattributed quote, one missing
          vote count, and the record is challengeable.
        </p>

        <div className="mb-2.5 mt-11 flex flex-wrap items-baseline justify-between gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-rust-400">
            ← Before · raw material
          </span>
          <span className="font-mono text-[11px] uppercase tracking-[0.15em] text-green-600">
            After · on the record →
          </span>
        </div>

        <div
          className="relative min-h-[340px] cursor-ew-resize overflow-hidden rounded-lg border border-slate-900/15 shadow-[0_30px_60px_-30px_rgba(19,26,36,0.4)]"
          style={{ aspectRatio: "16 / 8.4" }}
        >
          {/* BEFORE layer */}
          <div
            className="absolute inset-0"
            style={{
              background: "#EDE7D8",
              backgroundImage:
                "repeating-linear-gradient(0deg, rgba(26,34,46,.04) 0 1px, transparent 1px 26px)",
            }}
          >
            <div style={{ ...chipStyle, top: "6%", left: "4%", transform: "rotate(-2deg)" }}>
              ▸ reunion_cse_17-09_FINAL(2).mp3 · 48:12
            </div>
            <div style={{ ...chipStyle, top: "19%", left: "12%", transform: "rotate(1.6deg)" }}>
              ▸ handwritten_notes_scan.pdf · 11 pages
            </div>
            <div style={{ ...chipStyle, top: "33%", left: "6%", transform: "rotate(-1deg)" }}>
              ▸ agenda_v3_reviewed_MD(fixed).docx
            </div>
            <div
              style={{
                ...noteStyle,
                top: "52%",
                left: "5%",
                width: "34%",
                transform: "rotate(1.2deg)",
                padding: "12px 14px",
                fontSize: "clamp(11px,1.4vw,15px)",
                lineHeight: 1.45,
              }}
            >
              who seconded item 4?? — check with Martine
            </div>
            <div
              style={{
                ...noteStyle,
                top: "74%",
                left: "14%",
                transform: "rotate(-2.4deg)",
                padding: "10px 13px",
                fontSize: "clamp(11px,1.4vw,15px)",
              }}
            >
              vote: 8 for?{" "}
              <span style={{ color: "#A63A2E" }}>or 7?</span>
            </div>
            <div
              style={{
                position: "absolute",
                top: "12%",
                right: "8%",
                width: "38%",
                fontSize: "clamp(10px,1.3vw,14px)",
                lineHeight: 1.7,
                color: "#5F6672",
                transform: "rotate(.6deg)",
              }}
            >
              …management{" "}
              <span style={{ textDecoration: "underline wavy #A63A2E" }}>
                commits to the timeline
              </span>{" "}
              (to be confirmed) — see also{" "}
              <span style={{ textDecoration: "line-through" }}>annex A</span>{" "}
              annex B?…
            </div>
            <div
              style={{
                position: "absolute",
                top: "44%",
                right: "6%",
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(9px,1.15vw,12px)",
                color: "#A63A2E",
                transform: "rotate(-1.4deg)",
              }}
            >
              00:23:41 — inaudible ???
            </div>
            <div
              style={{
                position: "absolute",
                top: "58%",
                right: "14%",
                fontFamily: "var(--font-mono)",
                fontSize: "clamp(9px,1.15vw,12px)",
                color: "#77808D",
                transform: "rotate(1deg)",
              }}
            >
              00:31:07 — who&apos;s speaking, Duval or Petit?
            </div>
            <div
              style={{
                position: "absolute",
                bottom: "8%",
                right: "7%",
                width: 52,
                height: 52,
                border: "2px solid #A63A2E",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-serif)",
                fontSize: 26,
                color: "#A63A2E",
                transform: "rotate(8deg)",
              }}
            >
              ?
            </div>
          </div>

          {/* AFTER layer (clipped) */}
          <div
            className="absolute inset-0"
            style={{
              background: "#FDFCF8",
              clipPath: `inset(0 0 0 ${pos}%)`,
            }}
          >
            <div className="mx-auto flex h-full max-w-[520px] flex-col px-7 py-[4.5%] box-border">
              <div className="flex justify-between border-b border-[#DFD9CA] pb-2 font-mono text-[clamp(8px,1vw,11px)] uppercase tracking-[0.13em] text-[#6A7280]">
                <span>Minutes · CSE</span>
                <span>17.09.2026</span>
              </div>
              <div className="mb-1 mt-3 font-serif text-[clamp(14px,1.8vw,20px)] leading-[1.3] text-slate-900">
                Social and Economic Committee (CSE) — ordinary session
              </div>
              <div className="text-[clamp(10px,1.2vw,13px)] text-[#6A7280]">
                Style IT · 9 of 11 titular members · quorum met
              </div>
              <div className="mt-3 text-[clamp(10px,1.25vw,13.5px)] leading-[1.75] text-slate-700">
                <div className="flex gap-2">
                  <span className="font-mono text-rust-600">3.</span>
                  <span>2027 training plan — presentation and opinion</span>
                </div>
                <div className="flex gap-2">
                  <span className="font-mono text-rust-600">4.</span>
                  <span>Working-hours adjustment — Vénissieux site</span>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-sm border border-[#DFD9CA] bg-[#F1EDE2] px-3 py-[9px]">
                <span className="font-mono text-[clamp(8px,1vw,11px)] uppercase tracking-[0.1em] text-[#6A7280]">
                  Vote · item 3
                </span>
                <span className="text-[clamp(10px,1.25vw,13px)]">
                  <b>8</b> for · <b>1</b> against · <b>2</b> abst.
                </span>
                <span className="rounded-full border border-green-600 px-[7px] py-0.5 font-mono text-[clamp(7px,.9vw,10px)] uppercase tracking-[0.1em] text-green-600">
                  Favourable opinion
                </span>
              </div>
              <div className="mt-auto flex items-end justify-between gap-2.5">
                <div className="min-w-0">
                  <div className="font-serif italic text-[clamp(12px,1.5vw,17px)] text-[#26303E]">
                    C. Marchal
                  </div>
                  <div className="border-t border-slate-900 pt-[3px] font-mono text-[clamp(7px,.9vw,10px)] uppercase tracking-[0.1em] text-[#6A7280]">
                    Session secretary
                  </div>
                </div>
                <div className="flex-none -rotate-[4deg] rounded-xs border-2 border-rust-600 px-2.5 py-1.5 font-mono text-[clamp(8px,1vw,11px)] font-semibold uppercase tracking-[0.16em] text-rust-600">
                  Signed · Locked
                </div>
              </div>
            </div>
          </div>

          {/* handle */}
          <div
            className="pointer-events-none absolute bottom-0 top-0 z-[4] w-0.5 bg-rust-600"
            style={{ left: `${pos}%` }}
          >
            <div className="absolute left-1/2 top-1/2 flex h-[38px] w-[38px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-rust-600 text-[15px] text-paper-100 shadow-[0_6px_16px_-4px_rgba(19,26,36,0.5)]">
              ↔
            </div>
          </div>

          <input
            type="range"
            min={8}
            max={92}
            value={pos}
            onChange={(e) => setPos(Number(e.target.value))}
            aria-label="Compare raw meeting material with the finished, signed record"
            className="absolute inset-0 z-[5] m-0 h-full w-full cursor-ew-resize opacity-0"
          />
        </div>

        <div className="mt-16 grid gap-10 border-t border-cream-200/10 pt-12 md:grid-cols-3">
          {values.map((v) => (
            <div key={v.label}>
              <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-rust-400">
                {v.label}
              </p>
              <p className="mt-3 text-[14.5px] leading-relaxed text-cream-300">
                {v.body}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
