import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";

const steps = [
  {
    n: "01",
    title: "Create your account",
    body: "Registration comes first — uploads and previews live behind it, so every request is tied to an accountable owner.",
    meta: "Email + company · 1 min",
  },
  {
    n: "02",
    title: "Describe the meeting",
    body: "Company, region, governing body — CSE, CSSCT, HR, AG — date, title and output language. The cover page builds itself live as you choose.",
    meta: "France → CSE → English",
  },
  {
    n: "03",
    title: "Upload the source",
    body: "A recording or a document. It unlocks a deeper, read-only preview: speakers, figures as charts, and a compliance safety check — in the page-flip viewer.",
    meta: "MP3 · MP4 · WAV · M4A · DOCX · PDF",
  },
  {
    n: "04",
    title: "Request your report",
    body: "Add your notes, and send it. A specialist reviews the full transcript, runs the compliance audit, and locks the report before it reaches your account.",
    meta: "Review → Audit → Lock → Delivery",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-slate-900/10 bg-paper-500 py-24 md:py-32">
      <Container>
        <Eyebrow className="text-rust-600">How it works</Eyebrow>
        <h2 className="mt-5 max-w-2xl font-serif text-3xl leading-[1.15] text-slate-900 md:text-[44px]">
          Four steps. You do the first three in minutes.
        </h2>

        <div className="mt-16 grid gap-x-8 gap-y-14 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.n}>
              <p className="font-serif text-3xl text-rust-600">{step.n}.</p>
              <h3 className="mt-4 text-lg font-semibold text-slate-900">
                {step.title}
              </h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-slate-700">
                {step.body}
              </p>
              <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.08em] text-slate-500">
                {step.meta}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-16 font-mono text-[13px] text-slate-600">
          Try steps 2 and 3 live, right now ↓
        </p>
      </Container>
    </section>
  );
}
