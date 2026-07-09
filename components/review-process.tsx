import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";

const miniSteps = [
  "Transcript review",
  "Tuned draft",
  "Editor pass",
  "Lock & dispatch",
];

const speakers = [
  "S1 · A. Vasseur",
  "S2 · M. Duval (CFDT)",
  "S3 · C. Marchal",
  "S4 · L. Petit",
];

const transcriptLines = [
  {
    time: "00:02:11",
    text: "A. Vasseur — I call the session to order. Quorum is met — nine titular members present.",
  },
  {
    time: "00:02:39",
    text: "C. Marchal — The minutes of 18 June are submitted for approval…",
  },
  {
    time: "00:04:02",
    text: "M. Duval — One remark on item 3 before we begin, about the training budget.",
  },
];

export function ReviewProcess() {
  return (
    <section className="border-t border-cream-200/10 py-24 md:py-32">
      <Container>
        <Eyebrow>After you request</Eyebrow>
        <h2 className="mt-5 max-w-2xl font-serif text-3xl leading-[1.15] text-cream-100 md:text-[44px]">
          What happens behind the curtain — and why it&apos;s worth paying
          for.
        </h2>
        <p className="mt-6 max-w-2xl text-[17px] leading-[1.65] text-cream-300">
          AI drafts everything. Nothing ships on AI&apos;s word alone. Your
          request lands with a consultancy team, and this is their pass:
        </p>

        <div className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
          {miniSteps.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <span className="font-mono text-[11px] text-rust-400">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-[13.5px] text-cream-200">{s}</span>
            </div>
          ))}
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-2">
          <div>
            <h3 className="font-serif text-xl text-cream-100">
              The true transcript, read by a person
            </h3>
            <p className="mt-4 text-[14.5px] leading-relaxed text-cream-300">
              A specialist opens the full, speaker-identified transcript —
              real diarization, every voice separated — in the same
              page-flip viewer you&apos;ve been using. They correct names,
              terms and attributions against the audio itself.
            </p>
            <p className="mt-4 text-[14.5px] leading-relaxed text-cream-300">
              Nothing is guessed silently. Inaudible passages are flagged in
              an annex — that honesty is what makes the record defensible.
            </p>
          </div>

          <div className="rounded-md bg-paper-500 p-7 text-slate-900">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
                Verbatim · diarization
              </p>
              <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
                48:12 audio
              </p>
            </div>
            <p className="mt-2 font-serif text-base text-slate-900">
              Full transcript — 4 speakers
            </p>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-slate-500">
              {speakers.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>

            <div className="mt-5 space-y-3 border-t border-slate-900/10 pt-4">
              {transcriptLines.map((line) => (
                <p key={line.time} className="text-[12.5px] leading-relaxed">
                  <span className="mr-2 font-mono text-[10px] text-slate-400">
                    {line.time}
                  </span>
                  <span className="text-slate-700">{line.text}</span>
                </p>
              ))}
            </div>
            <p className="mt-4 text-right font-mono text-[8px] text-slate-400">
              01 / 04
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div />
          <div className="rounded-md border border-cream-200/10 bg-ink-850 p-7">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-cream-500">
                Review — corrections
              </p>
              <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-cream-500">
                P. 2
              </p>
            </div>
            <p className="mt-2 font-serif text-base text-cream-100">
              What a machine alone would have missed
            </p>

            <div className="mt-5 space-y-4">
              <div>
                <p className="text-[12.5px] text-cream-300">
                  <span className="mr-2 font-mono text-[10px] text-cream-500">
                    00:23:41
                  </span>
                  M. Duval — …regarding the{" "}
                  <span className="line-through text-cream-500">
                    thirteen-hour bonus
                  </span>{" "}
                  the thirteenth-month bonus, the request stands.
                </p>
                <p className="mt-1 font-mono text-[10.5px] text-rust-400">
                  Reviewer · M.Leroy — corrected against the audio, 00:23:41.
                  Standard payroll term, not a speaker error.
                </p>
              </div>
              <div>
                <p className="text-[12.5px] text-cream-300">
                  <span className="mr-2 font-mono text-[10px] text-cream-500">
                    00:31:07
                  </span>
                  Speaker 2 → M. Duval — attribution corrected after checking
                  two similar voices (S2/S4).
                </p>
              </div>
            </div>
            <p className="mt-4 text-right font-mono text-[8px] text-cream-500">
              02 / 04
            </p>
          </div>
        </div>
      </Container>
    </section>
  );
}
