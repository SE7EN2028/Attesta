export type SourceFileLink = {
  id: string;
  fileName: string;
  type: string;
  role: string;
};

// Renders download/preview links for a request's source files. Each points
// at /api/files/[id], which streams the file from disk (inline so
// audio/video/pdf preview in-browser; DOCX downloads).
export function SourceFileLinks({ files }: { files: SourceFileLink[] }) {
  if (files.length === 0) {
    return (
      <p className="font-mono text-[11px] text-cream-500">No source file</p>
    );
  }

  return (
    <div className="space-y-1.5">
      {files.map((f) => (
        <div key={f.id} className="flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-[0.08em] text-cream-500">
            {f.role === "PRIMARY_MEETING" ? "Primary" : "Support"} · {f.type}
          </span>
          <a
            href={`/api/files/${f.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="truncate font-mono text-[11px] text-rust-400 underline decoration-rust-400/30 underline-offset-2 transition-colors hover:text-rust-300 hover:decoration-rust-400"
          >
            {f.fileName}
          </a>
        </div>
      ))}
    </div>
  );
}
