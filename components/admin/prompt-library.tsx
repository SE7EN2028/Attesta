"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { savePrompt, resetPrompt } from "@/app/admin/prompt-actions";

type Item = {
  key: string;
  label: string;
  text: string;
  defaultText: string;
  isOverridden: boolean;
};

type RowState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved" }
  | { status: "error"; error: string };

export function PromptLibrary({ items }: { items: Item[] }) {
  return (
    <div className="space-y-6">
      {items.map((item) => (
        <PromptRow key={item.key} item={item} />
      ))}
    </div>
  );
}

function PromptRow({ item }: { item: Item }) {
  const router = useRouter();
  const [text, setText] = useState(item.text);
  const [state, setState] = useState<RowState>({ status: "idle" });

  // isOverridden reflects the server's last-known state; dirty tracks local
  // unsaved edits vs. the value we loaded.
  const dirty = text !== item.text;
  const busy = state.status === "saving";

  async function handleSave() {
    setState({ status: "saving" });
    const result = await savePrompt(item.key, text);
    if (!result.ok) {
      setState({ status: "error", error: result.error });
      return;
    }
    setState({ status: "saved" });
    router.refresh();
  }

  async function handleReset() {
    setState({ status: "saving" });
    const result = await resetPrompt(item.key);
    if (!result.ok) {
      setState({ status: "error", error: result.error });
      return;
    }
    setText(item.defaultText);
    setState({ status: "saved" });
    router.refresh();
  }

  const onDefault = text === item.defaultText;

  return (
    <div className="rounded-md border border-cream-200/10 bg-ink-850 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="font-mono text-[11px] uppercase tracking-[0.1em] text-rust-400">
            {item.label}
          </h2>
          <span className="font-mono text-[10px] text-cream-600">
            {item.key}
          </span>
        </div>
        <span
          className={
            item.isOverridden
              ? "rounded-full border border-amber-400/30 bg-amber-400/5 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-amber-300"
              : "rounded-full border border-cream-200/15 px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] text-cream-500"
          }
        >
          {item.isOverridden ? "Customized" : "Default"}
        </span>
      </div>

      <textarea
        value={text}
        rows={Math.min(14, Math.max(3, text.split("\n").length + 1))}
        onChange={(e) => {
          setText(e.target.value);
          if (state.status !== "idle") setState({ status: "idle" });
        }}
        spellCheck={false}
        className="mt-4 w-full rounded border border-cream-200/15 bg-ink-900 px-3 py-2 font-mono text-[12.5px] leading-[1.6] text-cream-100"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Button size="sm" onClick={handleSave} disabled={busy || !dirty}>
          {busy ? "Saving…" : "Save"}
        </Button>
        {item.isOverridden && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleReset}
            disabled={busy}
          >
            Reset to default
          </Button>
        )}
        {!onDefault && !item.isOverridden && (
          <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-cream-600">
            unsaved
          </span>
        )}
        {state.status === "saved" && (
          <span className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-green-400">
            Saved ✓
          </span>
        )}
        {state.status === "error" && (
          <span className="text-[12.5px] text-rust-400">{state.error}</span>
        )}
      </div>
    </div>
  );
}
