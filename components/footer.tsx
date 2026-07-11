import Link from "next/link";
import { Container } from "@/components/container";

const productLinks = [
  { href: "#how-it-works", label: "How it works" },
  { href: "#live-preview", label: "Live preview" },
  { href: "#sample-report", label: "Sample report" },
];

const trustLinks = [
  { href: "#security", label: "Security & audit trail" },
  { href: "#audit", label: "The compliance audit" },
  { href: "#assistant", label: "The assistant" },
];

export function Footer() {
  return (
    <footer className="border-t border-cream-200/10 py-16">
      <Container>
        <div className="grid gap-12 md:grid-cols-[1.5fr_1fr_1fr]">
          <div>
            <Link href="/" className="font-serif text-2xl text-cream-100">
              Attesta
              <span className="text-rust-400">.</span>
            </Link>
            <p className="mt-4 max-w-xs text-[13.5px] leading-relaxed text-cream-400">
              AI-fast drafting, human sign-off. Meeting minutes that hold up
              as a legal record.
            </p>
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-cream-500">
              Product
            </p>
            <ul className="mt-4 space-y-2">
              {productLinks.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="text-[13.5px] text-cream-300 hover:text-cream-100"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-cream-500">
              Trust
            </p>
            <ul className="mt-4 space-y-2">
              {trustLinks.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    className="text-[13.5px] text-cream-300 hover:text-cream-100"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-3 border-t border-cream-200/10 pt-6 font-mono text-[11px] uppercase tracking-[0.06em] text-cream-500 sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Attesta · France (CSE) live — more regions coming</p>
          <div className="flex items-center gap-5">
            <p>Encrypted at rest &amp; in transit</p>
            {/* Internal operator link — not a customer-facing CTA. */}
            <Link href="/admin" className="text-cream-500 hover:text-rust-400">
              Admin
            </Link>
          </div>
        </div>
      </Container>
    </footer>
  );
}
