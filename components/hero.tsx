import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/container";
import { Eyebrow } from "@/components/eyebrow";
import { HeroMockup } from "@/components/hero-mockup";

export function Hero() {
  return (
    <section className="py-20 md:py-28">
      <Container className="grid items-center gap-16 lg:grid-cols-2">
        <div className="animate-fade-up">
          <Eyebrow>Meeting minutes, attested</Eyebrow>
          <h1 className="mt-5 font-serif text-5xl leading-[1.08] tracking-[-0.02em] text-cream-100 md:text-[66px] md:leading-[1.08]">
            From recording
            <br />
            to record
            <span className="text-rust-400">.</span>
          </h1>
          <p className="mt-6 max-w-[520px] text-[17.5px] leading-[1.65] text-cream-300">
            Attesta turns raw meeting audio into signed, compliance-ready
            minutes — drafted by AI in minutes, then checked, corrected and
            locked by a specialist before anything enters the record.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <Button asChild>
              <Link href="/create">See the live preview</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/samples">Flip through a sample</Link>
            </Button>
          </div>

          <div className="mt-10 space-y-2">
            {[
              "France · CSE, CSSCT, HR, AG — live",
              "A person signs off on every report",
            ].map((line) => (
              <div key={line} className="flex items-center gap-2 text-[13.5px] text-cream-400">
                <span className="h-1.5 w-1.5 rounded-full bg-rust-400" />
                {line}
              </div>
            ))}
          </div>
        </div>

        <div className="animate-fade-up-delayed min-w-0">
          <HeroMockup />
        </div>
      </Container>
    </section>
  );
}
