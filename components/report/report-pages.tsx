import { cn } from "@/lib/utils";
import type {
  NumericalData,
  ReportContent,
  SpeakerAnalytics,
} from "@/lib/report-generation";
import {
  NumericalFiguresChart,
  OnTopicScoreChart,
  SpeakerTalkTimeChart,
  type ChartableFigure,
} from "@/components/report/report-charts";

export type ReportPageDef = {
  label: string;
  body: React.ReactNode;
};

type ReportMeta = {
  tier: string;
  status: string;
  generatedBy: string | null;
};

function EmptyNote({ text }: { text: string }) {
  return <p className="text-[13px] italic text-slate-400">{text}</p>;
}

// Parses a numericalData `value` string into a chartable number + unit, or
// returns null if it isn't safely chartable (a date, an ambiguous range like
// "32 or 33 employees", free text). Non-chartable figures fall back to a
// plain stat card instead of being forced into a misleading bar.
function parseNumericValue(raw: string): { num: number; unit: string } | null {
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  if (/\bor\b/i.test(trimmed)) return null;

  const scoreMatch = trimmed.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+)$/);
  if (scoreMatch) {
    return { num: parseFloat(scoreMatch[1]), unit: `/${scoreMatch[2]}` };
  }

  const cleaned = trimmed.replace(/[,\s](?=\d)/g, "");
  const match = cleaned.match(
    /^([€$£]?)(\d+(?:\.\d+)?)\s*(%|€|\$|£|jours?|days?|min(?:utes?)?)?$/i
  );
  if (!match) return null;
  const num = parseFloat(match[2]);
  if (Number.isNaN(num)) return null;
  return { num, unit: match[1] || match[3] || "" };
}

function SpeakerBubble({
  entry,
}: {
  entry: ReportContent["discussionLog"][number];
}) {
  return (
    <div className="rounded-md border border-slate-900/8 bg-paper-200 px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.06em] text-rust-600">
          {entry.speakerName}
        </span>
        {entry.timestamp && (
          <span className="shrink-0 font-mono text-[10px] text-slate-400">
            {entry.timestamp}
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[13px] leading-relaxed text-slate-700">
        {entry.text}
      </p>
    </div>
  );
}

function VoteCard({ vote }: { vote: ReportContent["votes"][number] }) {
  const total = vote.forCount + vote.againstCount + vote.abstainCount || 1;
  const pct = (n: number) => (n / total) * 100;
  return (
    <div>
      <p className="text-[13px] leading-relaxed text-slate-700">
        {vote.description}
      </p>
      {vote.agendaItemRef != null && (
        <p className="mt-0.5 font-mono text-[10px] text-slate-400">
          Item {vote.agendaItemRef}
        </p>
      )}
      <div className="mt-2 flex h-2 overflow-hidden rounded-full bg-slate-900/8">
        <div style={{ width: `${pct(vote.forCount)}%` }} className="bg-green-600" />
        <div style={{ width: `${pct(vote.againstCount)}%` }} className="bg-rust-600" />
        <div style={{ width: `${pct(vote.abstainCount)}%` }} className="bg-gold-600" />
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] text-slate-500">
        <span>
          <span className="text-green-600">●</span> For {vote.forCount}
        </span>
        <span>
          <span className="text-rust-600">●</span> Against {vote.againstCount}
        </span>
        <span>
          <span className="text-gold-600">●</span> Abstain {vote.abstainCount}
        </span>
      </div>
    </div>
  );
}

function buildCoverPage(content: ReportContent, meta: ReportMeta): ReportPageDef {
  const rows: [string, string][] = [
    ["Region", content.coverInfo.region],
    ["Governing body", content.coverInfo.governingBody],
    ["Meeting date", content.coverInfo.date],
    ["Report tier", meta.tier],
  ];
  return {
    label: "Minutes · Statutory report",
    body: (
      <div className="flex h-full flex-col">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-serif text-2xl leading-snug text-slate-900">
            {content.coverInfo.meetingTitle}
          </h1>
          <span className="shrink-0 rounded-full bg-rust-600 px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-wide text-paper-100">
            {meta.tier}
          </span>
        </div>
        <p className="mt-2 font-mono text-[10.5px] text-slate-500">
          {content.coverInfo.company}
        </p>
        <div className="mt-auto space-y-2 border-t border-slate-900/10 pt-4">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between text-[11px]">
              <span className="font-mono uppercase tracking-[0.08em] text-slate-400">
                {k}
              </span>
              <span className="font-semibold text-slate-900">{v}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 font-mono text-[9px] italic text-slate-400">
          Drafted by Attesta AI{meta.generatedBy ? ` · ${meta.generatedBy}` : ""}
        </p>
      </div>
    ),
  };
}

function buildAttendancePage(content: ReportContent): ReportPageDef {
  const presentCount = content.attendance.filter((a) => a.present).length;
  return {
    label: "Document details",
    body: (
      <div>
        <h3 className="font-serif text-lg text-slate-900">Attendance</h3>
        <p className="mt-1 font-mono text-[10px] text-slate-500">
          {presentCount} present / {content.attendance.length} total
        </p>
        {content.attendance.length === 0 ? (
          <div className="mt-4">
            <EmptyNote text="No attendance recorded." />
          </div>
        ) : (
          <div className="mt-4">
            <div className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-slate-900/10 pb-1.5 font-mono text-[9.5px] uppercase tracking-[0.06em] text-slate-400">
              <span>Name</span>
              <span>Role</span>
              <span className="text-right">Present</span>
            </div>
            {content.attendance.map((a, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[1fr_auto_auto] gap-3 border-b border-slate-900/5 py-1.5 text-[12px]"
              >
                <span className="text-slate-800">{a.name}</span>
                <span className="text-slate-500">{a.role}</span>
                <span
                  className={cn(
                    "text-right font-mono",
                    a.present ? "text-green-600" : "text-slate-300"
                  )}
                >
                  {a.present ? "✓" : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
  };
}

function buildSummaryPage(content: ReportContent): ReportPageDef {
  return {
    label: "Executive summary",
    body: (
      <div>
        <h3 className="font-serif text-lg text-slate-900">Executive summary</h3>
        {content.executiveSummary ? (
          <p className="mt-4 text-[13.5px] leading-[1.75] text-slate-700">
            {content.executiveSummary}
          </p>
        ) : (
          <div className="mt-4">
            <EmptyNote text="No executive summary generated." />
          </div>
        )}
      </div>
    ),
  };
}

const MAX_BUBBLES_PER_PAGE = 3;

function buildDiscussionPages(content: ReportContent): ReportPageDef[] {
  const titleByOrder = new Map(content.agendaItems.map((a) => [a.order, a.title]));

  type Group = {
    ref: number | null;
    title: string;
    entries: ReportContent["discussionLog"];
  };
  const groups: Group[] = [];
  const indexByRef = new Map<number | null, number>();
  for (const entry of content.discussionLog) {
    const ref = entry.agendaItemRef;
    if (!indexByRef.has(ref)) {
      indexByRef.set(ref, groups.length);
      groups.push({
        ref,
        title: ref != null ? titleByOrder.get(ref) ?? `Agenda item ${ref}` : "Chronological discussion",
        entries: [],
      });
    }
    groups[indexByRef.get(ref)!].entries.push(entry);
  }

  const pages: ReportPageDef[] = [];
  for (const group of groups) {
    const label =
      group.ref != null ? `Discussion — item ${group.ref}` : "Discussion — chronological";
    for (let i = 0; i < group.entries.length; i += MAX_BUBBLES_PER_PAGE) {
      const chunk = group.entries.slice(i, i + MAX_BUBBLES_PER_PAGE);
      const isFirstChunk = i === 0;
      pages.push({
        label,
        body: (
          <div>
            {isFirstChunk && (
              <h3 className="font-serif text-lg text-slate-900">{group.title}</h3>
            )}
            <div className={isFirstChunk ? "mt-4 space-y-3" : "space-y-3"}>
              {chunk.map((entry, idx) => (
                <SpeakerBubble key={idx} entry={entry} />
              ))}
            </div>
          </div>
        ),
      });
    }
  }

  if (pages.length === 0) {
    pages.push({
      label: "Discussion",
      body: <EmptyNote text="No discussion log recorded." />,
    });
  }
  return pages;
}

function buildDecisionsPages(content: ReportContent): ReportPageDef[] {
  if (content.decisions.length === 0) {
    return [{ label: "Decisions", body: <EmptyNote text="No decisions recorded." /> }];
  }
  const pages: ReportPageDef[] = [];
  const MAX = 6;
  for (let i = 0; i < content.decisions.length; i += MAX) {
    const chunk = content.decisions.slice(i, i + MAX);
    const isFirst = i === 0;
    pages.push({
      label: "Decisions",
      body: (
        <div>
          {isFirst && <h3 className="font-serif text-lg text-slate-900">Decisions</h3>}
          <ol className={isFirst ? "mt-4 space-y-3" : "space-y-3"}>
            {chunk.map((d, idx) => (
              <li key={idx} className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rust-600" />
                <div>
                  <p className="text-[13px] leading-relaxed text-slate-700">
                    {d.description}
                  </p>
                  {d.agendaItemRef != null && (
                    <p className="mt-0.5 font-mono text-[10px] text-slate-400">
                      Item {d.agendaItemRef}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      ),
    });
  }
  return pages;
}

function buildVotesPages(content: ReportContent): ReportPageDef[] {
  if (content.votes.length === 0) {
    return [{ label: "Votes", body: <EmptyNote text="No formal votes recorded." /> }];
  }
  const pages: ReportPageDef[] = [];
  const MAX = 3;
  for (let i = 0; i < content.votes.length; i += MAX) {
    const chunk = content.votes.slice(i, i + MAX);
    const isFirst = i === 0;
    pages.push({
      label: "Votes",
      body: (
        <div>
          {isFirst && <h3 className="font-serif text-lg text-slate-900">Votes</h3>}
          <div className={isFirst ? "mt-4 space-y-5" : "space-y-5"}>
            {chunk.map((v, idx) => (
              <VoteCard key={idx} vote={v} />
            ))}
          </div>
        </div>
      ),
    });
  }
  return pages;
}

function buildAnalyticsPage(data: SpeakerAnalytics): ReportPageDef {
  if (data.length === 0) {
    return {
      label: "Speaker analytics",
      body: <EmptyNote text="No speaker analytics available." />,
    };
  }
  return {
    label: "Speaker analytics",
    body: (
      <div>
        <h3 className="font-serif text-lg text-slate-900">Speaker analytics</h3>
        <p className="mt-4 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
          Talk time
        </p>
        <div className="mt-2">
          <SpeakerTalkTimeChart data={data} />
        </div>
        <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
          On-topic score
        </p>
        <div className="mt-2">
          <OnTopicScoreChart data={data} />
        </div>
        <p className="mt-5 font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
          Contributions
        </p>
        <div className="mt-2 space-y-1.5">
          {data.map((s, idx) => (
            <div key={idx} className="flex items-center justify-between text-[11.5px]">
              <span className="text-slate-700">{s.speakerName}</span>
              <span className="font-mono text-[10.5px] text-slate-500">
                {s.contributionCount} contributions
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
  };
}

function buildNumericalPages(data: NumericalData): ReportPageDef[] {
  if (data.length === 0) {
    return [
      { label: "Key figures", body: <EmptyNote text="No numerical data extracted." /> },
    ];
  }

  // Group by unit before charting — euro amounts, percentages, day-counts
  // and /100 scores on one shared linear axis would make the smaller-unit
  // bars invisible next to six-figure amounts (see report-charts.tsx).
  const byUnit = new Map<string, ChartableFigure[]>();
  const cards: NumericalData = [];
  for (const d of data) {
    const parsed = parseNumericValue(d.value);
    if (parsed) {
      const key = parsed.unit || "—";
      if (!byUnit.has(key)) byUnit.set(key, []);
      byUnit.get(key)!.push({ label: d.label, num: parsed.num, context: d.context });
    } else {
      cards.push(d);
    }
  }

  let titled = false;
  function withTitle(node: React.ReactNode): React.ReactNode {
    if (titled) return node;
    titled = true;
    return (
      <>
        <h3 className="font-serif text-lg text-slate-900">Key figures</h3>
        <div className="mt-4">{node}</div>
      </>
    );
  }

  const pages: ReportPageDef[] = [];
  for (const [unit, figures] of Array.from(byUnit)) {
    const unitLabel = unit === "—" ? "count" : unit;
    pages.push({
      label: "Key figures",
      body: withTitle(
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
            {unitLabel}
          </p>
          <div className="mt-2">
            <NumericalFiguresChart data={figures} unit={unit === "—" ? "" : unit} />
          </div>
        </div>
      ),
    });
  }
  if (cards.length > 0) {
    const MAX = 4;
    for (let i = 0; i < cards.length; i += MAX) {
      const chunk = cards.slice(i, i + MAX);
      pages.push({
        label: "Key figures",
        body: withTitle(
          <div className="space-y-3">
            {chunk.map((d, idx) => (
              <div
                key={idx}
                className="rounded-md border border-slate-900/8 bg-paper-200 px-4 py-3"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.06em] text-slate-500">
                    {d.label}
                  </span>
                  <span className="shrink-0 font-mono text-[13px] font-semibold text-rust-600">
                    {d.value}
                  </span>
                </div>
                <p className="mt-1 text-[11.5px] leading-relaxed text-slate-600">
                  {d.context}
                </p>
              </div>
            ))}
          </div>
        ),
      });
    }
  }
  return pages;
}

function buildClosingPage(content: ReportContent, meta: ReportMeta): ReportPageDef {
  return {
    label: "Closing",
    body: (
      <div className="flex h-full flex-col">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
            Procedural notes
          </p>
          {content.proceduralNotes.length > 0 ? (
            <ul className="mt-3 space-y-1.5">
              {content.proceduralNotes.map((note, idx) => (
                <li key={idx} className="flex gap-2 text-[12.5px] leading-relaxed text-slate-600">
                  <span className="text-slate-400">—</span>
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-[12.5px] italic text-slate-400">None recorded.</p>
          )}
        </div>
        <div className="mt-6">
          <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-slate-500">
            Closing notes
          </p>
          <p className="mt-3 text-[13px] leading-relaxed text-slate-700">
            {content.closingNotes || "—"}
          </p>
        </div>
        <div className="mt-auto border-t border-slate-900/10 pt-6">
          <p className="font-mono text-[9.5px] uppercase tracking-[0.08em] text-slate-400">
            Status: {meta.status}
            {meta.generatedBy ? ` · Drafted by ${meta.generatedBy}` : ""}
          </p>
        </div>
      </div>
    ),
  };
}

export function buildReportPages(
  content: ReportContent,
  speakerAnalytics: SpeakerAnalytics,
  numericalData: NumericalData,
  meta: ReportMeta
): ReportPageDef[] {
  return [
    buildCoverPage(content, meta),
    buildAttendancePage(content),
    buildSummaryPage(content),
    ...buildDiscussionPages(content),
    ...buildDecisionsPages(content),
    ...buildVotesPages(content),
    buildAnalyticsPage(speakerAnalytics),
    ...buildNumericalPages(numericalData),
    buildClosingPage(content, meta),
  ];
}
