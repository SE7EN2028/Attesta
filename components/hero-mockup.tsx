import { WaveMerge } from "@/components/wave-merge";
import { FlipBook } from "@/components/flip-book";

export function HeroMockup() {
  return (
    <div>
      <WaveMerge mode="merge" className="block h-[150px] w-full" />
      <p className="mb-4 mt-2.5 text-center font-mono text-[10.5px] uppercase tracking-[0.13em] text-cream-500">
        48:12 raw audio · 4 speakers &nbsp;→&nbsp; 9 pages, signed &amp; locked
      </p>
      <div className="mx-auto max-w-[560px]">
        <FlipBook sample="hero" chrome="light" />
      </div>
    </div>
  );
}
