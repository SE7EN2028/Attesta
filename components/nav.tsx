import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/container";
import { ScrollProgress } from "@/components/scroll-progress";

// Root-relative hashes so the nav works from any route (e.g. /create, /try),
// not just the homepage — clicking routes to "/" and scrolls to the section.
const links = [
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#live-preview", label: "Live preview" },
  { href: "/#audit", label: "The audit" },
  { href: "/#sample-report", label: "Sample report" },
  { href: "/#security", label: "Security" },
];

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-cream-200/10 bg-ink-900/90 backdrop-blur">
      <Container className="flex h-20 items-center justify-between">
        <Link href="/" className="font-serif text-2xl text-cream-100">
          Attesta
          <span className="text-rust-400">.</span>
        </Link>

        <nav className="hidden items-center gap-8 lg:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-mono text-[13px] uppercase tracking-[0.1em] text-cream-300 transition-colors hover:text-cream-100"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {/* Internal/operator entry — muted outline, not a customer CTA. */}
          <Button asChild size="sm" variant="outline">
            <Link href="/admin">Admin panel</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/create">Try the preview</Link>
          </Button>
        </div>
      </Container>
      <ScrollProgress />
    </header>
  );
}
