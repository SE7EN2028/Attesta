import { Nav } from "@/components/nav";
import { Container } from "@/components/container";

// Instant paint on navigation to /try while the server renders the (cookie-
// dependent, dynamic) page — avoids the click hanging on the previous page.
export default function Loading() {
  return (
    <>
      <Nav />
      <main className="min-h-screen bg-ink-900 py-16">
        <Container>
          <div className="mx-auto max-w-2xl animate-pulse space-y-4">
            <div className="h-4 w-28 rounded bg-cream-200/10" />
            <div className="mt-6 h-9 w-3/4 rounded bg-cream-200/10" />
            <div className="h-4 w-1/2 rounded bg-cream-200/5" />
            <div className="mt-10 h-64 rounded-md bg-cream-200/5" />
          </div>
        </Container>
      </main>
    </>
  );
}
