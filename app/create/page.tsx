import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE } from "@/lib/session";
import { Nav } from "@/components/nav";
import { CreateFlow } from "@/components/create-flow";

export default async function CreatePage() {
  const userId = cookies().get(SESSION_COOKIE)?.value;
  const user = userId
    ? await prisma.user.findUnique({ where: { id: userId } })
    : null;

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
        />
      </main>
    </>
  );
}
