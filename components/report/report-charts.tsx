"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { SpeakerAnalytics } from "@/lib/report-generation";

const RUST = "#a63a2e";
const RUST_LIGHT = "#d9705f";
const SLATE = "#3a4350";

function scoreColor(score: number): string {
  if (score >= 80) return "#2e6e4e";
  if (score >= 50) return "#a97a1f";
  return "#a63a2e";
}

// Recharts' YAxis renders category ticks right-anchored within `width`; long
// labels can render partially outside the SVG's own bounds and get clipped
// by the parent's overflow rather than wrapping. Truncate defensively —
// the full label is still available via the tooltip.
function truncateTick(value: string, max = 22): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

const compactNumber = new Intl.NumberFormat("en", { notation: "compact" });

export function SpeakerTalkTimeChart({ data }: { data: SpeakerAnalytics }) {
  const chartData = data.map((s) => ({
    name: s.speakerName,
    minutes: Math.round((s.talkTimeSeconds / 60) * 10) / 10,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(160, data.length * 46)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
        <CartesianGrid horizontal={false} stroke="rgba(26,34,46,0.08)" />
        <XAxis
          type="number"
          tick={{ fill: SLATE, fontSize: 10, fontFamily: "var(--font-mono)" }}
          axisLine={{ stroke: "rgba(26,34,46,0.15)" }}
          tickLine={false}
          unit=" min"
        />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tickFormatter={(v: string) => truncateTick(v, 18)}
          tick={{ fill: SLATE, fontSize: 11, fontFamily: "var(--font-sans)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(166,58,46,0.06)" }}
          contentStyle={{
            fontSize: 12,
            fontFamily: "var(--font-sans)",
            border: "1px solid rgba(26,34,46,0.12)",
            borderRadius: 4,
          }}
          formatter={(value) => [`${value} min`, "Talk time"]}
        />
        <Bar dataKey="minutes" fill={RUST} radius={[0, 3, 3, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function OnTopicScoreChart({ data }: { data: SpeakerAnalytics }) {
  const chartData = data.map((s) => ({ name: s.speakerName, score: s.onTopicScore }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(140, data.length * 34)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 4 }}>
        <CartesianGrid horizontal={false} stroke="rgba(26,34,46,0.08)" />
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fill: SLATE, fontSize: 10, fontFamily: "var(--font-mono)" }}
          axisLine={{ stroke: "rgba(26,34,46,0.15)" }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={120}
          tickFormatter={(v: string) => truncateTick(v, 18)}
          tick={{ fill: SLATE, fontSize: 11, fontFamily: "var(--font-sans)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(166,58,46,0.06)" }}
          contentStyle={{
            fontSize: 12,
            fontFamily: "var(--font-sans)",
            border: "1px solid rgba(26,34,46,0.12)",
            borderRadius: 4,
          }}
          formatter={(value) => [`${value} / 100`, "On-topic score"]}
        />
        <Bar dataKey="score" radius={[0, 3, 3, 0]} maxBarSize={14}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={scoreColor(entry.score)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export type ChartableFigure = { label: string; num: number; context: string };

// One chart == one unit. Mixing e.g. euro amounts with percentages or
// day-counts on a shared linear axis makes the smaller-unit bars invisible
// next to six-figure amounts — group figures by unit before charting
// (see buildNumericalPages) rather than passing everything to one chart.
export function NumericalFiguresChart({
  data,
  unit,
}: {
  data: ChartableFigure[];
  unit: string;
}) {
  const chartData = data.map((d) => ({ name: d.label, value: d.num }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(120, data.length * 44)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 4 }}>
        <CartesianGrid horizontal={false} stroke="rgba(26,34,46,0.08)" />
        <XAxis
          type="number"
          tickFormatter={(v: number) => compactNumber.format(v)}
          tick={{ fill: SLATE, fontSize: 10, fontFamily: "var(--font-mono)" }}
          axisLine={{ stroke: "rgba(26,34,46,0.15)" }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={150}
          tickFormatter={(v: string) => truncateTick(v, 22)}
          tick={{ fill: SLATE, fontSize: 10.5, fontFamily: "var(--font-sans)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "rgba(166,58,46,0.06)" }}
          contentStyle={{
            fontSize: 12,
            fontFamily: "var(--font-sans)",
            border: "1px solid rgba(26,34,46,0.12)",
            borderRadius: 4,
          }}
          formatter={(value) => [`${value}${unit ? ` ${unit}` : ""}`, "Value"]}
        />
        <Bar dataKey="value" fill={RUST_LIGHT} radius={[0, 3, 3, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  );
}
