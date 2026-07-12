import Link from "next/link";
import { Button } from "@/components/ui/button";

export type PastRequest = {
  id: string;
  title: string;
  company: string;
  meetingDate: string; // ISO date
  status: string; // MeetingRequest.status
  reportId: string | null;
  reportStatus: string | null; // "DRAFT" | "LOCKED" | null
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
}

export function PastRequestsList({ requests }: { requests: PastRequest[] }) {
  if (requests.length === 0) {
    return (
      <p className="mt-10 text-[15px] leading-relaxed text-cream-400">
        You haven&apos;t submitted any requests yet. Switch to{" "}
        <span className="text-cream-200">Create your report</span> to send your
        first one.
      </p>
    );
  }

  return (
    <div className="mt-8 space-y-4">
      <p className="max-w-xl text-[14.5px] leading-relaxed text-cream-300">
        Every report request tied to your email, newest first. A specialist
        reviews each one; when a report is finalized it&apos;s emailed to you and
        opens right here.
      </p>

      {requests.map((r) => {
        // A report is only visible to the client once it's locked (finalized).
        const ready = r.reportStatus === "LOCKED" && r.reportId;
        const sent = r.status === "DISPATCHED";
        const badge = sent ? "Sent to your email" : ready ? "Ready" : "In review";
        const badgeClass = ready
          ? "border-green-400/30 bg-green-400/5 text-green-400"
          : "border-gold-400/30 bg-gold-400/10 text-gold-400";

        return (
          <div
            key={r.id}
            className="rounded-md border border-cream-200/10 bg-ink-850 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h3 className="font-serif text-lg text-cream-100">{r.title}</h3>
                <p className="mt-1 text-[13px] text-cream-400">
                  {r.company} · {formatDate(r.meetingDate)}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <span
                  className={`rounded-full border px-3 py-1 font-mono text-[10.5px] uppercase tracking-[0.08em] ${badgeClass}`}
                >
                  {badge}
                </span>
                {ready && (
                  <Button asChild size="sm">
                    <Link href={`/report/${r.reportId}`}>Open report</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
