"use client";

import { Navbar } from "@/components/landing/navbar";
import { Hero } from "@/components/landing/hero";
import { TrustedBy } from "@/components/landing/trusted-by";
import { Features } from "@/components/landing/features";
import { HowItWorks } from "@/components/landing/how-it-works";
// import { LiveMetrics } from '@/components/landing/live-metrics';
import { SupportedChains } from "@/components/landing/supported-chains";
import { CtaSection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background dark">
      <Navbar />
      <main>
        <Hero />
        <TrustedBy />
        <Features />
        <HowItWorks />
        {/* <LiveMetrics /> */}
        <SupportedChains />
        <CtaSection />
        <Footer />
      </main>
    </div>
  );
}
