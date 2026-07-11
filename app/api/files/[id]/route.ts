import { prisma } from "@/lib/prisma";

// SourceFile bytes live in Vercel Blob (public https URL in storageUrl). This
// route resolves a SourceFile by id and redirects to its Blob URL for admin
// preview / download — keyed by id (not a raw path) so callers can't enumerate
// storage. Legacy rows with a local "/uploads/..." storageUrl (pre-Blob) are
// no longer downloadable on serverless and return 404.
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

  if (!/^https?:\/\//.test(sourceFile.storageUrl)) {
    return new Response("File is not available for download.", { status: 404 });
  }

  return Response.redirect(sourceFile.storageUrl, 302);
}
