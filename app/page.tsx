import { Nav } from "@/components/nav";
import { HashScroll } from "@/components/hash-scroll";
import { Hero } from "@/components/hero";
import { ProblemSection } from "@/components/problem-section";
import { HowItWorks } from "@/components/how-it-works";
import { LivePreviewSection } from "@/components/live-preview-section";
import { TiersSection } from "@/components/tiers-section";
import { ReviewProcess } from "@/components/review-process";
import { AuditSection } from "@/components/audit-section";
import { AssistantSection } from "@/components/assistant-section";
import { SampleReportSection } from "@/components/sample-report-section";
import { TrustSecurity } from "@/components/trust-security";
import { WhoItsFor } from "@/components/who-its-for";
import { FinalCta } from "@/components/final-cta";
import { Footer } from "@/components/footer";

// SampleReportSection reads the DB (the pinned sample). Render per-request so it
// reflects the live DB, not a stale build-time snapshot.
export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <>
      <HashScroll />
      <Nav />
      <main>
        <Hero />
        <ProblemSection />
        <HowItWorks />
        <LivePreviewSection />
        <TiersSection />
        <ReviewProcess />
        <AuditSection />
        <AssistantSection />
        <SampleReportSection />
        <TrustSecurity />
        <WhoItsFor />
        <FinalCta />
      </main>
      <Footer />
    </>
  );
}
