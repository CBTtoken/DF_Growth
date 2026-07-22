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
import { Infographic } from "./Infographic";
import { GetInvolved } from "./GetInvolved";
import { PartnershipSection } from "./PartnershipSection";
import { HELPLIFT_BLUE, HELPLIFT_CREAM } from "./brand";
import type { CustomPageProps } from "@/lib/custom-pages/registry";

// Helplift Network Vaal Triangle — a hand-built custom page (same pattern as
// Buffelskop / Standing 365), per docs/HELPLIFT_CUSTOM_PAGE_SCOPE_CLAUDE.md.
// Warm humanist serif for headings only (Fraunces), exposed as a CSS
// variable the same way Buffelskop exposes Playfair — body copy stays in the
// app's default sans. The "human, not clinical" direction the brief asks for.
//
// Emotional arc: name the challenge (hero) -> the difference made (impact)
// -> how (pillars) -> proof (gallery + infographic) -> get involved -> the
// DigitalFlyer give-back partnership at the very bottom.
const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal"],
  variable: "--font-helplift-heading",
});

// Vanderbijlpark address, confirmed by Dewald (NOT the stale Sedgefield one
// from the legacy export).
const HELPLIFT_ADDRESS = "Cnr. Arhbeck & Mollier St. (ERHA bldg), CE6, Vanderbijlpark, 1900";

export function HelpliftPage({
  clientId,
  businessName,
  metaPixelId,
  landingPageId,
  contactEmail,
  callPhone,
  whatsappPhone,
  photos,
  photosStorageBase,
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
        <Gallery photos={photos} storageBase={photosStorageBase} />
      </ScrollReveal>
      <ScrollReveal>
        <Infographic />
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
      <ScrollReveal>
        <PartnershipSection />
      </ScrollReveal>
      <PixelConsentGate pixelId={metaPixelId} />
    </main>
  );
}
