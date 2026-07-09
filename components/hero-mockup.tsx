const speakers = [
  {
    id: "S1",
    color: "bg-rust-400",
    text: "text-rust-400",
    bars: [4, 10, 16, 22, 14, 8, 18, 24, 12, 6, 20, 10],
    time: "00:12",
  },
  {
    id: "S2",
    color: "bg-green-400",
    text: "text-green-400",
    bars: [6, 14, 20, 16, 10, 22, 18, 8, 24, 14, 10, 18],
    time: "00:19",
  },
  {
    id: "S3",
    color: "bg-gold-400",
    text: "text-gold-400",
    bars: [8, 4, 12, 20, 16, 10, 6, 18, 22, 8, 14, 10],
    time: "00:26",
  },
  {
    id: "S4",
    color: "bg-blue-400",
    text: "text-blue-400",
    bars: [10, 16, 8, 14, 20, 6, 12, 18, 10, 22, 8, 16],
    time: "00:33",
  },
];

export function HeroMockup() {
  return (
    <div>
      <div className="space-y-4">
        {speakers.map((s) => (
          <div key={s.id} className="flex items-center gap-3">
            <span className={`w-6 font-mono text-[11px] ${s.text}`}>
              {s.id}
            </span>
            <div className="flex h-5 flex-1 items-end gap-[2px] overflow-hidden">
              {s.bars.map((h, i) => (
                <span
                  key={i}
                  className={`w-[3px] rounded-full ${s.color} opacity-70`}
                  style={{ height: `${h}px` }}
                />
              ))}
            </div>
            <span className="font-mono text-[11px] text-cream-400">
              {s.time}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.1em] text-cream-400">
        48:12 raw audio · 4 speakers → 9 pages, signed &amp; locked
      </p>

      <div className="relative mt-6 flex overflow-hidden rounded-md bg-paper-600 shadow-[0_26px_50px_-26px_rgba(13,19,27,0.6),0_6px_16px_-8px_rgba(13,19,27,0.35)]">
        <div className="w-1/2 border-r border-slate-900/10 bg-paper-600 p-6">
          <div className="flex items-start justify-between">
            <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
              Minutes · Ordinary session
            </p>
            <span className="-rotate-6 rounded border-2 border-rust-600 px-2 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wide text-rust-600">
              Signed · Locked
            </span>
          </div>
          <h3 className="mt-3 font-serif text-lg leading-snug text-slate-900">
            Social and Economic Committee (CSE) — session of 17 September 2026
          </h3>
          <p className="mt-2 font-mono text-[10px] text-slate-500">
            Nordane SA · Lyon site
          </p>

          <div className="mt-16 space-y-2 border-t border-slate-900/10 pt-3">
            {[
              ["Region", "France"],
              ["Governing body", "CSE"],
              ["Language", "English"],
              ["Date", "17.09.2026"],
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
            01 / 04
          </p>
        </div>

        <div className="w-1/2 bg-paper-400 p-6">
          <div className="flex items-baseline justify-between">
            <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
              Minutes · CSE Nordane SA
            </p>
            <span className="font-mono text-[9px] text-slate-500">
              17.09.2026
            </span>
          </div>
          <h4 className="mt-3 font-serif text-base text-slate-900">
            Attendance
          </h4>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-600">
            9 of 11 titular members present —{" "}
            <span className="font-semibold text-slate-900">quorum met</span>.
            Alternates: 2. Chair: A. Vasseur (management). Session secretary:
            C. Marchal.
          </p>
          <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
            Agenda
          </p>
          <ol className="mt-2 space-y-1.5 text-[11px] text-slate-700">
            {[
              "Approval of the minutes of 18 June",
              "Economic situation — H1 2026",
              "2027 training plan",
              "Working-hours adjustment — Vénissieux site",
              "Other business",
            ].map((item, i) => (
              <li key={item} className="flex gap-2">
                <span className="font-mono text-rust-600">{i + 1}.</span>
                {item}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-right font-mono text-[8px] text-slate-400">
            02 / 04
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
          Pages 1–2 / 4
        </p>
        <button
          aria-hidden
          tabIndex={-1}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-cream-200/20 text-cream-300"
        >
          →
        </button>
      </div>
    </div>
  );
}
