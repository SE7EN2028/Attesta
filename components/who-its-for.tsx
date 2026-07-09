import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";

const personas = [
  {
    tag: "You run the meetings",
    title: "HR & works-council teams",
    body: "Secretaries and HR directors running recurring statutory meetings. Stop writing minutes at midnight; start reviewing a draft that heard everything.",
  },
  {
    tag: "You draft for clients",
    title: "Consultancies & law firms",
    body: "A productized intake for the minutes you already draft on clients' behalf — with a defensible trail behind every page.",
  },
  {
    tag: "You manage many entities",
    title: "Multi-entity enterprises",
    body: "Standardized, auditable minutes across subsidiaries, countries and languages — the same structure and the same audit trail, everywhere you operate.",
  },
];

export function WhoItsFor() {
  return (
    <section className="border-t border-cream-200/10 py-24 md:py-32">
      <Container>
        <Eyebrow>Who it&apos;s for</Eyebrow>
        <h2 className="mt-5 max-w-2xl font-serif text-3xl leading-[1.15] text-cream-100 md:text-[44px]">
          Three kinds of people keep these records.
        </h2>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {personas.map((p) => (
            <div
              key={p.title}
              className="rounded-md border border-cream-200/10 bg-ink-850 p-8"
            >
              <p className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-rust-400">
                {p.tag}
              </p>
              <h3 className="mt-4 font-serif text-xl text-cream-100">
                {p.title}
              </h3>
              <p className="mt-3 text-[14.5px] leading-relaxed text-cream-300">
                {p.body}
              </p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
