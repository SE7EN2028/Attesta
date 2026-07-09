import { promises as fs } from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

// Uploaded source files live on disk under <cwd>/uploads/... and are NOT in
// Next's public/ dir, so their /uploads/... storageUrls aren't served
// statically. This route streams a SourceFile by id for admin preview /
// download. Keyed by id (not a raw path) so callers can't traverse the
// filesystem; we still re-verify the resolved path stays inside uploads/.

const CONTENT_TYPE_BY_EXTENSION: Record<string, string> = {
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".m4a": "audio/mp4",
  ".mp4": "video/mp4",
  ".pdf": "application/pdf",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const sourceFile = await prisma.sourceFile.findUnique({
    where: { id: params.id },
  });
  if (!sourceFile) {
    return new Response("Not found", { status: 404 });
  }

  // Only local uploads are on disk. Seed rows carry external
  // https://storage.attesta.example/... placeholders that were never
  // written locally — nothing to stream.
  if (!sourceFile.storageUrl.startsWith("/uploads/")) {
    return new Response("File is not available for local download.", {
      status: 404,
    });
  }

  const uploadsRoot = path.join(process.cwd(), "uploads");
  const absolutePath = path.resolve(
    process.cwd(),
    "." + sourceFile.storageUrl // "/uploads/a/b/c" -> "./uploads/a/b/c"
  );
  if (
    absolutePath !== uploadsRoot &&
    !absolutePath.startsWith(uploadsRoot + path.sep)
  ) {
    return new Response("Invalid file path.", { status: 400 });
  }

  let data: Buffer;
  try {
    data = await fs.readFile(absolutePath);
  } catch {
    return new Response("File missing from storage.", { status: 404 });
  }

  const extension = path.extname(sourceFile.fileName).toLowerCase();
  const contentType =
    CONTENT_TYPE_BY_EXTENSION[extension] ?? "application/octet-stream";

  // inline so audio/video/pdf preview in the browser; DOCX (and unknown
  // types) will download. RFC 5987 filename* handles non-ASCII names.
  const asciiName = sourceFile.fileName.replace(/[^\x20-\x7e]/g, "_");
  const encodedName = encodeURIComponent(sourceFile.fileName);

  return new Response(new Uint8Array(data), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(data.length),
      "Content-Disposition": `inline; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
      "Cache-Control": "private, no-store",
    },
  });
}
