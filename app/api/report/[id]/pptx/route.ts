import { prisma } from "@/lib/prisma";
import {
  isRenderableReportContent,
  type ReportContent,
  type SpeakerAnalytics,
  type NumericalData,
} from "@/lib/report-generation";
import { buildReportDeck } from "@/lib/report-pptx";

// pptxgenjs uses jszip / Node buffers — force the Node runtime (not edge).
export const runtime = "nodejs";

const PPTX_CONTENT_TYPE =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

// Builds a .pptx slide deck from an already-generated report and streams it as
// a download. Read-only: no change to generation/pipeline. Access model is the
// same as /report/[id] (reachable by report id, no owner gating — auth is a
// deferred item).
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const report = await prisma.report.findUnique({
    where: { id: params.id },
    include: { meetingRequest: true, complianceFindings: true },
  });
  if (!report) {
    return new Response("Report not found.", { status: 404 });
  }
  if (!isRenderableReportContent(report.content)) {
    return new Response(
      "This report uses an older format that can't be exported.",
      { status: 422 }
    );
  }

  const content = report.content as ReportContent;
  const buffer = await buildReportDeck({
    content,
    speakerAnalytics: report.speakerAnalytics as unknown as SpeakerAnalytics,
    numericalData: report.numericalData as unknown as NumericalData,
    findings: report.complianceFindings.map((f) => ({
      category: f.category,
      riskLevel: f.riskLevel,
      description: f.description,
      confidence: f.confidence,
    })),
    tier: report.tier,
    status: report.status,
    region: report.meetingRequest.region,
  });

  const rawName = `${content.coverInfo.company}-${content.coverInfo.meetingTitle}`;
  const asciiName =
    rawName
      .replace(/[^\x20-\x7e]/g, "_")
      .replace(/["\\]/g, "_")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) || "report";
  const encodedName = encodeURIComponent(`${rawName}.pptx`);

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": PPTX_CONTENT_TYPE,
      "Content-Length": String(buffer.length),
      "Content-Disposition": `attachment; filename="${asciiName}.pptx"; filename*=UTF-8''${encodedName}`,
      "Cache-Control": "private, no-store",
    },
  });
}
