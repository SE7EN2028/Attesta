import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";
import { FlipBook } from "@/components/flip-book";
import { ReportViewer } from "@/components/report/report-viewer";
import { findSampleReport } from "@/lib/sample-report";
import type {
  ReportContent,
  SpeakerAnalytics,
  NumericalData,
} from "@/lib/report-generation";

export async function SampleReportSection() {
  // Same real, locked sample report shown at /samples — embedded directly here
  // rather than linking out. Falls back to the design flip-book mock only if no
  // locked, renderable report exists yet.
  const report = await findSampleReport();

  return (
    <section
      id="sample-report"
      className="border-t border-cream-200/10 py-24 md:py-32"
    >
      <Container>
        <Eyebrow>The sample report</Eyebrow>
        <h2 className="mt-5 max-w-2xl font-serif text-3xl leading-[1.15] text-cream-100 md:text-[44px]">
          Judge the output before you create an account.
        </h2>
        <p className="mt-6 max-w-2xl text-[17px] leading-[1.65] text-cream-300">
          A real, generated sample report — never client data. No
          registration, no email. Drag a page corner or use the arrows, and
          look for the things that matter: votes pulled out automatically,
          speaker analytics, the audit score, the sign-off block on the last
          spread.
        </p>
        <p className="mt-3 font-mono text-[12px] text-cream-500">
          Then run your own preview ↑
        </p>
      </Container>

      {report ? (
        // ReportViewer brings its own Container — don't double-wrap.
        <div className="mt-14">
          <ReportViewer
            reportId={report.id}
            content={report.content as unknown as ReportContent}
            speakerAnalytics={
              report.speakerAnalytics as unknown as SpeakerAnalytics
            }
            numericalData={report.numericalData as unknown as NumericalData}
            tier={report.tier}
            status={report.status}
            generatedBy={report.generatedBy}
            region={report.meetingRequest.region}
          />
        </div>
      ) : (
        <Container>
          <div className="mt-14 max-w-[560px]">
            <div className="rounded-xl border border-rust-600/40 bg-paper-100 p-6 shadow-[0_24px_50px_-30px_rgba(19,26,36,0.5)]">
              <div className="mb-[18px] flex flex-wrap items-center justify-between gap-2">
                <span className="rounded-full bg-rust-600 px-2.5 py-1 font-mono text-[10.5px] uppercase tracking-[0.12em] text-paper-100">
                  Sample report
                </span>
                <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-slate-400">
                  Delivered in 1–2 hours
                </span>
              </div>
              <FlipBook sample="sample-report" />
            </div>
          </div>
        </Container>
      )}
    </section>
  );
}
