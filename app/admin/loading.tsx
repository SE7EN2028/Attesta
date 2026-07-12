import { Nav } from "@/components/nav";
import { Container } from "@/components/container";

// Shown instantly on navigation to /admin while the server renders the (dynamic,
// DB-backed) page — so a click paints immediately instead of hanging on the
// previous page for the round-trip.
export default function Loading() {
  return (
    <>
      <Nav />
      <main className="min-h-screen bg-ink-900 py-16">
        <Container>
          <div className="animate-pulse space-y-4">
            <div className="h-4 w-24 rounded bg-cream-200/10" />
            <div className="mt-6 h-9 w-2/3 rounded bg-cream-200/10" />
            <div className="h-4 w-1/2 rounded bg-cream-200/5" />
            <div className="mt-10 space-y-4">
              <div className="h-28 rounded-md bg-cream-200/5" />
              <div className="h-28 rounded-md bg-cream-200/5" />
              <div className="h-28 rounded-md bg-cream-200/5" />
            </div>
          </div>
        </Container>
      </main>
    </>
  );
}
