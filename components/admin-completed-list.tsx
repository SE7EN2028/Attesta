"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { lockReport } from "@/app/admin/actions";

type Row = {
  meetingRequestId: string;
  reportId: string;
  title: string;
  company: string;
  ownerEmail: string;
  tier: string;
  reportStatus: string;
  lockedBy: string | null;
};

type LockState =
  | { status: "idle" }
  | { status: "running" }
  | { status: "error"; error: string };

export function AdminCompletedList({ initialRows }: { initialRows: Row[] }) {
  const router = useRouter();
  const [lockStates, setLockStates] = useState<Record<string, LockState>>({});

  async function handleLock(meetingRequestId: string) {
    setLockStates((prev) => ({
      ...prev,
      [meetingRequestId]: { status: "running" },
    }));
    const result = await lockReport(meetingRequestId);
    if (!result.ok) {
      setLockStates((prev) => ({
        ...prev,
        [meetingRequestId]: { status: "error", error: result.error },
      }));
      return;
    }
    // Server action already revalidated /admin, /samples and the report
    // path — refresh so this list reflects the new LOCKED state.
    router.refresh();
    setLockStates((prev) => ({
      ...prev,
      [meetingRequestId]: { status: "idle" },
    }));
  }

  if (initialRows.length === 0) {
    return (
      <p className="text-[14.5px] text-cream-400">No reports generated yet.</p>
    );
  }

  return (
    <div className="space-y-4">
      {initialRows.map((row) => {
        const lock = lockStates[row.meetingRequestId] ?? { status: "idle" };
        const isLocked = row.reportStatus === "LOCKED";
        return (
          <div
            key={row.reportId}
            className="rounded-md border border-cream-200/10 bg-ink-850 p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-rust-400">
                  {row.tier} · {row.reportStatus}
                  {isLocked && row.lockedBy ? ` · by ${row.lockedBy}` : ""}
                </p>
                <h3 className="mt-1 font-serif text-lg text-cream-100">
                  {row.title}
                </h3>
                <p className="mt-1 text-[13px] text-cream-400">
                  {row.company} · {row.ownerEmail}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Button asChild variant="outline" size="sm">
                  <Link href={`/report/${row.reportId}`}>View report</Link>
                </Button>
                {isLocked ? (
                  <span className="rounded-full border border-green-400/30 bg-green-400/5 px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] text-green-400">
                    Locked ✓
                  </span>
                ) : (
                  <Button
                    size="sm"
                    disabled={lock.status === "running"}
                    onClick={() => handleLock(row.meetingRequestId)}
                  >
                    {lock.status === "running" ? "Locking…" : "Lock report"}
                  </Button>
                )}
              </div>
            </div>

            {lock.status === "error" && (
              <p className="mt-4 rounded border border-rust-400/30 bg-rust-400/5 px-4 py-3 text-[13px] text-rust-400">
                {lock.error}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
