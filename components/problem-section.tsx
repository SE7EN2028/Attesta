import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";

const rawItems = [
  "reunion_cse_17-09_FINAL(2).mp3 · 48:12",
  "handwritten_notes_scan.pdf · 11 pages",
  "agenda_v3_reviewed_MD(fixed).docx",
];

const rawNotes = [
  "who seconded item 4?? — check with Martine",
  "vote: 8 for? or 7?",
  "…management commits to the timeline (to be confirmed) — see also annex A annex B?…",
  "00:23:41 — inaudible ???",
  "00:31:07 — who's speaking, Duval or Petit?",
];

const values = [
  {
    label: "Time",
    body: "Two days of writing becomes a report delivered in 1–2 hours.",
  },
  {
    label: "Accuracy",
    body: "Written from the audio, speaker by speaker — not from memory three days later.",
  },
  {
    label: "Defensibility",
    body: "Who edited, approved and locked what, and when — logged on every report.",
  },
];

export function ProblemSection() {
  return (
    <section className="border-t border-cream-200/10 py-24 md:py-32">
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

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          <div className="rounded-md border border-cream-200/10 bg-ink-850 p-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-cream-400">
              ← Before · raw material
            </p>
            <ul className="mt-5 space-y-2 font-mono text-[12.5px] text-cream-400">
              {rawItems.map((item) => (
                <li key={item}>▸ {item}</li>
              ))}
            </ul>
            <div className="mt-6 space-y-2 border-t border-cream-200/10 pt-5">
              {rawNotes.map((note) => (
                <p
                  key={note}
                  className="font-mono text-[12.5px] italic text-cream-500"
                >
                  {note}
                </p>
              ))}
            </div>
          </div>

          <div className="rounded-md bg-paper-500 p-8 text-slate-900">
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-slate-500">
              After · on the record →
            </p>
            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
              Minutes · CSE · 17.09.2026
            </p>
            <h3 className="mt-2 font-serif text-lg text-slate-900">
              Social and Economic Committee (CSE) — ordinary session
            </h3>
            <p className="mt-1 text-[12.5px] text-slate-600">
              Nordane SA · 9 of 11 titular members · quorum met
            </p>

            <div className="mt-6 space-y-2 text-[13px] text-slate-700">
              <p>
                <span className="font-mono text-rust-600">3.</span> 2027
                training plan — presentation and opinion
              </p>
              <p>
                <span className="font-mono text-rust-600">4.</span>{" "}
                Working-hours adjustment — Vénissieux site
              </p>
            </div>

            <div className="mt-6 rounded border border-slate-900/10 bg-paper-100 p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
                Vote · item 3
              </p>
              <p className="mt-1 text-[13px] font-semibold text-slate-900">
                8 for · 1 against · 2 abst.
              </p>
              <p className="font-mono text-[11px] text-green-600">
                Favourable opinion
              </p>
            </div>

            <div className="mt-6 flex items-center justify-between border-t border-slate-900/10 pt-4">
              <div>
                <p className="font-serif text-sm text-slate-900">
                  C. Marchal
                </p>
                <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
                  Session secretary
                </p>
              </div>
              <span className="rounded border-2 border-rust-600 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-rust-600">
                Signed · Locked
              </span>
            </div>
          </div>
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
