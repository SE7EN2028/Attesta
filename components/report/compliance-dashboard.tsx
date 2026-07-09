"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { ComplianceCategory, ComplianceRiskLevel } from "@/lib/compliance";

export type ComplianceFindingRow = {
  id: string;
  category: ComplianceCategory;
  riskLevel: ComplianceRiskLevel;
  description: string;
  ruleReference: string | null;
  impactDescription: string | null;
  confidence: number;
};

const riskStyles: Record<ComplianceRiskLevel, string> = {
  CRITICAL: "bg-rust-400/10 text-rust-400",
  HIGH: "bg-gold-600/10 text-gold-600",
  MEDIUM: "bg-gold-400/10 text-gold-600",
  ADVISORY: "bg-blue-400/10 text-blue-400",
  COMPLIANT: "bg-green-400/10 text-green-400",
};

const CATEGORY_FILTERS: { label: string; category: ComplianceCategory | "ALL" }[] = [
  { label: "All", category: "ALL" },
  { label: "Risks", category: "RISK" },
  { label: "Missing docs", category: "MISSING_DOCUMENT" },
  { label: "Recommendations", category: "RECOMMENDATION" },
  { label: "References", category: "COMPLIANCE_REFERENCE" },
  { label: "Compliant", category: "COMPLIANT" },
];

function scoreColor(score: number): string {
  if (score >= 80) return "#8fb39a";
  if (score >= 50) return "#c9a25e";
  return "#d9705f";
}

function ScoreRing({ score }: { score: number }) {
  const size = 128;
  const stroke = 10;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);
  const color = scoreColor(score);

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(233,229,218,0.1)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
      />
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="middle"
        className="rotate-90"
        style={{ transformOrigin: "center", transform: "rotate(90deg)" }}
        fill="#f2efe6"
        fontSize="28"
        fontFamily="var(--font-serif)"
      >
        {score}
      </text>
    </svg>
  );
}

export function ComplianceDashboard({
  findings,
  score,
  meetingTitle,
  company,
  meetingDate,
  region,
  governingBody,
}: {
  findings: ComplianceFindingRow[];
  score: number;
  meetingTitle: string;
  company: string;
  meetingDate: string;
  region: string;
  governingBody: string;
}) {
  const [activeFilter, setActiveFilter] = useState<ComplianceCategory | "ALL">("ALL");

  const counts = useMemo(() => {
    const byCategory: Record<string, number> = {};
    for (const f of findings) {
      byCategory[f.category] = (byCategory[f.category] ?? 0) + 1;
    }
    const criticalRisks = findings.filter(
      (f) => f.category === "RISK" && f.riskLevel === "CRITICAL"
    ).length;
    return { byCategory, criticalRisks };
  }, [findings]);

  const stats = [
    { value: counts.criticalRisks, label: "Critical risks" },
    { value: counts.byCategory.RECOMMENDATION ?? 0, label: "Recommendations" },
    { value: counts.byCategory.COMPLIANT ?? 0, label: "Compliant areas" },
    { value: counts.byCategory.MISSING_DOCUMENT ?? 0, label: "Missing documents" },
  ];

  const filtered =
    activeFilter === "ALL" ? findings : findings.filter((f) => f.category === activeFilter);

  return (
    <div className="mt-10 grid gap-6 lg:grid-cols-[260px_1fr]">
      <div className="rounded-md border border-cream-200/10 bg-ink-850 p-6">
        <div className="flex justify-center">
          <ScoreRing score={score} />
        </div>
        <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.1em] text-cream-400">
          Overall compliance
        </p>
        <p className="mt-4 text-[12px] text-cream-300">
          {governingBody} meeting · {meetingDate}
        </p>
        <p className="text-[12px] text-cream-500">
          {company} · vs. {region} · {governingBody} rule set
        </p>

        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-cream-200/10 pt-5">
          {stats.map((s) => (
            <div key={s.label}>
              <p className="font-serif text-2xl text-cream-100">{s.value}</p>
              <p className="font-mono text-[9.5px] uppercase tracking-[0.06em] text-cream-500">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-md border border-cream-200/10 bg-ink-850 p-6">
        <div className="flex flex-wrap gap-2">
          {CATEGORY_FILTERS.map((f) => {
            const count =
              f.category === "ALL" ? findings.length : counts.byCategory[f.category] ?? 0;
            const active = activeFilter === f.category;
            return (
              <button
                key={f.label}
                type="button"
                onClick={() => setActiveFilter(f.category)}
                className={cn(
                  "rounded-full border px-3 py-1 font-mono text-[10.5px] transition-colors",
                  active
                    ? "border-rust-400/40 bg-rust-400/10 text-rust-400"
                    : "border-cream-200/10 text-cream-400 hover:border-cream-200/25 hover:text-cream-200"
                )}
              >
                {f.label} · {count}
              </button>
            );
          })}
        </div>

        <div className="mt-5 overflow-x-auto">
          {filtered.length === 0 ? (
            <p className="py-8 text-center text-[13px] italic text-cream-500">
              No findings in this category.
            </p>
          ) : (
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
                {filtered.map((f) => (
                  <tr key={f.id} className="border-b border-cream-200/5 align-top">
                    <td className="py-3 pr-4 text-[13px] text-cream-200">{f.description}</td>
                    <td className="py-3 pr-4">
                      <span
                        className={cn(
                          "rounded px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.05em]",
                          riskStyles[f.riskLevel]
                        )}
                      >
                        {f.riskLevel}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-[12.5px] text-cream-400">
                      {f.impactDescription ?? "—"}
                      {f.ruleReference && (
                        <span className="ml-1 text-cream-500">({f.ruleReference})</span>
                      )}
                    </td>
                    <td className="py-3 font-mono text-[12.5px] text-cream-300">
                      {f.confidence}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <p className="mt-5 font-mono text-[10px] uppercase tracking-[0.06em] text-cream-500">
          {meetingTitle} — generated findings; rule citations are AI-drafted,
          not legal advice.
        </p>
      </div>
    </div>
  );
}
