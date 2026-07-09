import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";
import { cn } from "@/lib/utils";

const tiers = [
  {
    name: "Essential",
    features: [
      "Chronological summary",
      "Basic compliance check",
      "Speaker-name correction only",
      "PDF output",
    ],
    featured: false,
  },
  {
    name: "Scope",
    features: [
      "Agenda-based structure",
      "Full compliance audit",
      "Full text + speaker edits",
      "PDF + DOCX + decision log",
    ],
    featured: false,
  },
  {
    name: "Premium",
    features: [
      "Formal legal layout",
      "Clause-by-clause review",
      "Human reviewer pass (optional)",
      "Signed + branded + audit-trail",
    ],
    featured: true,
  },
];

export function TiersSection() {
  return (
    <section id="tiers" className="border-t border-cream-200/10 py-24 md:py-32">
      <Container>
        <Eyebrow>Tiers</Eyebrow>
        <h2 className="mt-5 max-w-2xl font-serif text-3xl leading-[1.15] text-cream-100 md:text-[44px]">
          Three ways to receive the record.
        </h2>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                "rounded-md border p-8",
                tier.featured
                  ? "border-rust-400/40 bg-ink-950 shadow-[0_26px_50px_-26px_rgba(13,19,27,0.6),0_6px_16px_-8px_rgba(13,19,27,0.35)]"
                  : "border-cream-200/10 bg-ink-850"
              )}
            >
              {tier.featured && (
                <span className="rounded-full border border-rust-400/40 bg-rust-400/10 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-rust-400">
                  Most complete
                </span>
              )}
              <h3
                className={cn(
                  "font-serif text-xl text-cream-100",
                  tier.featured ? "mt-4" : ""
                )}
              >
                {tier.name}
              </h3>

              <ul className="mt-5 space-y-3">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2.5 text-[14.5px] leading-relaxed text-cream-300"
                  >
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rust-400" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
