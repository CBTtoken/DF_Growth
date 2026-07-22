import { Fraunces } from "next/font/google";
import { PixelConsentGate } from "@/components/landing/PixelConsentGate";
import { FbclidCapture } from "@/components/landing/FbclidCapture";
import { OwnerBarGate } from "@/components/landing/OwnerBarGate";
import { LeadForm } from "@/components/landing/LeadForm";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { Hero } from "./Hero";
import { ImpactSection } from "./ImpactSection";
import { FourPillars } from "./FourPillars";
import { Gallery } from "./Gallery";
import { GetInvolved } from "./GetInvolved";
import { HELPLIFT_BLUE, HELPLIFT_CREAM } from "./brand";
import type { CustomPageProps } from "@/lib/custom-pages/registry";

// Helplift Network Vaal Triangle — a hand-built custom page (same pattern as
// Buffelskop / Standing 365), per docs/HELPLIFT_CUSTOM_PAGE_SCOPE_CLAUDE.md.
// Warm humanist serif for headings only (Fraunces), exposed as a CSS
// variable the same way Buffelskop exposes Playfair — body copy stays in the
// app's default sans. The "human, not clinical" direction the brief asks for.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal"],
  variable: "--font-helplift-heading",
});

// Vanderbijlpark address, confirmed by Dewald (NOT the stale Sedgefield one
// from the legacy export). Kept here so the contact block and any future
// map read one source.
const HELPLIFT_ADDRESS = "Cnr. Arhbeck & Mollier St., Vanderbijlpark, 1900";

export function HelpliftPage({
  clientId,
  businessName,
  metaPixelId,
  landingPageId,
  contactEmail,
  callPhone,
  whatsappPhone,
}: CustomPageProps) {
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/helplift`;

  return (
    <main className={`${fraunces.variable} flex flex-1 flex-col`} style={{ backgroundColor: HELPLIFT_CREAM }}>
      <FbclidCapture />
      <OwnerBarGate growthClientId={clientId} />
      <Hero callPhone={callPhone} />
      <ScrollReveal>
        <ImpactSection />
      </ScrollReveal>
      <ScrollReveal>
        <FourPillars />
      </ScrollReveal>
      <ScrollReveal>
        <Gallery />
      </ScrollReveal>
      <ScrollReveal>
        <GetInvolved callPhone={callPhone} address={HELPLIFT_ADDRESS} />
      </ScrollReveal>
      <ScrollReveal>
        <LeadForm
          growthClientId={clientId}
          landingPageId={landingPageId}
          pageUrl={url}
          primaryColor={HELPLIFT_BLUE}
          contactEmail={contactEmail}
          callPhone={callPhone}
          whatsappPhone={whatsappPhone}
          websiteUrl={null}
          businessName={businessName}
        />
      </ScrollReveal>
      <PixelConsentGate pixelId={metaPixelId} />
    </main>
  );
}
