/* Attesta flip-book content — page-building helpers + the sample registry,
   ported near-verbatim from the design bundle's flipbook.js (window.FLIPBOOK_UI
   / window.FLIPBOOK_SAMPLES). Pages are HTML strings so the layouts match the
   design exactly; <FlipBook> renders them via dangerouslySetInnerHTML. */

const F_SERIF = "'Libre Caslon Text',Georgia,serif";
const F_SANS = "Archivo,system-ui,sans-serif";
const F_MONO = "'IBM Plex Mono',monospace";
const INK = "#1A222E",
  MUT = "#6A7280",
  RULE = "#E3DDCE",
  RED = "#A63A2E",
  GRN = "#2E6E4E",
  AMB = "#A97A1F",
  BLU = "#3E5D7C",
  PAPER = "#FDFCF8",
  WASH = "#F1EDE2";

export const C = { INK, MUT, RULE, RED, GRN, AMB, BLU, PAPER, WASH };

export const pg = (inner: string, pad?: string) =>
  `<div style="width:100%;height:100%;background:${PAPER};box-sizing:border-box;padding:${pad || "8% 9% 12%"};font-family:${F_SANS};color:${INK};display:flex;flex-direction:column;overflow:hidden">${inner}</div>`;
export const rh = (l: string, r: string) =>
  `<div style="display:flex;justify-content:space-between;gap:8px;font-family:${F_MONO};font-size:6.8px;letter-spacing:.13em;text-transform:uppercase;color:${MUT};border-bottom:1px solid ${RULE};padding-bottom:5px;margin-bottom:9px"><span>${l}</span><span>${r}</span></div>`;
export const h = (t: string) =>
  `<div style="font-family:${F_SERIF};font-size:12.5px;line-height:1.25;margin:0 0 6px">${t}</div>`;
export const sub = (t: string) =>
  `<div style="font-family:${F_MONO};font-size:6.8px;letter-spacing:.13em;text-transform:uppercase;color:${MUT};margin:8px 0 5px">${t}</div>`;
export const p = (t: string, s?: string) =>
  `<div style="font-size:8.4px;line-height:1.55;color:#3A4350;${s || ""}">${t}</div>`;
export const rule = `<div style="height:1px;background:${RULE};margin:8px 0"></div>`;
export const stamp = (txt: string, color?: string) =>
  `<div style="display:inline-block;border:1.5px solid ${color || RED};color:${color || RED};font-family:${F_MONO};font-size:7px;letter-spacing:.16em;padding:4px 8px;transform:rotate(-3.5deg);border-radius:2px;text-transform:uppercase;font-weight:600;background:rgba(253,252,248,.85)">${txt}</div>`;
export const bar = (name: string, pct: number, color: string, extra?: string) =>
  `<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:7.8px;margin-bottom:2px"><span style="font-weight:600">${name}</span><span style="font-family:${F_MONO};color:${MUT}">${extra || pct + "%"}</span></div><div style="height:4px;background:${WASH};border-radius:2px"><div style="width:${pct}%;height:100%;background:${color};border-radius:2px"></div></div></div>`;
export const chk = (state: "ok" | "warn" | "no", txt: string) => {
  const map: Record<string, [string, string]> = {
    ok: ["✓", GRN],
    warn: ["!", AMB],
    no: ["✕", RED],
  };
  const g = map[state];
  return `<div style="display:flex;gap:6px;align-items:flex-start;margin-bottom:5px"><span style="flex:none;width:11px;height:11px;border-radius:50%;border:1px solid ${g[1]};color:${g[1]};font-size:7px;line-height:11px;text-align:center;font-family:${F_MONO}">${g[0]}</span><span style="font-size:8px;line-height:1.45;color:#3A4350">${txt}</span></div>`;
};
export const sig = (name: string, role: string) =>
  `<div style="flex:1;min-width:0"><div style="font-family:${F_SERIF};font-style:italic;font-size:12px;color:#26303E;padding:0 0 3px 2px">${name}</div><div style="border-top:1px solid ${INK};padding-top:3px;font-family:${F_MONO};font-size:6.4px;letter-spacing:.1em;text-transform:uppercase;color:${MUT}">${role}</div></div>`;
export const mono = (t: string, c?: string) =>
  `<div style="font-family:${F_MONO};font-size:6.9px;line-height:1.8;color:${c || MUT};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${t}</div>`;
export const chip = (t: string, c: string) =>
  `<span style="display:inline-block;border:1px solid ${c};color:${c};font-family:${F_MONO};font-size:6.2px;letter-spacing:.08em;padding:1px 5px;border-radius:99px;text-transform:uppercase">${t}</span>`;
export const tline = (time: string, spk: string, col: string, txt: string) =>
  `<div style="display:flex;gap:5px;margin-bottom:6px;align-items:baseline"><span style="font-family:${F_MONO};font-size:6.4px;color:${MUT};flex:none">${time}</span><span style="flex:none;width:2.5px;height:8px;background:${col};border-radius:1px;align-self:center"></span><span style="font-size:7.8px;line-height:1.45;color:#3A4350"><b style="color:${INK}">${spk}</b> — ${txt}</span></div>`;

type CoverOpts = {
  kicker: string;
  title: string;
  subtitle?: string;
  rows?: [string, string][];
  stamp?: string;
  stampColor?: string;
};
export const cover = (o: CoverOpts) =>
  pg(
    `
    <div style="border:1px solid ${INK};flex:1;display:flex;flex-direction:column;padding:9% 8%;position:relative;background:${PAPER}">
      <div style="font-family:${F_MONO};font-size:6.6px;letter-spacing:.18em;text-transform:uppercase;color:${MUT}">${o.kicker}</div>
      <div style="font-family:${F_SERIF};font-size:14px;line-height:1.22;margin-top:9px;color:${INK}">${o.title}</div>
      ${o.subtitle ? `<div style="font-size:8.2px;color:${MUT};margin-top:6px">${o.subtitle}</div>` : ""}
      <div style="margin-top:auto">
        ${(o.rows || [])
      .map(
        (r) =>
          `<div style="display:flex;justify-content:space-between;gap:6px;border-top:1px solid ${RULE};padding:3.5px 0;font-size:7.4px"><span style="font-family:${F_MONO};letter-spacing:.08em;text-transform:uppercase;color:${MUT}">${r[0]}</span><span style="font-weight:600;text-align:right">${r[1]}</span></div>`
      )
      .join("")}
      </div>
      ${o.stamp ? `<div style="position:absolute;top:5%;right:5%">${stamp(o.stamp, o.stampColor)}</div>` : ""}
      <div style="position:absolute;bottom:3.5%;left:8%;display:flex;align-items:center;gap:4px;font-family:${F_SERIF};font-size:8.5px;color:${INK}">Attesta<span style="width:3px;height:3px;border-radius:50%;background:${RED};display:inline-block"></span></div>
    </div>`,
    "6.5%"
  );

export const EMPTY = pg("");

/* ---------- sample registry ---------- */
export const FLIPBOOK_SAMPLES: Record<string, string[]> = {
  hero: [
    cover({
      kicker: "Minutes · Ordinary session",
      title:
        "Social and Economic Committee (CSE) — session of 17 September 2026",
      subtitle: "Style IT · Lyon site",
      rows: [
        ["Region", "France"],
        ["Governing body", "CSE"],
        ["Language", "English"],
        ["Date", "17.09.2026"],
      ],
      stamp: "Signed · Locked",
    }),
    pg(
      rh("Minutes · CSE Style IT", "17.09.2026") +
      h("Attendance") +
      p(
        "9 of 11 titular members present — <b>quorum met</b>. Alternates: 2. Chair: A. Vasseur (management). Session secretary: C. Marchal."
      ) +
      sub("Agenda") +
      [
        "Approval of the minutes of 18 June",
        "Economic situation — H1 2026",
        "2027 training plan",
        "Working-hours adjustment — Vénissieux site",
        "Other business",
      ]
        .map(
          (t, i) =>
            `<div style="display:flex;gap:6px;font-size:8.2px;line-height:1.5;margin-bottom:4px;color:#3A4350"><span style="font-family:${F_MONO};color:${RED};flex:none">${i + 1}.</span><span>${t}</span></div>`
        )
        .join("")
    ),
    pg(
      rh("Deliberations & votes", "p. 3") +
      h("Item 3 — 2027 training plan") +
      p(
        "After presentation of the budget (€1.38M, +15% vs 2026) and discussion, the following opinion is recorded:"
      ) +
      `<div style="border:1px solid ${RULE};border-radius:3px;margin:8px 0;padding:7px 8px;background:${WASH}">
        <div style="display:flex;justify-content:space-between;font-size:7.6px;margin-bottom:4px"><span style="font-family:${F_MONO};letter-spacing:.1em;text-transform:uppercase;color:${MUT}">Show-of-hands vote</span>${chip("Favourable opinion", GRN)}</div>
        <div style="display:flex;gap:10px;font-size:8.2px"><span><b>8</b> for</span><span><b>1</b> against</span><span><b>2</b> abst.</span></div>
      </div>` +
      h("Item 4 — Working-hours adjustment") +
      p(
        "The CSE requests the impact study before issuing any opinion. <b>Vote deferred</b> to the October session — entered in the decision log."
      )
    ),
    pg(
      rh("Signatures & audit", "p. 4") +
      `<div style="display:flex;gap:12px;margin:10px 0 12px">${sig("C. Marchal", "Session secretary")}${sig("A. Vasseur", "Chair")}</div>` +
      sub("Audit trail — extract") +
      mono("16:40 TRANSCRIPT · diarization · 4 speakers") +
      mono("17:22 REVIEW · m.leroy · 14 corrections") +
      mono("18:03 LOCK · sha-256: 9f3a…c41d", "#4A5462") +
      `<div style="margin-top:auto;display:flex;justify-content:space-between;align-items:flex-end">${stamp("Attesta · Cert. No. 2214")}<span style="font-family:${F_MONO};font-size:6.4px;color:${MUT}">PDF + DOCX · delivered 18:04</span></div>`
    ),
  ],

  transcript: [
    pg(
      rh("Verbatim · diarization", "48:12 audio") +
      h("Full transcript — 4 speakers") +
      `<div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:9px">${chip("S1 · A. Vasseur", RED)}${chip("S2 · M. Duval (CFDT)", BLU)}${chip("S3 · C. Marchal", GRN)}${chip("S4 · L. Petit", AMB)}</div>` +
      tline(
        "00:02:11",
        "A. Vasseur",
        RED,
        "I call the session to order. Quorum is met — nine titular members present."
      ) +
      tline(
        "00:02:39",
        "C. Marchal",
        GRN,
        "The minutes of 18 June are submitted for approval…"
      ) +
      tline(
        "00:04:02",
        "M. Duval",
        BLU,
        "One remark on item 3 before we begin, about the training budget."
      )
    ),
    pg(
      rh("Review — corrections", "p. 2") +
      h("What a machine alone would have missed") +
      tline(
        "00:23:41",
        "M. Duval",
        BLU,
        `…regarding <s style="color:${RED};text-decoration-color:${RED}">the thirteen-hour bonus</s> <b style="color:${GRN}">the thirteenth-month bonus</b>, the request stands.`
      ) +
      `<div style="border-left:2px solid ${RED};padding:4px 0 4px 8px;margin:4px 0 10px"><div style="font-family:${F_MONO};font-size:6.6px;color:${RED};letter-spacing:.08em">REVIEWER · M.LEROY</div>${p("Corrected against the audio — 00:23:41. Standard payroll term, not a speaker error.")}</div>` +
      tline(
        "00:31:07",
        'Speaker 2 → <b style="color:' + GRN + '">M. Duval</b>',
        BLU,
        "attribution corrected after checking two similar voices (S2/S4)."
      )
    ),
    pg(
      rh("Quality control", "p. 3") +
      h("Review pass — mandatory before drafting") +
      chk("ok", "All 4 speakers named and confirmed by the secretary") +
      chk("ok", "14 corrections applied (terms, figures, attributions)") +
      chk("ok", "Figures cross-checked against the attached documents") +
      chk("warn", "One inaudible segment flagged (00:41:02 — 6 s)") +
      rule +
      p(
        "Inaudible segments are listed in an annex, never silently guessed. That is what makes the document defensible."
      )
    ),
    pg(
      rh("Status", "p. 4") +
      `<div style="margin:14% 0 10px">${stamp("Cleared for drafting", GRN)}</div>` +
      p("The reviewed transcript now goes into the report drafting template.") +
      sub("Template") +
      mono("minutes_v12 · agenda-based structure · vote detection", "#4A5462")
    ),
  ],

  "sample-report": [
    cover({
      kicker: "Minutes · Sample report",
      title: "CSE — extraordinary session of 2 October 2026",
      subtitle: "Vireo Industrie SAS · Nantes",
      rows: [
        ["Region", "France"],
        ["Governing body", "CSE"],
        ["Outputs", "PDF + DOCX"],
        ["Delivered in", "1–2 hours"],
      ],
      stamp: "Sample",
      stampColor: BLU,
    }),
    pg(
      rh("Structure — agenda", "p. 2") +
      h("Item 2 — Logistics reorganisation project") +
      p(
        "Management presents the plan to merge the two warehouses. Elected members raise three reservations: the timeline, team transfers, and load on the remaining site.",
        "margin-bottom:8px"
      ) +
      sub("Speaking time on this item") +
      bar("R. Lambert (CGT)", 38, RED, "11 min") +
      bar("Management", 31, BLU, "9 min") +
      bar("S. Nguyen (CFDT)", 21, GRN, "6 min") +
      bar("Other members", 10, AMB, "3 min")
    ),
    pg(
      rh("Votes & decisions", "p. 3") +
      h("Decisions detected automatically") +
      `<div style="border:1px solid ${RULE};border-radius:3px;padding:7px 8px;margin-bottom:7px"><div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="font-size:8px;font-weight:600">Appointment of a chartered accountant (Art. L2315-88)</span>${chip("Adopted", GRN)}</div><div style="font-family:${F_MONO};font-size:6.8px;color:${MUT}">10 for · 0 against · 1 abst. · show of hands · 15:12</div></div>` +
      `<div style="border:1px solid ${RULE};border-radius:3px;padding:7px 8px"><div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="font-size:8px;font-weight:600">Opinion on the reorganisation project</span>${chip("Deferred", AMB)}</div><div style="font-family:${F_MONO};font-size:6.8px;color:${MUT}">pending the expert report · 15:41</div></div>` +
      rule +
      p(
        "Every vote is time-stamped and linked to the exact passage of the transcript."
      )
    ),
    pg(
      rh("Compliance audit", "p. 4") +
      h("Checked against the France · CSE rule set") +
      bar("Compliance score", 91, GRN, "91 / 100") +
      chk("ok", "Convocation within the statutory notice period") +
      chk("ok", "Quorum recorded on the record") +
      chk("ok", "Consultation deadline observed") +
      chk("warn", "Attach the impact study cited in session") +
      p(
        "The full, finding-by-finding audit ships as the compliance dashboard. Rule references here are illustrative sample content.",
        "margin-top:6px"
      )
    ),
    pg(
      rh("Signature", "p. 5") +
      h("Digital sign-off block") +
      p(
        "The minutes are locked after review; any later change requires a logged unlock.",
        "margin-bottom:10px"
      ) +
      `<div style="display:flex;gap:12px;margin-bottom:12px">${sig("S. Nguyen", "CSE secretary")}${sig("P. Roussel", "Chair")}</div>` +
      sub("Document fingerprint") +
      mono("sha-256: 4be1…88f0 · locked 02.10 at 17:26", "#4A5462") +
      `<div style="margin-top:auto">${stamp("Signed · Locked")}</div>`
    ),
    pg(
      rh("Delivery", "p. 6") +
      h("What the client receives") +
      chk("ok", "Complete minutes — PDF and editable DOCX") +
      chk("ok", "The compliance dashboard") +
      chk("ok", "Votes & decisions log") +
      chk("ok", "On-screen e-book reading, with the multilingual assistant") +
      `<div style="margin-top:auto">${stamp("Delivered in 1–2 hours", GRN)}</div>`
    ),
  ],
};

/* ---------- live preview builder (used by the live-preview demo) ---------- */
export type LiveForm = {
  company: string;
  region: string;
  body: string;
  date: string;
  title: string;
  lang: string;
};

function fmtDate(f: LiveForm) {
  const loc =
    ({ Français: "fr-FR", English: "en-GB", Deutsch: "de-DE" } as Record<
      string,
      string
    >)[f.lang] || "en-GB";
  try {
    return new Date(f.date + "T12:00:00").toLocaleDateString(loc, {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return f.date;
  }
}

export function buildLiveSample(f: LiveForm): string[] {
  const title = f.title || "Untitled meeting";
  const isGeneral = f.region === "General";
  return [
    cover({
      kicker: "Instant preview · " + f.body,
      title,
      subtitle: f.company || "Your company",
      rows: [
        ["Region", f.region],
        ["Governing body", f.body],
        ["Language", f.lang],
        ["Date", fmtDate(f)],
      ],
      stamp: "Preview · Read-only",
      stampColor: BLU,
    }),
    pg(
      rh("How to read this preview", "p. 2") +
      h("Three fixed analyses, straight from your file") +
      p(
        "No full transcription has run yet. A lightweight engine produced exactly three views so you can judge relevance before requesting anything.",
        "margin-bottom:8px"
      ) +
      chk("ok", "Speaker analysis — who spoke, how much") +
      chk("ok", "Figures mentioned, drawn as charts") +
      chk("ok", "A basic compliance safety check") +
      rule +
      p(
        "<b>Read-only.</b> Editing, sign-off and download exist only in the delivered report."
      )
    ),
    pg(
      rh("1 / Speaker analysis", "48:12") +
      h("Who spoke, and how much") +
      bar("Voice A — chairs the meeting", 36, RED, "17 min") +
      bar("Voice B", 27, BLU, "13 min") +
      bar("Voice C", 22, GRN, "11 min") +
      bar("Voice D", 15, AMB, "7 min") +
      p(
        "4 distinct voices detected. Names are confirmed during human review — never guessed.",
        "margin-top:6px"
      )
    ),
    pg(
      rh("2 / Figures mentioned", "6 series") +
      h("Numbers, drawn instead of buried") +
      sub("Training budget (discussed)") +
      bar("2026", 87, BLU, "1.20 M€") +
      bar("2027 — proposed", 100, GRN, "1.38 M€") +
      sub("Absenteeism rate") +
      bar("H1 2026", 68, AMB, "4.1 %") +
      bar("Target", 60, GRN, "3.6 %")
    ),
    isGeneral
      ? pg(
          rh("3 / Compliance safety check", f.region) +
          h("Not applicable for General reports") +
          p(
            "General reports aren't checked against any regulatory or works-council framework, so there's no compliance audit — no rule-set findings, no legal references.",
            "margin-bottom:8px"
          ) +
          rule +
          p(
            "Pick a specific region (e.g. France) to see the compliance audit in the preview."
          )
        )
      : pg(
          rh("3 / Compliance safety check", f.region + " · " + f.body) +
          h("Early flags — not the full audit") +
          chk("ok", "Quorum stated on the record") +
          chk("ok", "Agenda announced and followed") +
          chk("warn", "A vote is mentioned without a headcount") +
          chk("no", "No reference to the consultation deadline") +
          rule +
          p(
            "2 flags to watch. The full, finding-by-finding audit ships with your delivered report."
          )
        ),
    pg(
      rh("Next step", "p. 6") +
      '<div style="margin:10% 0 10px">' +
      stamp("Read-only · Not for the record", RED) +
      "</div>" +
      h("This preview cannot be edited or downloaded") +
      p(
        "That is deliberate: nothing unreviewed should ever look like a deliverable. Send the request — a specialist takes it from there.",
        "margin-bottom:8px"
      ) +
      p("<b>Delivered in 1–2 hours,</b> human-checked and locked.")
    ),
  ];
}
