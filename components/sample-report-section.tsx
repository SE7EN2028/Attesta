import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";

const speakingTime = [
  { label: "R. Lambert (CGT)", minutes: 11 },
  { label: "Management", minutes: 9 },
  { label: "S. Nguyen (CFDT)", minutes: 6 },
  { label: "Other members", minutes: 3 },
];

const maxMinutes = Math.max(...speakingTime.map((s) => s.minutes));

export function SampleReportSection() {
  return (
    <section id="sample-report" className="border-t border-cream-200/10 py-24 md:py-32">
      <Container>
        <Eyebrow>The sample report</Eyebrow>
        <h2 className="mt-5 max-w-2xl font-serif text-3xl leading-[1.15] text-cream-100 md:text-[44px]">
          Judge the output before you create an account.
        </h2>
        <p className="mt-6 max-w-2xl text-[17px] leading-[1.65] text-cream-300">
          A real sample report — never client data. No registration, no
          email. Drag a page corner or use the arrows, and look for the
          things that matter: votes pulled out automatically, the audit
          score, the sign-off block on the last spread.
        </p>
        <p className="mt-3 font-mono text-[12px] text-cream-500">
          Then run your own preview ↑
        </p>

        <div className="mt-14 flex overflow-hidden rounded-md bg-paper-500 text-slate-900 shadow-[0_26px_50px_-26px_rgba(13,19,27,0.6),0_6px_16px_-8px_rgba(13,19,27,0.35)]">
          <div className="w-1/2 border-r border-slate-900/10 p-8">
            <div className="flex items-start justify-between">
              <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
                Minutes · Sample report
              </p>
              <span className="rounded-full bg-rust-600 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-paper-100">
                Delivered in 1–2 hours
              </span>
            </div>
            <h3 className="mt-4 font-serif text-lg leading-snug text-slate-900">
              CSE — extraordinary session of 2 October 2026
            </h3>
            <p className="mt-2 font-mono text-[10px] text-slate-500">
              Vireo Industrie SAS · Nantes
            </p>

            <div className="mt-14 space-y-2 border-t border-slate-900/10 pt-4">
              {[
                ["Region", "France"],
                ["Governing body", "CSE"],
                ["Outputs", "PDF + DOCX"],
                ["Delivered in", "1–2 hours"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-[11px]">
                  <span className="font-mono uppercase tracking-[0.08em] text-slate-400">
                    {k}
                  </span>
                  <span className="font-semibold text-slate-900">{v}</span>
                </div>
              ))}
            </div>
            <p className="mt-4 font-mono text-[8px] text-slate-400">
              01 / 06
            </p>
          </div>

          <div className="w-1/2 p-8">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
                Structure — agenda
              </p>
              <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
                P. 2
              </p>
            </div>
            <h4 className="mt-3 font-serif text-base text-slate-900">
              Item 2 — Logistics reorganisation project
            </h4>
            <p className="mt-2 text-[12px] leading-relaxed text-slate-600">
              Management presents the plan to merge the two warehouses.
              Elected members raise three reservations: the timeline, team
              transfers, and load on the remaining site.
            </p>

            <p className="mt-6 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
              Speaking time on this item
            </p>
            <div className="mt-3 space-y-2.5">
              {speakingTime.map((s) => (
                <div key={s.label}>
                  <div className="flex justify-between text-[11px] text-slate-700">
                    <span>{s.label}</span>
                    <span className="font-mono">{s.minutes} min</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-900/10">
                    <div
                      className="h-1.5 rounded-full bg-rust-600"
                      style={{ width: `${(s.minutes / maxMinutes) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-right font-mono text-[8px] text-slate-400">
              02 / 06
            </p>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-center gap-4">
          <button
            aria-hidden
            tabIndex={-1}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-cream-200/20 text-cream-300"
          >
            ←
          </button>
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-cream-400">
            Pages 1–2 / 6
          </p>
          <button
            aria-hidden
            tabIndex={-1}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-cream-200/20 text-cream-300"
          >
            →
          </button>
        </div>
      </Container>
    </section>
  );
}
