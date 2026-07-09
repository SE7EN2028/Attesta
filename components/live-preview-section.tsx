import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";

const regions = [
  { label: "France — live", live: true },
  { label: "Germany — coming soon", live: false },
  { label: "Belgium — coming soon", live: false },
  { label: "Netherlands — coming soon", live: false },
];

const governingBodies = [
  "CSE — works council",
  "CSSCT — health & safety",
  "HR — internal meeting",
  "AG — general assembly",
];

export function LivePreviewSection() {
  return (
    <section id="live-preview" className="border-t border-cream-200/10 py-24 md:py-32">
      <Container>
        <Eyebrow>The live preview · working demo</Eyebrow>
        <h2 className="mt-5 max-w-2xl font-serif text-3xl leading-[1.15] text-cream-100 md:text-[44px]">
          See your report take shape before you commit to anything.
        </h2>
        <p className="mt-6 max-w-2xl text-[17px] leading-[1.65] text-cream-300">
          This is the actual intake flow, with sample data. Edit the form —
          the cover updates as you type. Then run the sample recording
          through the preview engine. The preview is instant. The full
          report is human-checked before it&apos;s yours.
        </p>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <div className="rounded-md border border-cream-200/10 bg-ink-850 p-8">
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-rust-400">
              Step 2 · About your meeting
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <Field label="Company" value="Nordane SA" />
              <Field label="Meeting title" value="September ordinary session" />
            </div>

            <div className="mt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-cream-500">
                Region
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {regions.map((r) => (
                  <span
                    key={r.label}
                    className={
                      "rounded-full border px-3 py-1 font-mono text-[11px] " +
                      (r.live
                        ? "border-rust-400/40 bg-rust-400/10 text-rust-400"
                        : "border-cream-200/10 text-cream-500")
                    }
                  >
                    {r.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-cream-500">
                Governing body
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {governingBodies.map((g) => (
                  <span
                    key={g}
                    className="rounded-full border border-cream-200/10 px-3 py-1 font-mono text-[11px] text-cream-300"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Meeting date" value="17 September 2026" />
              <Field label="Report language" value="English" />
            </div>

            <p className="mt-6 font-mono text-[11px] text-cream-500">
              Selection: France → CSE → English
            </p>

            <div className="mt-8 border-t border-cream-200/10 pt-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-rust-400">
                Step 3 · Source file
              </p>
              <div className="mt-3 flex items-center justify-between rounded border border-cream-200/10 px-4 py-3">
                <span className="text-[13px] text-cream-200">
                  Run the sample recording
                </span>
                <span className="font-mono text-[11px] text-cream-500">
                  reunion_cse_17-09.mp3 · 48:12
                </span>
              </div>
              <p className="mt-2 font-mono text-[10.5px] text-cream-500">
                No upload needed for the demo
              </p>
            </div>
          </div>

          <div className="rounded-md bg-paper-500 p-8 text-slate-900">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
              Summary report · builds as you type
            </p>
            <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
              Minutes · CSE
            </p>
            <h3 className="mt-1 font-serif text-lg text-slate-900">
              September ordinary session
            </h3>
            <p className="mt-1 text-[12.5px] text-slate-600">Nordane SA</p>

            <div className="mt-8 space-y-2 border-t border-slate-900/10 pt-4">
              {[
                ["Region", "France"],
                ["Governing body", "CSE"],
                ["Language", "English"],
                ["Date", "17 September 2026"],
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
              Run the sample file to unlock the three-part preview in the
              viewer.
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-cream-500">
        {label}
      </p>
      <div className="mt-1.5 rounded border border-cream-200/15 bg-ink-900 px-3 py-2 text-[13px] text-cream-100">
        {value}
      </div>
    </div>
  );
}
