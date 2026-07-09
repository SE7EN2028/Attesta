import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Nav } from "@/components/nav";
import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";
import { computeComplianceScore } from "@/lib/compliance";
import {
  ComplianceDashboard,
  type ComplianceFindingRow,
} from "@/components/report/compliance-dashboard";
import type { ReportContent } from "@/lib/report-generation";

export default async function CompliancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const report = await prisma.report.findUnique({
    where: { id },
    include: { meetingRequest: true, complianceFindings: true },
  });

  if (!report) {
    notFound();
  }

  const content = report.content as unknown as ReportContent;
  const meetingTitle = content?.coverInfo?.meetingTitle ?? report.meetingRequest.title;
  const company = content?.coverInfo?.company ?? report.meetingRequest.company;
  const meetingDate =
    content?.coverInfo?.date ?? report.meetingRequest.meetingDate.toISOString().slice(0, 10);

  const score = computeComplianceScore(report.complianceFindings);

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-ink-900 py-12 md:py-16">
        <Container>
          <Link
            href={`/report/${report.id}`}
            className="font-mono text-[11px] uppercase tracking-[0.1em] text-cream-400 transition-colors hover:text-cream-100"
          >
            ← Back to report
          </Link>
          <Eyebrow className="mt-6">The audit</Eyebrow>
          <h1 className="mt-5 font-serif text-3xl text-cream-100 md:text-4xl">
            {meetingTitle}
          </h1>
          <p className="mt-3 max-w-xl text-[15px] text-cream-300">
            {company} · {report.meetingRequest.region} · {report.meetingRequest.governingBody}
          </p>

          <ComplianceDashboard
            findings={report.complianceFindings as unknown as ComplianceFindingRow[]}
            score={score}
            meetingTitle={meetingTitle}
            company={company}
            meetingDate={meetingDate}
            region={report.meetingRequest.region}
            governingBody={report.meetingRequest.governingBody}
          />
        </Container>
      </main>
    </>
  );
}
