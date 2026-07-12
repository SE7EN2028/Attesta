import { prisma } from "@/lib/prisma";
import { getSessionUserId } from "@/lib/session";
import { Nav } from "@/components/nav";
import { CreateFlow } from "@/components/create-flow";
import type { PastRequest } from "@/components/past-requests";

// Reads the signed-in user's own requests — render per-request so statuses
// (in review → ready → sent) reflect the latest without a redeploy.
export const dynamic = "force-dynamic";

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ auth?: string }>;
}) {
  const { auth } = await searchParams;
  const userId = getSessionUserId();
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : null;

  // The signed-in user's own submitted requests, newest first, with the report
  // status so the client can see "in review" vs a finalized, openable report.
  const pastRequests: PastRequest[] = userId
    ? (
        await prisma.meetingRequest.findMany({
          where: { userId, status: { not: "DRAFT" } },
          include: { report: { select: { id: true, status: true } } },
          orderBy: { createdAt: "desc" },
        })
      ).map((mr) => ({
        id: mr.id,
        title: mr.title,
        company: mr.company,
        meetingDate: mr.meetingDate.toISOString(),
        status: mr.status,
        reportId: mr.report?.id ?? null,
        reportStatus: mr.report?.status ?? null,
      }))
    : [];

  return (
    <>
      <Nav />
      <main className="min-h-screen bg-ink-900 py-16">
        <CreateFlow
          initialUser={
            user
              ? { id: user.id, email: user.email, companyName: user.companyName }
              : null
          }
          pastRequests={pastRequests}
          authError={auth}
        />
      </main>
    </>
  );
}
