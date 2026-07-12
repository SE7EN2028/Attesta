"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type AdminKeys = {
  geminiKey: string;
  deepgramKey: string;
  setGeminiKey: (v: string) => void;
  setDeepgramKey: (v: string) => void;
};

const AdminKeysContext = createContext<AdminKeys | null>(null);

export function useAdminKeys(): AdminKeys {
  const ctx = useContext(AdminKeysContext);
  if (!ctx) {
    throw new Error("useAdminKeys must be used within AdminKeysProvider");
  }
  return ctx;
}

// In-memory only: the keys live in React state, are sent to the server as a
// per-run argument, and vanish on reload. Nothing is written to localStorage,
// cookies, or the DB, and the keys are never logged. This is what makes the
// "we don't save your key" copy in the panel literally true.
export function AdminKeysProvider({ children }: { children: ReactNode }) {
  const [geminiKey, setGeminiKey] = useState("");
  const [deepgramKey, setDeepgramKey] = useState("");
  return (
    <AdminKeysContext.Provider
      value={{ geminiKey, deepgramKey, setGeminiKey, setDeepgramKey }}
    >
      {children}
    </AdminKeysContext.Provider>
  );
}

export function AdminKeysPanel() {
  const { geminiKey, deepgramKey, setGeminiKey, setDeepgramKey } =
    useAdminKeys();
  const anySet = Boolean(geminiKey || deepgramKey);

  return (
    <details className="rounded-md border border-cream-200/10 bg-ink-850 p-5">
      <summary className="cursor-pointer select-none text-[14px] font-medium text-cream-200">
        Use your own API keys{" "}
        <span className="ml-1 font-mono text-[11px] uppercase tracking-[0.08em] text-cream-500">
          optional{anySet ? " · active" : ""}
        </span>
      </summary>

      <p className="mt-3 max-w-2xl text-[13.5px] leading-relaxed text-cream-400">
        Hitting a rate-limit error? Add your own Gemini or Deepgram key below,
        then run transcription or generation again. It&apos;s safe — the key is
        kept only on this page for the run, sent straight to the processing step,
        and <span className="text-cream-200">never saved on the client</span> or
        stored on our servers. Reload the page and it&apos;s gone.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-cream-500">
            Gemini API key
          </span>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={geminiKey}
            onChange={(e) => setGeminiKey(e.target.value)}
            placeholder="AIza…"
            className="mt-1.5 w-full rounded border border-cream-200/15 bg-ink-900 px-3 py-2 font-mono text-[13px] text-cream-100 outline-none placeholder:text-cream-600 focus:border-rust-400/60"
          />
        </label>
        <label className="block">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-cream-500">
            Deepgram API key
          </span>
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={deepgramKey}
            onChange={(e) => setDeepgramKey(e.target.value)}
            placeholder="Token…"
            className="mt-1.5 w-full rounded border border-cream-200/15 bg-ink-900 px-3 py-2 font-mono text-[13px] text-cream-100 outline-none placeholder:text-cream-600 focus:border-rust-400/60"
          />
        </label>
      </div>

      {anySet && (
        <button
          type="button"
          onClick={() => {
            setGeminiKey("");
            setDeepgramKey("");
          }}
          className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-rust-400 hover:text-rust-300"
        >
          Clear keys
        </button>
      )}
    </details>
  );
}
