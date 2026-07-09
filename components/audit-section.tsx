import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";
import { cn } from "@/lib/utils";

const stats = [
  { value: "2", label: "Critical risks" },
  { value: "5", label: "Recommendations" },
  { value: "14", label: "Compliant areas" },
  { value: "2", label: "Missing documents" },
];

const filters = [
  { label: "All", count: 10 },
  { label: "Risks", count: 3 },
  { label: "Missing docs", count: 2 },
  { label: "Recommendations", count: 2 },
  { label: "Compliant", count: 3 },
];

type Risk = "Critical" | "High" | "Medium" | "Advisory" | "Compliant";

const riskStyles: Record<Risk, string> = {
  Critical: "bg-rust-400/10 text-rust-400",
  High: "bg-gold-600/10 text-gold-600",
  Medium: "bg-gold-400/10 text-gold-600",
  Advisory: "bg-blue-400/10 text-blue-400",
  Compliant: "bg-green-400/10 text-green-400",
};

const findings: { finding: string; risk: Risk; impact: string; confidence: string }[] = [
  {
    finding: "Vote on agenda item 4 recorded without a headcount",
    risk: "Critical",
    impact: "Deliberation could be challenged as invalid",
    confidence: "88%",
  },
  {
    finding: "BDESE consultation deadline not referenced in the record",
    risk: "Critical",
    impact: "Procedural-challenge exposure (e.g. Art. L2312-16)",
    confidence: "92%",
  },
  {
    finding: "Opinion on the training plan lacks formal opinion wording",
    risk: "Medium",
    impact: "Weakens evidentiary value of the opinion",
    confidence: "81%",
  },
  {
    finding: "Employer's written answer to question 7 not annexed",
    risk: "High",
    impact: "Record incomplete without Annex A",
    confidence: "85%",
  },
  {
    finding: "Signed attendance sheet absent from source material",
    risk: "Medium",
    impact: "Quorum evidenced in text only",
    confidence: "79%",
  },
  {
    finding: "Attach the vote tally sheet as Annex B",
    risk: "Advisory",
    impact: "Strengthens the decision log",
    confidence: "90%",
  },
  {
    finding: "Name the acting secretary in the header block",
    risk: "Advisory",
    impact: "Standard CSE formality",
    confidence: "94%",
  },
  {
    finding: "Quorum met — 9 of 11 titular members present",
    risk: "Compliant",
    impact: "Meets the statutory threshold (e.g. Art. L2314-1)",
    confidence: "97%",
  },
  {
    finding: "Convocation sent 8 days before the meeting",
    risk: "Compliant",
    impact: "Within the statutory minimum (3 days)",
    confidence: "99%",
  },
  {
    finding: "Previous minutes formally approved and recorded",
    risk: "Compliant",
    impact: "Continuity of record maintained",
    confidence: "99%",
  },
];

export function AuditSection() {
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

        <div className="mt-14 grid gap-6 lg:grid-cols-[220px_1fr]">
          <div className="rounded-md border border-cream-200/10 bg-ink-850 p-6">
            <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-cream-500">
              Illustrative sample data
            </p>
            <p className="mt-4 font-serif text-5xl text-cream-100">
              78<span className="text-xl text-cream-400">/100</span>
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.1em] text-cream-400">
              Overall compliance
            </p>
            <p className="mt-4 text-[12px] text-cream-300">
              CSE meeting · 17.09.2026
            </p>
            <p className="text-[12px] text-cream-500">
              vs. France · CSE rule set
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4 border-t border-cream-200/10 pt-5">
              {stats.map((s) => (
                <div key={s.label}>
                  <p className="font-serif text-2xl text-cream-100">
                    {s.value}
                  </p>
                  <p className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-cream-500">
                    {s.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-md border border-cream-200/10 bg-ink-850 p-6">
            <div className="flex flex-wrap gap-2">
              {filters.map((f, i) => (
                <span
                  key={f.label}
                  className={cn(
                    "rounded-full border px-3 py-1 font-mono text-[10.5px]",
                    i === 0
                      ? "border-rust-400/40 bg-rust-400/10 text-rust-400"
                      : "border-cream-200/10 text-cream-400"
                  )}
                >
                  {f.label} · {f.count}
                </span>
              ))}
            </div>

            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-cream-200/10 font-mono text-[10px] uppercase tracking-[0.08em] text-cream-500">
                    <th className="py-2 pr-4 font-normal">Finding</th>
                    <th className="py-2 pr-4 font-normal">Risk</th>
                    <th className="py-2 pr-4 font-normal">Impact</th>
                    <th className="py-2 font-normal">Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {findings.map((f) => (
                    <tr
                      key={f.finding}
                      className="border-b border-cream-200/5 align-top"
                    >
                      <td className="py-3 pr-4 text-[13px] text-cream-200">
                        {f.finding}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={cn(
                            "rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.05em]",
                            riskStyles[f.risk]
                          )}
                        >
                          {f.risk}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-[12.5px] text-cream-400">
                        {f.impact}
                      </td>
                      <td className="py-3 font-mono text-[12.5px] text-cream-300">
                        {f.confidence}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.06em] text-cream-500">
              Demo findings — illustrative content; rule citations are
              examples, not legal advice.
            </p>
          </div>
        </div>

        <p className="mt-8 max-w-2xl text-[14px] text-cream-400">
          Outputs can also include a slide-deck summary of these findings,
          for presenting outcomes to a board or leadership team.
        </p>
      </Container>
    </section>
  );
}
