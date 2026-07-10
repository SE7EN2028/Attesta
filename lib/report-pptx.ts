import PptxGenJS from "pptxgenjs";
import type {
  ReportContent,
  SpeakerAnalytics,
  NumericalData,
} from "@/lib/report-generation";

// Pure .pptx builder: turns an already-generated report into a slide deck.
// No DB, no network — takes plain data, returns a Buffer. Mechanical mapping,
// one section per block; empty arrays skip their slide. Numeric data becomes
// tables (recharts visuals are client-DOM and deliberately not embedded).

export type FindingRow = {
  category: string;
  riskLevel: string;
  description: string;
  confidence: number;
};

export type BuildReportDeckInput = {
  content: ReportContent;
  speakerAnalytics: SpeakerAnalytics;
  numericalData: NumericalData;
  findings: FindingRow[];
  tier: string;
  status: string;
  region: string;
};

const RUST = "A63A2E";
const INK = "131A24";
const SLATE = "3A4350";
const MUTED = "6A7280";
const LINE = "E2DCCB";
const PAPER = "FDFCF8";

const MARGIN_X = 0.5;
const CONTENT_W = 9; // 10in slide (16:9) minus 0.5 margins each side

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function buildReportDeck(
  input: BuildReportDeckInput
): Promise<Buffer> {
  const { content, speakerAnalytics, numericalData, findings } = input;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";

  // Draws the consistent title bar + underline at the top of a content slide.
  function titleBar(slide: PptxGenJS.Slide, title: string) {
    slide.background = { color: PAPER };
    slide.addText(title, {
      x: MARGIN_X,
      y: 0.35,
      w: CONTENT_W,
      h: 0.5,
      fontSize: 20,
      bold: true,
      color: RUST,
    });
    slide.addShape(pptx.ShapeType.line, {
      x: MARGIN_X,
      y: 0.92,
      w: CONTENT_W,
      h: 0,
      line: { color: LINE, width: 1 },
    });
  }

  // A table split across as many slides as needed (perPage body rows each).
  function tableSlides(
    title: string,
    header: string[],
    rows: string[][],
    colW: number[],
    perPage: number,
    bodyFontSize = 11
  ) {
    const pages = chunk(rows, perPage);
    pages.forEach((pageRows, i) => {
      const slide = pptx.addSlide();
      titleBar(slide, pages.length > 1 ? `${title} (${i + 1}/${pages.length})` : title);
      const headerCells = header.map((h) => ({
        text: h,
        options: { bold: true, color: PAPER, fill: { color: RUST } },
      }));
      const bodyRows = pageRows.map((r) =>
        r.map((c) => ({ text: c, options: { color: SLATE } }))
      );
      slide.addTable([headerCells, ...bodyRows], {
        x: MARGIN_X,
        y: 1.15,
        w: CONTENT_W,
        colW,
        border: { type: "solid", color: LINE, pt: 0.5 },
        fontSize: bodyFontSize,
        valign: "top",
        autoPage: false,
      });
    });
  }

  function textSlide(
    title: string,
    body: PptxGenJS.TextProps[]
  ) {
    const slide = pptx.addSlide();
    titleBar(slide, title);
    slide.addText(body, {
      x: MARGIN_X,
      y: 1.15,
      w: CONTENT_W,
      h: 4,
      fontSize: 13,
      color: INK,
      valign: "top",
    });
  }

  /* ---------- Cover ---------- */
  const cover = pptx.addSlide();
  cover.background = { color: INK };
  cover.addText(content.coverInfo.meetingTitle || "Meeting report", {
    x: MARGIN_X,
    y: 1.7,
    w: CONTENT_W,
    h: 1.4,
    fontSize: 34,
    bold: true,
    color: PAPER,
    fontFace: "Georgia",
  });
  cover.addText(
    [
      content.coverInfo.company,
      content.coverInfo.region,
      content.coverInfo.governingBody,
      content.coverInfo.date,
    ]
      .filter(Boolean)
      .join("   ·   "),
    { x: MARGIN_X, y: 3.1, w: CONTENT_W, h: 0.5, fontSize: 15, color: "D9705F" }
  );
  cover.addText(`${input.tier} · ${input.status}`, {
    x: MARGIN_X,
    y: 5.0,
    w: CONTENT_W,
    h: 0.4,
    fontSize: 10,
    color: MUTED,
    fontFace: "Courier New",
  });

  /* ---------- Executive summary ---------- */
  if (content.executiveSummary?.trim()) {
    textSlide("Executive summary", [
      { text: content.executiveSummary, options: { color: INK } },
    ]);
  }

  /* ---------- Attendance ---------- */
  if (content.attendance.length) {
    tableSlides(
      "Attendance",
      ["Name", "Role", "Present"],
      content.attendance.map((a) => [
        a.name,
        a.role,
        a.present ? "Yes" : "No",
      ]),
      [3.2, 4.6, 1.2],
      10
    );
  }

  /* ---------- Agenda ---------- */
  if (content.agendaItems.length) {
    textSlide(
      "Agenda",
      content.agendaItems
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((a) => ({
          text: `${a.order}.  ${a.title}`,
          options: { color: INK, bullet: false, breakLine: true },
        }))
    );
  }

  /* ---------- Discussion log ---------- */
  if (content.discussionLog.length) {
    tableSlides(
      "Discussion log",
      ["Time", "Speaker", "Point"],
      content.discussionLog.map((d) => [
        d.timestamp || "",
        d.speakerName || "",
        d.text || "",
      ]),
      [1.1, 1.9, 6.0],
      8,
      9
    );
  }

  /* ---------- Decisions ---------- */
  if (content.decisions.length) {
    textSlide(
      "Decisions",
      content.decisions.map((d) => ({
        text: d.description,
        options: { color: INK, bullet: true, breakLine: true },
      }))
    );
  }

  /* ---------- Votes ---------- */
  if (content.votes.length) {
    tableSlides(
      "Votes",
      ["Item", "For", "Against", "Abstain"],
      content.votes.map((v) => [
        v.description,
        String(v.forCount),
        String(v.againstCount),
        String(v.abstainCount),
      ]),
      [5.4, 1.2, 1.2, 1.2],
      9
    );
  }

  /* ---------- Compliance findings (omitted for General / when none) ---------- */
  if (findings.length) {
    tableSlides(
      "Compliance findings",
      ["Category", "Risk", "Finding", "Conf%"],
      findings.map((f) => [
        f.category,
        f.riskLevel,
        f.description,
        String(f.confidence),
      ]),
      [1.9, 1.3, 4.9, 0.9],
      7,
      9
    );
  }

  /* ---------- Speaker analytics ---------- */
  if (speakerAnalytics.length) {
    tableSlides(
      "Speaker analytics",
      ["Speaker", "Talk time (s)", "Contributions", "On-topic"],
      speakerAnalytics.map((s) => [
        s.speakerName,
        String(s.talkTimeSeconds),
        String(s.contributionCount),
        String(s.onTopicScore),
      ]),
      [3.6, 1.8, 1.8, 1.8],
      9
    );
  }

  /* ---------- Numerical data ---------- */
  if (numericalData.length) {
    tableSlides(
      "Figures mentioned",
      ["Label", "Value", "Context"],
      numericalData.map((n) => [n.label, n.value, n.context]),
      [2.6, 1.6, 4.8],
      9,
      10
    );
  }

  /* ---------- Closing & procedural notes ---------- */
  const hasClosing = content.closingNotes?.trim();
  const hasProcedural = content.proceduralNotes.length > 0;
  if (hasClosing || hasProcedural) {
    const body: PptxGenJS.TextProps[] = [];
    if (hasClosing) {
      body.push({
        text: content.closingNotes,
        options: { color: INK, breakLine: true },
      });
    }
    content.proceduralNotes.forEach((note) =>
      body.push({
        text: note,
        options: { color: SLATE, bullet: true, breakLine: true },
      })
    );
    textSlide("Closing & procedural notes", body);
  }

  const out = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return out;
}
