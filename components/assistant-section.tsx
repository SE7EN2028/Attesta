"use client";

import { useEffect, useRef, useState } from "react";
import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";
import { cn } from "@/lib/utils";
import { WaveMerge } from "@/components/wave-merge";

type LangKey = "en" | "fr" | "de";

const CHAT: Record<
  LangKey,
  { label: string; tag: string; status: string; greet: string; qs: [string, string][] }
> = {
  en: {
    label: "English",
    tag: "EN · ENGLISH",
    status: "SPEAKING · EN",
    greet: "Hello — ask me anything about your report or the process, by text or by voice.",
    qs: [
      ["Where is my report right now?", "Your report “CSE — meeting of 17 September” is in review with M. Leroy. Lock is scheduled for 17:00 today; it will then appear in your account with the audit certificate attached."],
      ["What’s included in my report?", "Every report includes real speaker identification, agenda-based structure, the full compliance audit against your selected regulation, automatic vote detection and a digital sign-off block — delivered as PDF and DOCX within 1–2 hours."],
      ["Who approved my minutes?", "Reviewed and locked by M. Leroy on 17 September at 18:03. The sha-256 fingerprint is printed in the audit certificate delivered with the report."],
    ],
  },
  fr: {
    label: "Français",
    tag: "FR · FRANÇAIS",
    status: "RÉPONSE VOCALE · FR",
    greet: "Bonjour — posez-moi une question sur votre rapport ou sur le processus, à l’écrit ou à la voix.",
    qs: [
      ["Où en est mon rapport ?", "Votre rapport « CSE — réunion du 17 septembre » est en relecture chez M. Leroy. Verrouillage prévu aujourd’hui à 17 h, puis dépôt sur votre espace, certificat d’audit joint."],
      ["Que contient mon rapport ?", "Chaque rapport comprend l’identification réelle des intervenants, une structure par ordre du jour, l’audit de conformité complet, la détection automatique des votes et un bloc de signature numérique — livré en PDF et DOCX sous 1 à 2 heures."],
      ["Qui a validé mes minutes ?", "Relecture et verrouillage par M. Leroy le 17/09 à 18 h 03 — l’empreinte sha-256 figure au certificat d’audit livré avec le rapport."],
    ],
  },
  de: {
    label: "Deutsch",
    tag: "DE · DEUTSCH",
    status: "SPRACHAUSGABE · DE",
    greet: "Guten Tag — stellen Sie mir Fragen zu Ihrem Bericht oder zum Ablauf, per Text oder Sprache.",
    qs: [
      ["Wo ist mein Bericht gerade?", "Ihr Bericht „CSE — Sitzung vom 17. September“ ist in der Endkontrolle bei M. Leroy. Die Sperrung ist für heute 17 Uhr geplant; danach liegt er mit Audit-Zertifikat in Ihrem Konto bereit."],
      ["Was enthält mein Bericht?", "Jeder Bericht umfasst echte Sprechererkennung, eine Gliederung nach Tagesordnung, die vollständige Compliance-Prüfung, automatische Beschlusserkennung und einen digitalen Freigabeblock — geliefert als PDF und DOCX innerhalb von 1–2 Stunden."],
      ["Wer hat meine Niederschrift freigegeben?", "Geprüft und gesperrt von M. Leroy am 17. September um 18:03 Uhr — der sha-256-Fingerabdruck steht im mitgelieferten Audit-Zertifikat."],
    ],
  },
};

type Msg = { who: "u" | "a"; txt: string };

export function AssistantSection() {
  const [lang, setLang] = useState<LangKey>("en");
  const [chat, setChat] = useState<Msg[]>([]);
  const [typing, setTyping] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const t = timers.current;
    return () => t.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat, typing]);

  const L = CHAT[lang];

  function pickLang(k: LangKey) {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setLang(k);
    setChat([]);
    setTyping(false);
    setSpeaking(false);
  }

  function ask([q, a]: [string, string]) {
    if (typing) return;
    setChat((c) => [...c, { who: "u", txt: q }]);
    setTyping(true);
    setSpeaking(false);
    timers.current.push(
      setTimeout(() => {
        setChat((c) => [...c, { who: "a", txt: a }]);
        setTyping(false);
        setSpeaking(true);
        timers.current.push(setTimeout(() => setSpeaking(false), 3400));
      }, 950)
    );
  }

  const messages: Msg[] = [{ who: "a", txt: L.greet }, ...chat];
  const voiceStatus = speaking ? L.status : typing ? "· · ·" : "IDLE · TAP A QUESTION";

  return (
    <section id="assistant" className="border-t border-cream-200/10 py-24 md:py-32">
      <Container className="grid items-center gap-16 lg:grid-cols-2">
        <div>
          <Eyebrow>After delivery</Eyebrow>
          <h2 className="mt-5 font-serif text-3xl leading-[1.15] text-cream-100 md:text-[44px]">
            Ask your report anything. In its own language.
          </h2>
          <p className="mt-6 max-w-md text-[17px] leading-[1.65] text-cream-300">
            Every delivered report comes with a voice-and-text assistant that
            answers questions about the document and the process — in
            whichever language your report was produced. It answers from
            curated knowledge, and hands anything else to a person.
          </p>
          <div className="mt-6 flex gap-2" role="group" aria-label="Assistant language">
            {(Object.keys(CHAT) as LangKey[]).map((k) => {
              const on = k === lang;
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  onClick={() => pickLang(k)}
                  className={cn(
                    "cursor-pointer rounded-full border px-[18px] py-2 text-[13.5px] font-semibold transition-colors",
                    on
                      ? "border-cream-200 bg-cream-200 text-ink-900"
                      : "border-cream-200/25 text-cream-300 hover:border-cream-200/60"
                  )}
                >
                  {CHAT[k].label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-cream-200/10 bg-ink-750 shadow-[0_34px_70px_-40px_rgba(0,0,0,0.7)]">
          <div className="flex items-center gap-2.5 border-b border-cream-200/10 px-[18px] py-3.5">
            <span className="inline-block h-2 w-2 rounded-full bg-green-400" />
            <span className="font-mono text-[11px] tracking-[0.14em] text-cream-400">
              ATTESTA ASSISTANT
            </span>
            <span className="ml-auto font-mono text-[11px] tracking-[0.08em] text-cream-500">
              {L.tag}
            </span>
          </div>

          <div
            ref={logRef}
            className="flex h-[280px] flex-col gap-3 overflow-y-auto p-[18px]"
          >
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] px-[15px] py-[11px] text-[14px] leading-[1.6]",
                  m.who === "a"
                    ? "self-start rounded-[10px_10px_10px_3px] bg-paper-200 text-slate-900"
                    : "self-end rounded-[10px_10px_3px_10px] border border-cream-200/[0.28] text-cream-200"
                )}
              >
                {m.txt}
              </div>
            ))}
            {typing && (
              <div className="self-start rounded-[10px_10px_10px_3px] bg-paper-200 px-4 py-3 text-[14px] tracking-[2px] text-slate-500">
                <span className="animate-att-pulse">● ● ●</span>
              </div>
            )}
          </div>

          <div className="px-[18px]">
            <div className="flex flex-wrap gap-2 border-t border-cream-200/10 py-3">
              {L.qs.map((qa) => (
                <button
                  key={qa[0]}
                  type="button"
                  onClick={() => ask(qa)}
                  className="cursor-pointer rounded-full border border-cream-200/[0.22] bg-transparent px-3.5 py-[7px] text-[12.5px] text-cream-300 transition-colors hover:border-rust-400 hover:text-cream-100"
                >
                  {qa[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3.5 border-t border-cream-200/10 px-[18px] pb-4 pt-3">
            <div className="h-11 min-w-0 flex-1">
              <WaveMerge mode="voice" active={speaking} className="h-11 w-full" />
            </div>
            <span
              className="whitespace-nowrap font-mono text-[10px] tracking-[0.12em]"
              style={{ color: speaking ? "#D9705F" : "#77808D" }}
            >
              {voiceStatus}
            </span>
          </div>
        </div>
      </Container>
    </section>
  );
}
