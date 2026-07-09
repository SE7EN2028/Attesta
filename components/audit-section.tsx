"use client";

import { useEffect, useRef, useState } from "react";
import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";
import { cn } from "@/lib/utils";

const stats = [
  { value: "2", label: "Critical risks", color: "#D9705F", ring: "rgba(217,112,95,.35)", bg: "rgba(217,112,95,.06)" },
  { value: "5", label: "Recommendations", color: "#C9A25E", ring: "rgba(201,162,94,.35)", bg: "rgba(201,162,94,.06)" },
  { value: "14", label: "Compliant areas", color: "#8FB39A", ring: "rgba(143,179,154,.35)", bg: "rgba(143,179,154,.06)" },
  { value: "2", label: "Missing documents", color: "#88A0BC", ring: "rgba(136,160,188,.35)", bg: "rgba(136,160,188,.06)" },
];

type Cat = "all" | "risk" | "missing" | "rec" | "ok";

type Finding = {
  finding: string;
  cat: Exclude<Cat, "all">;
  level: string;
  color: string;
  impact: string;
  conf: number;
};

const filters: { label: string; cat: Cat }[] = [
  { label: "All", cat: "all" },
  { label: "Risks", cat: "risk" },
  { label: "Missing docs", cat: "missing" },
  { label: "Recommendations", cat: "rec" },
  { label: "Compliant", cat: "ok" },
];

const findings: Finding[] = [
  { finding: "Vote on agenda item 4 recorded without a headcount", cat: "risk", level: "Critical", color: "#D9705F", impact: "Deliberation could be challenged as invalid", conf: 88 },
  { finding: "BDESE consultation deadline not referenced in the record", cat: "risk", level: "Critical", color: "#D9705F", impact: "Procedural-challenge exposure (e.g. Art. L2312-16)", conf: 92 },
  { finding: "Opinion on the training plan lacks formal opinion wording", cat: "risk", level: "Medium", color: "#C9A25E", impact: "Weakens evidentiary value of the opinion", conf: 81 },
  { finding: "Employer's written answer to question 7 not annexed", cat: "missing", level: "High", color: "#D9705F", impact: "Record incomplete without Annex A", conf: 85 },
  { finding: "Signed attendance sheet absent from source material", cat: "missing", level: "Medium", color: "#C9A25E", impact: "Quorum evidenced in text only", conf: 79 },
  { finding: "Attach the vote tally sheet as Annex B", cat: "rec", level: "Advisory", color: "#88A0BC", impact: "Strengthens the decision log", conf: 90 },
  { finding: "Name the acting secretary in the header block", cat: "rec", level: "Advisory", color: "#88A0BC", impact: "Standard CSE formality", conf: 94 },
  { finding: "Quorum met — 9 of 11 titular members present", cat: "ok", level: "Compliant", color: "#8FB39A", impact: "Meets the statutory threshold (e.g. Art. L2314-1)", conf: 97 },
  { finding: "Convocation sent 8 days before the meeting", cat: "ok", level: "Compliant", color: "#8FB39A", impact: "Within the statutory minimum (3 days)", conf: 99 },
  { finding: "Previous minutes formally approved and recorded", cat: "ok", level: "Compliant", color: "#8FB39A", impact: "Continuity of record maintained", conf: 99 },
];

const SCORE = 78;
const CIRC = 402; // 2·π·64, matching the design

// Compliance score ring — animates stroke-dashoffset from empty to the score
// once scrolled into view, matching the design's IntersectionObserver dial.
function ScoreRing() {
  const ref = useRef<SVGCircleElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (es) => {
        if (es[0].isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const offset = inView ? Math.round(CIRC * (1 - SCORE / 100)) : CIRC;

  return (
    <svg
      viewBox="0 0 160 160"
      width="150"
      height="150"
      role="img"
      aria-label={`Overall compliance score: ${SCORE} out of 100`}
    >
      <circle cx="80" cy="80" r="64" fill="none" stroke="rgba(233,229,218,.12)" strokeWidth="10" />
      <circle
        ref={ref}
        cx="80"
        cy="80"
        r="64"
        fill="none"
        stroke="#8FB39A"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={CIRC}
        transform="rotate(-90 80 80)"
        style={{
          strokeDashoffset: offset,
          transition: "stroke-dashoffset 1.5s cubic-bezier(.25,.6,.3,1)",
        }}
      />
      <text x="80" y="80" textAnchor="middle" fill="#F2EFE6" fontFamily="var(--font-serif)" fontSize="42">
        {SCORE}
      </text>
      <text x="80" y="103" textAnchor="middle" fill="#77808D" fontFamily="var(--font-mono)" fontSize="11">
        / 100
      </text>
    </svg>
  );
}

export function AuditSection() {
  const [active, setActive] = useState<Cat>("all");
  const shown =
    active === "all" ? findings : findings.filter((f) => f.cat === active);
  const count = (cat: Cat) =>
    cat === "all" ? findings.length : findings.filter((f) => f.cat === cat).length;

  return (
    <section id="audit" className="border-t border-cream-200/10 py-24 md:py-32">
      <Container>
        <Eyebrow>The audit</Eyebrow>
        <h2 className="mt-5 max-w-2xl font-serif text-3xl leading-[1.15] text-cream-100 md:text-[44px]">
          The compliance dashboard your officer actually wants to see.
        </h2>
        <p className="mt-6 max-w-2xl text-[17px] leading-[1.65] text-cream-300">
          Every report ships with an audit of the record itself — scored
          against the rule set you selected, finding by finding, each with
          its risk level, impact and confidence.
        </p>

        <div className="mt-14 grid gap-6 lg:grid-cols-[300px_1fr] lg:items-start">
          <div className="rounded-xl border border-cream-200/10 bg-ink-750 p-7">
            <div className="flex flex-wrap items-center gap-6">
              <ScoreRing />
              <div className="min-w-[150px] flex-1">
                <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-cream-500">
                  Overall compliance
                </p>
                <p className="mt-1.5 text-[15px] leading-[1.6] text-cream-300">
                  CSE meeting · 17.09.2026
                  <br />
                  vs. <b className="text-cream-100">France · CSE</b> rule set
                </p>
                <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-cream-500">
                  Illustrative sample data
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="rounded-md border p-3.5"
                  style={{ borderColor: s.ring, background: s.bg }}
                >
                  <p className="font-serif text-3xl" style={{ color: s.color }}>
                    {s.value}
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-cream-400">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-5 border-t border-cream-200/10 pt-4 text-[13.5px] leading-relaxed text-cream-500">
              Outputs can also include a slide-deck summary of these findings,
              for presenting outcomes to a board or leadership team.
            </p>
          </div>

          <div className="min-w-0">
            <div className="flex flex-wrap gap-2" role="group" aria-label="Filter findings">
              {filters.map((f) => {
                const on = active === f.cat;
                return (
                  <button
                    key={f.cat}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setActive(f.cat)}
                    className={cn(
                      "cursor-pointer rounded-full border px-3.5 py-1.5 font-mono text-[11px] tracking-[0.08em] uppercase transition-colors",
                      on
                        ? "border-cream-200 bg-cream-200 text-ink-900"
                        : "border-cream-200/20 text-cream-400 hover:border-cream-200/50"
                    )}
                  >
                    {f.label} · {count(f.cat)}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 overflow-hidden rounded-xl border border-cream-200/10 bg-ink-850">
              <div className="grid grid-cols-[2.1fr_0.9fr_1.5fr_0.9fr] gap-2.5 border-b border-cream-200/[0.14] px-[18px] py-3 font-mono text-[10px] uppercase tracking-[0.13em] text-cream-500">
                <span>Finding</span>
                <span>Risk</span>
                <span>Impact</span>
                <span className="text-right">Confidence</span>
              </div>
              {shown.map((f) => (
                <div
                  key={f.finding}
                  className="grid grid-cols-[2.1fr_0.9fr_1.5fr_0.9fr] items-center gap-2.5 border-b border-cream-200/[0.07] px-[18px] py-3.5 transition-colors last:border-b-0 hover:bg-cream-200/[0.045]"
                >
                  <span className="text-[13.5px] leading-[1.45] text-cream-200">
                    {f.finding}
                  </span>
                  <span>
                    <span
                      className="whitespace-nowrap rounded-full border px-2 py-0.5 font-mono text-[9.5px] uppercase tracking-[0.08em]"
                      style={{ borderColor: f.color, color: f.color }}
                    >
                      {f.level}
                    </span>
                  </span>
                  <span className="text-[12.5px] leading-[1.45] text-cream-400">
                    {f.impact}
                  </span>
                  <span className="flex items-center justify-end gap-2">
                    <span className="inline-block h-1 w-11 overflow-hidden rounded-sm bg-cream-200/[0.12]">
                      <span
                        className="block h-full"
                        style={{ width: `${f.conf}%`, background: f.color }}
                      />
                    </span>
                    <span className="font-mono text-[11px] text-cream-400">
                      {f.conf}%
                    </span>
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-3.5 font-mono text-[11px] uppercase tracking-[0.08em] text-cream-500">
              Demo findings — illustrative content; rule citations are
              examples, not legal advice.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
