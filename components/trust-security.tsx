import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";

const logLines = [
  "17:22 review · m.leroy · 14 corrections",
  "18:03 lock · sha-256: 9f3a…c41d",
  "18:04 dispatch → client account",
];

const regions = [
  { name: "France · CSE, CSSCT, HR, AG", status: "Live", live: true },
  { name: "Germany · Betriebsrat", status: "Coming soon", live: false },
  { name: "Belgium · CPPT / OR", status: "Coming soon", live: false },
  { name: "Netherlands · OR", status: "Coming soon", live: false },
];

export function TrustSecurity() {
  return (
    <section id="security" className="border-t border-slate-900/10 bg-paper-500 py-24 md:py-32">
      <Container>
        <Eyebrow className="text-rust-600">Trust &amp; security</Eyebrow>
        <h2 className="mt-5 max-w-2xl font-serif text-3xl leading-[1.15] text-slate-900 md:text-[44px]">
          Built like the documents it produces: accountable.
        </h2>

        <div className="mt-16 grid gap-12 md:grid-cols-2">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Encrypted, both directions
            </h3>
            <p className="mt-3 text-[14.5px] leading-relaxed text-slate-700">
              Recordings and transcripts are personal, sensitive data.
              Everything is encrypted in transit and at rest, with a clear
              retention policy — you decide how long source audio survives
              after delivery.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              A trail for everything
            </h3>
            <p className="mt-3 text-[14.5px] leading-relaxed text-slate-700">
              Every edit, approval and lock is logged — who, what, when. The
              trail ships with the report.
            </p>
            <div className="mt-4 space-y-1 rounded border border-slate-900/10 bg-paper-100 p-4 font-mono text-[11px] text-slate-600">
              {logLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Your history stays yours
            </h3>
            <p className="mt-3 text-[14.5px] leading-relaxed text-slate-700">
              Returning clients keep their full history — past requests,
              past reports, notes — linked to their account across meetings
              and cycles. Minutes are a series, not one-offs; the platform
              treats them that way.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-semibold text-slate-900">
              Honest regional coverage
            </h3>
            <p className="mt-3 text-[14.5px] leading-relaxed text-slate-700">
              A compliance audit is only as good as its rule set. We list a
              region as live only when our team maintains its rules.
            </p>
            <div className="mt-4 space-y-2">
              {regions.map((r) => (
                <div
                  key={r.name}
                  className="flex items-center justify-between border-b border-slate-900/10 pb-2 text-[13px]"
                >
                  <span className="text-slate-700">{r.name}</span>
                  <span
                    className={
                      "font-mono text-[10px] uppercase tracking-[0.08em] " +
                      (r.live ? "text-green-600" : "text-slate-500")
                    }
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
