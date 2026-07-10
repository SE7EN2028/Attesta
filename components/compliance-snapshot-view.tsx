"use client";

import {
  ComplianceDashboard,
  type ComplianceFindingRow,
} from "@/components/report/compliance-dashboard";
import {
  OnTopicScoreChart,
  SpeakerTalkTimeChart,
} from "@/components/report/report-charts";
import { computeComplianceScore } from "@/lib/compliance";
import type {
  ComplianceFindingData,
  NumericalData,
  SpeakerAnalytics,
} from "@/lib/report-generation";

// Read-only rendering of the Instant Compliance Snapshot. Reuses the existing
// ComplianceDashboard (status ring + risk/gap + recommendations) and the
// report charts (speaker analysis); numerical data as simple stat cards.
export function ComplianceSnapshotView({
  complianceFindings,
  speakerAnalytics,
  numericalData,
  meetingTitle,
  company,
  region,
  governingBody,
  meetingDate,
}: {
  complianceFindings: ComplianceFindingData[];
  speakerAnalytics: SpeakerAnalytics;
  numericalData: NumericalData;
  meetingTitle: string;
  company: string;
  region: string;
  governingBody: string;
  meetingDate: string;
}) {
  const isGeneral = region === "General";
  // ComplianceDashboard keys rows by id; snapshot findings are ephemeral, so
  // synthesise stable indices.
  const findingRows: ComplianceFindingRow[] = complianceFindings.map((f, i) => ({
    id: `snap-${i}`,
    ...f,
  }));
  const score = computeComplianceScore(findingRows);

  return (
    <div className="space-y-12">
      {/* Compliance status + risk/gap findings + recommendations */}
      <section>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-rust-400">
          Compliance status &amp; findings
        </h2>
        {isGeneral ? (
          <div className="mt-4 max-w-2xl rounded-xl border border-cream-200/10 bg-ink-850 p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-cream-500">
              Not applicable
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-cream-300">
              General reports aren&apos;t checked against any regulatory or
              works-council framework, so there&apos;s no compliance audit —
              only the speaker and numerical analysis below.
            </p>
          </div>
        ) : (
          <ComplianceDashboard
            findings={findingRows}
            score={score}
            meetingTitle={meetingTitle}
            company={company}
            meetingDate={meetingDate}
            region={region}
            governingBody={governingBody}
          />
        )}
      </section>

      {/* Speaker analysis */}
      <section>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-rust-400">
          Speaker analysis
        </h2>
        {speakerAnalytics.length === 0 ? (
          <p className="mt-3 text-[14px] italic text-cream-500">
            No distinct speakers detected in this source.
          </p>
        ) : (
          <div className="mt-4 grid gap-4 rounded-xl bg-paper-100 p-6 text-slate-900 md:grid-cols-2">
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
                Talk time
              </p>
              <SpeakerTalkTimeChart data={speakerAnalytics} />
            </div>
            <div>
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.1em] text-slate-500">
                On-topic score
              </p>
              <OnTopicScoreChart data={speakerAnalytics} />
            </div>
          </div>
        )}
      </section>

      {/* Numerical data */}
      <section>
        <h2 className="font-mono text-[11px] uppercase tracking-[0.12em] text-rust-400">
          Numerical data
        </h2>
        {numericalData.length === 0 ? (
          <p className="mt-3 text-[14px] italic text-cream-500">
            No figures or amounts were mentioned.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {numericalData.map((n, i) => (
              <div
                key={i}
                className="rounded-lg border border-cream-200/10 bg-ink-850 p-4"
              >
                <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-cream-500">
                  {n.label}
                </p>
                <p className="mt-1 font-serif text-2xl text-cream-100">
                  {n.value}
                </p>
                {n.context && (
                  <p className="mt-1 text-[12.5px] leading-relaxed text-cream-400">
                    {n.context}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
