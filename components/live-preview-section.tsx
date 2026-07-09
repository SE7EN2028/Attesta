"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";
import { FlipBook } from "@/components/flip-book";
import { buildLiveSample, type LiveForm } from "@/components/flipbook-content";

const KICKER: Record<string, string> = {
  CSE: "Minutes · CSE",
  CSSCT: "Minutes · CSSCT",
  AG: "Minutes · General assembly",
  HR: "Minutes · HR",
};

function fmtDate(f: LiveForm) {
  const loc =
    ({ Français: "fr-FR", English: "en-GB", Deutsch: "de-DE" } as Record<string, string>)[
      f.lang
    ] || "en-GB";
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

const inputCls =
  "w-full box-border rounded-sm border border-slate-900/[0.22] bg-paper-200 px-3 py-2.5 text-[14px] text-slate-900";
const labelCls = "mb-[5px] block text-[12.5px] font-semibold text-slate-700";

export function LivePreviewSection() {
  const [form, setForm] = useState<LiveForm>({
    company: "Nordane SA",
    region: "France",
    body: "CSE",
    date: "2026-09-17",
    title: "September ordinary session",
    lang: "English",
  });
  const [processing, setProcessing] = useState(false);
  const [procDone, setProcDone] = useState<string[]>([]);
  const [uploaded, setUploaded] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  const set = (patch: Partial<LiveForm>) => setForm((f) => ({ ...f, ...patch }));

  const livePages = useMemo(() => buildLiveSample(form), [form]);

  function startUpload() {
    if (processing || uploaded) return;
    const steps = [
      "Reading source — reunion_cse_17-09.mp3 · 48:12",
      "Separating voices — 4 distinct speakers found",
      "Extracting figures — 6 numeric series detected",
      `Checking against ${form.region} · ${form.body} rule set — 2 flags`,
    ];
    setProcessing(true);
    setProcDone([]);
    steps.forEach((s, i) =>
      timers.current.push(
        setTimeout(() => setProcDone((d) => [...d, s]), 620 * (i + 1))
      )
    );
    timers.current.push(
      setTimeout(() => {
        setProcessing(false);
        setUploaded(true);
      }, 620 * steps.length + 650)
    );
  }

  function resetPreview() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setUploaded(false);
    setProcessing(false);
    setProcDone([]);
  }

  return (
    <section
      id="live-preview"
      className="border-t border-cream-200/10 py-24 md:py-32"
    >
      <Container>
        <Eyebrow>The live preview · working demo</Eyebrow>
        <h2 className="mt-5 max-w-2xl font-serif text-3xl leading-[1.15] text-cream-100 md:text-[44px]">
          See your report take shape before you commit to anything.
        </h2>
        <p className="mt-6 max-w-2xl text-[17px] leading-[1.65] text-cream-300">
          This is the actual intake flow, with sample data. Edit the form —
          the cover updates as you type. Then run the sample recording
          through the preview engine. The preview is instant. The full
          report is human-checked before it&apos;s yours.
        </p>

        <div className="mt-14 grid items-start gap-7 lg:grid-cols-2">
          {/* form */}
          <div className="rounded-lg border border-slate-900/[0.14] bg-paper-100 p-7 text-slate-900 shadow-[0_20px_44px_-28px_rgba(19,26,36,0.35)]">
            <div className="mb-5 font-mono text-[11px] uppercase tracking-[0.15em] text-slate-500">
              Step 2 · About your meeting
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className={labelCls}>Company</span>
                <input
                  type="text"
                  value={form.company}
                  placeholder="Your company"
                  onChange={(e) => set({ company: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Meeting title</span>
                <input
                  type="text"
                  value={form.title}
                  placeholder="e.g. September ordinary session"
                  onChange={(e) => set({ title: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Region</span>
                <select
                  value={form.region}
                  onChange={(e) => set({ region: e.target.value })}
                  className={inputCls}
                >
                  <option value="France">France — live</option>
                  <option value="Germany" disabled>
                    Germany — coming soon
                  </option>
                  <option value="Belgium" disabled>
                    Belgium — coming soon
                  </option>
                  <option value="Netherlands" disabled>
                    Netherlands — coming soon
                  </option>
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Governing body</span>
                <select
                  value={form.body}
                  onChange={(e) => set({ body: e.target.value })}
                  className={inputCls}
                >
                  <option value="CSE">CSE — works council</option>
                  <option value="CSSCT">CSSCT — health &amp; safety</option>
                  <option value="HR">HR — internal meeting</option>
                  <option value="AG">AG — general assembly</option>
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Meeting date</span>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => set({ date: e.target.value })}
                  className={inputCls}
                />
              </label>
              <label className="block">
                <span className={labelCls}>Report language</span>
                <select
                  value={form.lang}
                  onChange={(e) => set({ lang: e.target.value })}
                  className={inputCls}
                >
                  <option value="English">English</option>
                  <option value="Français">Français</option>
                  <option value="Deutsch">Deutsch</option>
                </select>
              </label>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-slate-400">
                Selection:
              </span>
              {[form.region, form.body, form.lang].map((v, i) => (
                <span key={i} className="flex items-center gap-2">
                  {i > 0 && <span className="text-rust-600">→</span>}
                  <span className="rounded-full border border-slate-900/25 px-2.5 py-[3px] font-mono text-[11px] text-slate-700">
                    {v}
                  </span>
                </span>
              ))}
            </div>

            <div className="mt-6 border-t border-slate-900/10 pt-6">
              <div className="mb-3.5 font-mono text-[11px] uppercase tracking-[0.15em] text-slate-500">
                Step 3 · Source file
              </div>

              {!processing && !uploaded && (
                <button
                  onClick={startUpload}
                  className="w-full cursor-pointer rounded-md border-[1.5px] border-dashed border-slate-900/30 bg-transparent px-[18px] py-[26px] text-center text-slate-700 transition-colors hover:border-rust-600 hover:bg-rust-600/5"
                >
                  <span className="block text-[15px] font-semibold">
                    Run the sample recording
                  </span>
                  <span className="mt-[5px] block font-mono text-[11px] text-slate-500">
                    reunion_cse_17-09.mp3 · 48:12 — no upload needed for the
                    demo
                  </span>
                </button>
              )}

              {processing && (
                <div className="rounded-md border border-slate-900/15 bg-paper-200 p-[18px]">
                  <div className="mb-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.12em] text-rust-600">
                    <span className="animate-att-pulse inline-block h-[7px] w-[7px] rounded-full bg-rust-600" />
                    Preview engine running — not full transcription
                  </div>
                  {procDone.map((line) => (
                    <div
                      key={line}
                      className="font-mono text-[11.5px] leading-[2] text-slate-700"
                    >
                      <span className="text-green-600">✓</span> {line}
                    </div>
                  ))}
                </div>
              )}

              {uploaded && (
                <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-md border border-green-600 bg-green-600/[0.07] px-4 py-3.5">
                  <span className="text-[13.5px] font-semibold text-green-600">
                    ✓ Preview generated — flip through it on the right
                  </span>
                  <button
                    onClick={resetPreview}
                    className="cursor-pointer border-none bg-transparent p-1 font-mono text-[11px] tracking-[0.08em] text-slate-500 underline"
                  >
                    RESET DEMO
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* summary / viewer */}
          <div className="min-w-0">
            {!uploaded ? (
              <div className="flex flex-col items-center">
                <div className="mb-4 self-start font-mono text-[11px] uppercase tracking-[0.15em] text-slate-500">
                  Summary report · builds as you type
                </div>
                <div
                  className="relative box-border flex w-[min(300px,80%)] flex-col rounded-sm border border-slate-900/20 bg-paper-100 p-6 text-slate-900 shadow-[0_24px_48px_-26px_rgba(19,26,36,0.45)]"
                  style={{ aspectRatio: "210 / 297" }}
                >
                  <div className="flex min-h-0 flex-1 flex-col border border-slate-900 p-4">
                    <div className="font-mono text-[8.5px] uppercase tracking-[0.16em] text-slate-500">
                      {KICKER[form.body] || "Minutes"}
                    </div>
                    <div className="mt-2.5 overflow-hidden font-serif text-[17px] leading-[1.25] text-slate-900">
                      {form.title || "Untitled meeting"}
                    </div>
                    <div className="mt-[7px] text-[11px] text-slate-500">
                      {form.company || "—"}
                    </div>
                    <div className="mt-auto">
                      {[
                        ["Region", form.region],
                        ["Governing body", form.body],
                        ["Language", form.lang],
                        ["Date", fmtDate(form)],
                      ].map(([k, v]) => (
                        <div
                          key={k}
                          className="flex justify-between border-t border-[#DFD9CA] py-[5px] text-[9.5px]"
                        >
                          <span className="font-mono uppercase tracking-[0.08em] text-slate-500">
                            {k}
                          </span>
                          <span className="font-semibold">{v}</span>
                        </div>
                      ))}
                    </div>
                    <div className="absolute inset-x-0 bottom-3 text-center font-mono text-[8px] uppercase tracking-[0.14em] text-slate-400">
                      Attesta · Draft cover
                    </div>
                  </div>
                </div>
                <p className="mt-[18px] max-w-[320px] text-center text-[13.5px] text-slate-500">
                  Run the sample file to unlock the three-part preview in the
                  viewer.
                </p>
              </div>
            ) : (
              <div className="relative">
                <div className="absolute -top-3 right-1.5 z-20 rotate-2 rounded-xs bg-rust-600 px-3 py-1.5 font-mono text-[10px] tracking-[0.15em] text-paper-100 shadow-[0_8px_18px_-8px_rgba(19,26,36,0.5)]">
                  READ-ONLY · NOT DOWNLOADABLE
                </div>
                <FlipBook pages={livePages} chrome="light" />
                <p className="mt-5 text-[14px] leading-[1.65] text-cream-300">
                  This preview can&apos;t be edited or exported —
                  deliberately. Nothing unreviewed should ever look like a
                  deliverable. The only way to unlock the editable, signed
                  report is to <a href="/create">request it</a>.
                </p>
              </div>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
