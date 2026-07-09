"use client";

import { useState } from "react";
import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";
import { cn } from "@/lib/utils";
import { FlipBook } from "@/components/flip-book";

const tabs = ["Transcript review", "Tuned draft", "Editor pass", "Lock & dispatch"];

const panelGrid = "grid items-center gap-10 lg:grid-cols-2";
const bodyText = "text-[15.5px] leading-[1.7] text-cream-300";

export function ReviewProcess() {
  const [craft, setCraft] = useState(0);

  return (
    <section className="border-t border-cream-200/10 py-24 md:py-32">
      <Container>
        <Eyebrow>After you request</Eyebrow>
        <h2 className="mt-5 max-w-2xl font-serif text-3xl leading-[1.15] text-cream-100 md:text-[44px]">
          What happens behind the curtain — and why it&apos;s worth paying
          for.
        </h2>
        <p className="mt-6 max-w-2xl text-[17px] leading-[1.65] text-cream-300">
          AI drafts everything. Nothing ships on AI&apos;s word alone. Your
          request lands with a consultancy team, and this is their pass:
        </p>

        <div className="mb-8 mt-10 flex flex-wrap gap-2.5">
          {tabs.map((label, i) => {
            const on = craft === i;
            return (
              <button
                key={label}
                type="button"
                aria-pressed={on}
                onClick={() => setCraft(i)}
                className={cn(
                  "flex cursor-pointer items-center gap-2 rounded-full border px-[18px] py-2.5 text-[14px] font-semibold transition-colors",
                  on
                    ? "border-ink-800 bg-ink-800 text-cream-100"
                    : "border-cream-200/25 text-cream-300 hover:border-cream-200/60"
                )}
              >
                <span className="font-mono text-[11px]">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {label}
              </button>
            );
          })}
        </div>

        {craft === 0 && (
          <div className={panelGrid}>
            <div>
              <h3 className="font-serif text-2xl text-cream-100">
                The true transcript, read by a person
              </h3>
              <p className={cn("mt-3", bodyText)}>
                A specialist opens the full, speaker-identified transcript —
                real diarization, every voice separated — in the same
                page-flip viewer you&apos;ve been using. They correct names,
                terms and attributions against the audio itself.
              </p>
              <p className={cn("mt-3.5", bodyText)}>
                Nothing is guessed silently. Inaudible passages are flagged in
                an annex — that honesty is what makes the record defensible.
              </p>
            </div>
            <div className="min-w-0 max-w-[520px]">
              <FlipBook sample="transcript" />
            </div>
          </div>
        )}

        {craft === 1 && (
          <div className={panelGrid}>
            <div>
              <h3 className="font-serif text-2xl text-cream-100">
                A draft tuned to your meeting
              </h3>
              <p className={cn("mt-3", bodyText)}>
                The corrected transcript runs through a drafting template
                built for your governing body — agenda-based structure,
                automatic vote detection, and the rule set for your region.
              </p>
              <p className={cn("mt-3.5", bodyText)}>
                The same source also produces the compliance dashboard, and
                can produce a board-ready slide summary — the team generates
                the outputs your request calls for.
              </p>
            </div>
            <div className="rounded-lg border border-cream-200/10 bg-paper-100 p-6 text-slate-900 shadow-[0_20px_44px_-28px_rgba(19,26,36,0.35)]">
              <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-900/10 pb-3">
                <span className="font-mono text-[11px] tracking-[0.12em] text-slate-500">
                  TEMPLATE · minutes_v12
                </span>
                <span className="rounded-full border border-rust-600 px-[9px] py-0.5 font-mono text-[10px] tracking-[0.12em] text-rust-600">
                  CSE
                </span>
              </div>
              <div className="font-mono text-[12.5px] leading-[2.3] text-slate-700">
                <div>
                  <span className="text-green-600">✓</span> Attendance &amp;
                  quorum
                </div>
                <div>
                  <span className="text-green-600">✓</span> Agenda — 5 items
                </div>
                <div>
                  <span className="text-green-600">✓</span> Deliberations, item
                  by item
                </div>
                <div>
                  <span className="text-green-600">✓</span> Votes detected — 2,
                  time-stamped
                </div>
                <div style={{ color: "#A97A1F" }}>
                  <span className="animate-att-pulse inline-block">▸</span>{" "}
                  Compliance audit — drafting…
                </div>
                <div className="text-slate-400">○ Sign-off block</div>
              </div>
            </div>
          </div>
        )}

        {craft === 2 && (
          <div className={panelGrid}>
            <div>
              <h3 className="font-serif text-2xl text-cream-100">
                An editor pass, on a real page
              </h3>
              <p className={cn("mt-3", bodyText)}>
                The draft opens in a page-based document editor, and the
                reviewer works through it against the notes you sent with your
                request — wording, structure, formatting. A human pass,
                visible as tracked changes.
              </p>
              <p className={cn("mt-3.5", bodyText)}>
                This is the step a fully automated pipeline skips. It&apos;s
                the one your compliance officer will ask about.
              </p>
            </div>
            <div className="overflow-hidden rounded-lg border border-cream-200/10 bg-paper-100 text-slate-900 shadow-[0_20px_44px_-28px_rgba(19,26,36,0.35)]">
              <div className="flex items-center gap-2 bg-ink-800 px-3.5 py-2.5">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-rust-400" />
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-gold-400" />
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-400" />
                <span className="ml-2 truncate font-mono text-[10.5px] text-cream-400">
                  Minutes-CSE-Nordane-17-09.docx — Attesta Editor
                </span>
              </div>
              <div className="flex gap-1 border-b border-slate-900/10 px-3.5 py-2">
                <span className="rounded-sm border border-slate-900/[0.18] px-[9px] py-[3px] text-[12px] font-bold">
                  B
                </span>
                <span className="rounded-sm border border-slate-900/[0.18] px-[9px] py-[3px] font-serif text-[12px] italic">
                  I
                </span>
                <span className="rounded-sm border border-slate-900/[0.18] px-[9px] py-[3px] text-[12px]">
                  H2
                </span>
                <span className="rounded-sm border border-slate-900/[0.18] px-[9px] py-[3px] text-[12px]">
                  ¶
                </span>
                <span className="ml-auto rounded-sm border border-slate-900/[0.18] px-[9px] py-[3px] font-mono text-[12px] text-slate-500">
                  TRACK: ON
                </span>
              </div>
              <div className="grid grid-cols-[1fr_auto] gap-3.5 px-6 py-[22px]">
                <p className="text-[14px] leading-[1.85] text-slate-700">
                  Item 4 is put to a vote.{" "}
                  <s className="text-rust-600">The proposal is adopted.</s>{" "}
                  <span className="border-b-[1.5px] border-green-600 text-green-600">
                    The proposal is adopted by 8 votes for, 1 against and 2
                    abstentions.
                  </span>
                </p>
                <div className="w-[150px] self-start border-l-2 border-rust-600 bg-paper-200 px-2.5 py-[9px] text-[11px] leading-[1.5] text-slate-600">
                  <b className="text-rust-600">Client note</b>
                  <br />
                  &quot;Include the vote count for item 4.&quot;
                  <br />
                  <span className="font-semibold text-green-600">
                    ✓ Resolved
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {craft === 3 && (
          <div className={panelGrid}>
            <div>
              <h3 className="font-serif text-2xl text-cream-100">
                Locked. Then — and only then — delivered.
              </h3>
              <p className={cn("mt-3", bodyText)}>
                When it&apos;s right, the reviewer locks the report. The lock
                freezes the content, mints the integrity certificate, and
                makes the document downloadable for the first time. Unlocking
                it later is possible — but it&apos;s logged, like everything
                else.
              </p>
              <p className={cn("mt-3.5", bodyText)}>
                The locked report is dispatched to your account as PDF and
                editable DOCX.
              </p>
            </div>
            <div className="relative rounded-lg border border-cream-200/10 bg-paper-100 p-7 text-slate-900 shadow-[0_20px_44px_-28px_rgba(19,26,36,0.35)]">
              <div className="absolute right-5 top-[18px] -rotate-[5deg] rounded-xs border-2 border-rust-600 px-3.5 py-2 font-mono text-[12px] font-semibold tracking-[0.2em] text-rust-600">
                LOCKED
              </div>
              <div className="mb-3.5 font-mono text-[11px] uppercase tracking-[0.13em] text-slate-500">
                Audit trail · Minutes-CSE-Nordane-17-09
              </div>
              <div className="font-mono text-[12px] leading-[2.15] text-slate-700">
                <div>15:11 &nbsp;REQUEST &nbsp;· 1 client note</div>
                <div>16:40 &nbsp;TRANSCRIPT · diarization · 4 speakers</div>
                <div>17:22 &nbsp;REVIEW &nbsp;&nbsp;· m.leroy · 14 corrections</div>
                <div>17:48 &nbsp;EDIT &nbsp;&nbsp;&nbsp;&nbsp;· client note resolved</div>
                <div className="text-rust-600">
                  18:03 &nbsp;LOCK &nbsp;&nbsp;&nbsp;&nbsp;· m.leroy · sha-256:
                  9f3a…c41d
                </div>
                <div className="text-green-600">
                  18:04 &nbsp;DISPATCH → client account
                </div>
              </div>
              <p className="mt-4 border-t border-slate-900/10 pt-3.5 text-[13.5px] text-slate-500">
                Download exists from 18:03. Not before.
              </p>
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}
