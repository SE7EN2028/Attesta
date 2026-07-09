import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";

const languages = ["English", "Français", "Deutsch"];

const questions = [
  "Where is my report right now?",
  "What's included in my report?",
  "Who approved my minutes?",
];

export function AssistantSection() {
  return (
    <section id="assistant" className="border-t border-cream-200/10 py-24 md:py-32">
      <Container className="grid items-center gap-16 lg:grid-cols-2">
        <div>
          <Eyebrow>After delivery</Eyebrow>
          <h2 className="mt-5 font-serif text-3xl leading-[1.15] text-cream-100 md:text-[44px]">
            Ask your report anything. In its own language.
          </h2>
          <p className="mt-6 max-w-md text-[17px] leading-[1.65] text-cream-300">
            Every delivered report comes with a voice-and-text assistant that
            answers questions about the document and the process — in
            whichever language your report was produced. It answers from
            curated knowledge, and hands anything else to a person.
          </p>
          <div className="mt-6 flex gap-2">
            {languages.map((l, i) => (
              <span
                key={l}
                className={
                  "rounded-full border px-3 py-1 font-mono text-[11px] " +
                  (i === 0
                    ? "border-rust-400/40 bg-rust-400/10 text-rust-400"
                    : "border-cream-200/10 text-cream-500")
                }
              >
                {l}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-cream-200/10 bg-ink-850 p-6">
          <div className="flex items-center justify-between border-b border-cream-200/10 pb-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-cream-200">
              Attesta assistant
            </p>
            <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-cream-500">
              EN · English
            </p>
          </div>

          <div className="mt-4 rounded-[10px_10px_10px_3px] bg-ink-800 p-4 text-[13.5px] leading-relaxed text-cream-200">
            Hello — ask me anything about your report or the process, by
            text or by voice.
          </div>

          <div className="mt-4 space-y-2">
            {questions.map((q) => (
              <div
                key={q}
                className="rounded border border-cream-200/10 px-4 py-2.5 text-[13px] text-cream-300"
              >
                {q}
              </div>
            ))}
          </div>

          <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.08em] text-cream-500">
            Idle · tap a question
          </p>
        </div>
      </Container>
    </section>
  );
}
