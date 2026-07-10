"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { saveReportContent } from "@/app/admin/actions";
import type { ReportContent } from "@/lib/report-generation";

type SaveState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "saved" }
  | { status: "error"; error: string };

// Structured editor over ReportContent. Holds a working copy in state; every
// field/array edit produces a new ReportContent. Save is content-only via
// saveReportContent (findings/analytics untouched). Mirrors create-flow's input
// styling; no rich text, no versioning (see plan — MVP scope).
export function ReportEditor({
  reportId,
  content: initial,
}: {
  reportId: string;
  content: ReportContent;
}) {
  const router = useRouter();
  const [content, setContent] = useState<ReportContent>(() =>
    structuredClone(initial)
  );
  const [save, setSave] = useState<SaveState>({ status: "idle" });

  // Any edit clears a prior "saved" flag so the button state tracks unsaved
  // changes honestly.
  function patch(next: Partial<ReportContent>) {
    setContent((prev) => ({ ...prev, ...next }));
    setSave((s) => (s.status === "saved" ? { status: "idle" } : s));
  }
  function patchCover(next: Partial<ReportContent["coverInfo"]>) {
    patch({ coverInfo: { ...content.coverInfo, ...next } });
  }

  async function persist(): Promise<boolean> {
    setSave({ status: "saving" });
    const result = await saveReportContent(reportId, content);
    if (!result.ok) {
      setSave({ status: "error", error: result.error });
      return false;
    }
    setSave({ status: "saved" });
    return true;
  }

  async function handleSaveDraft() {
    if (await persist()) router.refresh();
  }
  async function handleSaveAndView() {
    if (await persist()) router.push(`/report/${reportId}`);
  }

  const busy = save.status === "saving";

  return (
    <div className="space-y-8">
      {/* Cover info */}
      <Section title="Cover">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label="Company"
            value={content.coverInfo.company}
            onChange={(v) => patchCover({ company: v })}
          />
          <Field
            label="Meeting title"
            value={content.coverInfo.meetingTitle}
            onChange={(v) => patchCover({ meetingTitle: v })}
          />
          <Field
            label="Date"
            value={content.coverInfo.date}
            onChange={(v) => patchCover({ date: v })}
          />
          <Field
            label="Region"
            value={content.coverInfo.region}
            onChange={(v) => patchCover({ region: v })}
          />
          <Field
            label="Governing body"
            value={content.coverInfo.governingBody}
            onChange={(v) => patchCover({ governingBody: v })}
          />
        </div>
      </Section>

      {/* Executive summary */}
      <Section title="Executive summary">
        <TextArea
          value={content.executiveSummary}
          onChange={(v) => patch({ executiveSummary: v })}
          rows={5}
        />
      </Section>

      {/* Attendance */}
      <ArraySection
        title="Attendance"
        items={content.attendance}
        onAdd={() =>
          patch({
            attendance: [
              ...content.attendance,
              { name: "", role: "", present: true },
            ],
          })
        }
        onRemove={(i) =>
          patch({
            attendance: content.attendance.filter((_, idx) => idx !== i),
          })
        }
        render={(row, i) => (
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field
              label="Name"
              value={row.name}
              onChange={(v) =>
                patch({
                  attendance: replaceAt(content.attendance, i, {
                    ...row,
                    name: v,
                  }),
                })
              }
            />
            <Field
              label="Role"
              value={row.role}
              onChange={(v) =>
                patch({
                  attendance: replaceAt(content.attendance, i, {
                    ...row,
                    role: v,
                  }),
                })
              }
            />
            <Checkbox
              label="Present"
              checked={row.present}
              onChange={(v) =>
                patch({
                  attendance: replaceAt(content.attendance, i, {
                    ...row,
                    present: v,
                  }),
                })
              }
            />
          </div>
        )}
      />

      {/* Agenda items */}
      <ArraySection
        title="Agenda items"
        items={content.agendaItems}
        onAdd={() =>
          patch({
            agendaItems: [
              ...content.agendaItems,
              { order: content.agendaItems.length + 1, title: "" },
            ],
          })
        }
        onRemove={(i) =>
          patch({
            agendaItems: content.agendaItems.filter((_, idx) => idx !== i),
          })
        }
        render={(row, i) => (
          <div className="grid gap-3 sm:grid-cols-[100px_1fr] sm:items-end">
            <NumberField
              label="Order"
              value={row.order}
              onChange={(v) =>
                patch({
                  agendaItems: replaceAt(content.agendaItems, i, {
                    ...row,
                    order: v ?? 0,
                  }),
                })
              }
            />
            <Field
              label="Title"
              value={row.title}
              onChange={(v) =>
                patch({
                  agendaItems: replaceAt(content.agendaItems, i, {
                    ...row,
                    title: v,
                  }),
                })
              }
            />
          </div>
        )}
      />

      {/* Discussion log */}
      <ArraySection
        title="Discussion log"
        items={content.discussionLog}
        onAdd={() =>
          patch({
            discussionLog: [
              ...content.discussionLog,
              {
                agendaItemRef: null,
                speakerName: "",
                text: "",
                timestamp: "",
              },
            ],
          })
        }
        onRemove={(i) =>
          patch({
            discussionLog: content.discussionLog.filter((_, idx) => idx !== i),
          })
        }
        render={(row, i) => (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[1fr_1fr_120px] sm:items-end">
              <Field
                label="Speaker"
                value={row.speakerName}
                onChange={(v) =>
                  patch({
                    discussionLog: replaceAt(content.discussionLog, i, {
                      ...row,
                      speakerName: v,
                    }),
                  })
                }
              />
              <Field
                label="Timestamp"
                value={row.timestamp}
                onChange={(v) =>
                  patch({
                    discussionLog: replaceAt(content.discussionLog, i, {
                      ...row,
                      timestamp: v,
                    }),
                  })
                }
              />
              <NumberField
                label="Agenda ref"
                value={row.agendaItemRef}
                nullable
                onChange={(v) =>
                  patch({
                    discussionLog: replaceAt(content.discussionLog, i, {
                      ...row,
                      agendaItemRef: v,
                    }),
                  })
                }
              />
            </div>
            <TextArea
              label="Text"
              value={row.text}
              rows={3}
              onChange={(v) =>
                patch({
                  discussionLog: replaceAt(content.discussionLog, i, {
                    ...row,
                    text: v,
                  }),
                })
              }
            />
          </div>
        )}
      />

      {/* Decisions */}
      <ArraySection
        title="Decisions"
        items={content.decisions}
        onAdd={() =>
          patch({
            decisions: [
              ...content.decisions,
              { agendaItemRef: null, description: "" },
            ],
          })
        }
        onRemove={(i) =>
          patch({
            decisions: content.decisions.filter((_, idx) => idx !== i),
          })
        }
        render={(row, i) => (
          <div className="grid gap-3 sm:grid-cols-[120px_1fr] sm:items-end">
            <NumberField
              label="Agenda ref"
              value={row.agendaItemRef}
              nullable
              onChange={(v) =>
                patch({
                  decisions: replaceAt(content.decisions, i, {
                    ...row,
                    agendaItemRef: v,
                  }),
                })
              }
            />
            <Field
              label="Description"
              value={row.description}
              onChange={(v) =>
                patch({
                  decisions: replaceAt(content.decisions, i, {
                    ...row,
                    description: v,
                  }),
                })
              }
            />
          </div>
        )}
      />

      {/* Votes */}
      <ArraySection
        title="Votes"
        items={content.votes}
        onAdd={() =>
          patch({
            votes: [
              ...content.votes,
              {
                agendaItemRef: null,
                description: "",
                forCount: 0,
                againstCount: 0,
                abstainCount: 0,
              },
            ],
          })
        }
        onRemove={(i) =>
          patch({ votes: content.votes.filter((_, idx) => idx !== i) })
        }
        render={(row, i) => (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-[120px_1fr] sm:items-end">
              <NumberField
                label="Agenda ref"
                value={row.agendaItemRef}
                nullable
                onChange={(v) =>
                  patch({
                    votes: replaceAt(content.votes, i, {
                      ...row,
                      agendaItemRef: v,
                    }),
                  })
                }
              />
              <Field
                label="Description"
                value={row.description}
                onChange={(v) =>
                  patch({
                    votes: replaceAt(content.votes, i, {
                      ...row,
                      description: v,
                    }),
                  })
                }
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <NumberField
                label="For"
                value={row.forCount}
                onChange={(v) =>
                  patch({
                    votes: replaceAt(content.votes, i, {
                      ...row,
                      forCount: v ?? 0,
                    }),
                  })
                }
              />
              <NumberField
                label="Against"
                value={row.againstCount}
                onChange={(v) =>
                  patch({
                    votes: replaceAt(content.votes, i, {
                      ...row,
                      againstCount: v ?? 0,
                    }),
                  })
                }
              />
              <NumberField
                label="Abstain"
                value={row.abstainCount}
                onChange={(v) =>
                  patch({
                    votes: replaceAt(content.votes, i, {
                      ...row,
                      abstainCount: v ?? 0,
                    }),
                  })
                }
              />
            </div>
          </div>
        )}
      />

      {/* Procedural notes (string list) */}
      <ArraySection
        title="Procedural notes"
        items={content.proceduralNotes}
        onAdd={() =>
          patch({ proceduralNotes: [...content.proceduralNotes, ""] })
        }
        onRemove={(i) =>
          patch({
            proceduralNotes: content.proceduralNotes.filter(
              (_, idx) => idx !== i
            ),
          })
        }
        render={(note, i) => (
          <Field
            label={`Note ${i + 1}`}
            value={note}
            onChange={(v) =>
              patch({
                proceduralNotes: replaceAt(content.proceduralNotes, i, v),
              })
            }
          />
        )}
      />

      {/* Closing notes */}
      <Section title="Closing notes">
        <TextArea
          value={content.closingNotes}
          onChange={(v) => patch({ closingNotes: v })}
          rows={4}
        />
      </Section>

      {/* Save bar */}
      <div className="sticky bottom-0 -mx-6 border-t border-cream-200/10 bg-ink-900/95 px-6 py-4 backdrop-blur">
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={handleSaveDraft} disabled={busy}>
            {busy ? "Saving…" : "Save draft"}
          </Button>
          <Button variant="outline" onClick={handleSaveAndView} disabled={busy}>
            Save &amp; view
          </Button>
          {save.status === "saved" && (
            <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-green-400">
              Saved ✓
            </span>
          )}
          {save.status === "error" && (
            <span className="text-[13px] text-rust-400">{save.error}</span>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- primitives ---------- */

function replaceAt<T>(arr: T[], index: number, value: T): T[] {
  return arr.map((item, i) => (i === index ? value : item));
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-cream-200/10 bg-ink-850 p-6">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.1em] text-rust-400">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function ArraySection<T>({
  title,
  items,
  onAdd,
  onRemove,
  render,
}: {
  title: string;
  items: T[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  render: (item: T, index: number) => React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-cream-200/10 bg-ink-850 p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.1em] text-rust-400">
          {title}
        </h2>
        <button
          type="button"
          onClick={onAdd}
          className="rounded border border-cream-200/20 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.08em] text-cream-300 transition-colors hover:bg-cream-200/5"
        >
          + Add
        </button>
      </div>
      {items.length === 0 ? (
        <p className="mt-4 text-[13px] text-cream-500">None yet.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {items.map((item, i) => (
            <div
              key={i}
              className="rounded border border-cream-200/10 bg-ink-900 p-4"
            >
              {render(item, i)}
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-rust-400 hover:text-rust-300"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-cream-500">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1.5 w-full rounded border border-cream-200/15 bg-ink-900 px-3 py-2 text-[13px] text-cream-100"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
}) {
  return (
    <label className="block">
      {label && (
        <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-cream-500">
          {label}
        </span>
      )}
      <textarea
        value={value}
        rows={rows}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "w-full rounded border border-cream-200/15 bg-ink-900 px-3 py-2 text-[13px] leading-[1.6] text-cream-100",
          label && "mt-1.5"
        )}
      />
    </label>
  );
}

function NumberField({
  label,
  value,
  onChange,
  nullable = false,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  nullable?: boolean;
}) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.08em] text-cream-500">
        {label}
      </span>
      <input
        type="number"
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") {
            onChange(nullable ? null : 0);
            return;
          }
          const n = Number(raw);
          onChange(Number.isFinite(n) ? n : nullable ? null : 0);
        }}
        className="mt-1.5 w-full rounded border border-cream-200/15 bg-ink-900 px-3 py-2 text-[13px] text-cream-100"
      />
    </label>
  );
}

function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 py-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-rust-600"
      />
      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-cream-400">
        {label}
      </span>
    </label>
  );
}
