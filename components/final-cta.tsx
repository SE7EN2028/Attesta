import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/container";

export function FinalCta() {
  return (
    <section className="border-t border-cream-200/10 py-24 md:py-32">
      <Container className="text-center">
        <h2 className="mx-auto max-w-2xl font-serif text-3xl leading-[1.15] text-cream-100 md:text-[44px]">
          Raw recordings in.
          <br />
          Signed minutes out.
        </h2>
        <p className="mx-auto mt-6 max-w-lg text-[17px] leading-[1.65] text-cream-300">
          The preview is instant and free. The report is human-checked,
          locked, and yours for the record — delivered in 1–2 hours.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button asChild>
            <Link href="/create">Start with the live preview</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/samples">Flip the sample first</Link>
          </Button>
        </div>
      </Container>
    </section>
  );
}
