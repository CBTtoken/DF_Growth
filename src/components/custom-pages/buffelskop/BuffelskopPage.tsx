import { Playfair_Display } from "next/font/google";
import { PixelConsentGate } from "@/components/landing/PixelConsentGate";
import { FbclidCapture } from "@/components/landing/FbclidCapture";
import { OwnerBarGate } from "@/components/landing/OwnerBarGate";
import { LeadForm } from "@/components/landing/LeadForm";
import { ScrollReveal } from "@/components/landing/ScrollReveal";
import { Hero } from "@/components/custom-pages/buffelskop/Hero";
import { NatureSection } from "@/components/custom-pages/buffelskop/NatureSection";
import { Gallery } from "@/components/custom-pages/buffelskop/Gallery";
import { ChooseYourGrind } from "@/components/custom-pages/buffelskop/ChooseYourGrind";
import { BulkBanner } from "@/components/custom-pages/buffelskop/BulkBanner";
import { Pricing } from "@/components/custom-pages/buffelskop/Pricing";
import { FinalCta } from "@/components/custom-pages/buffelskop/FinalCta";
import { BuffelskopSchema } from "@/components/custom-pages/buffelskop/BuffelskopSchema";
import type { CustomPageProps } from "@/lib/custom-pages/registry";

// A real, hand-built premium build (Dewald's own brief) — deliberately not
// composed from the standard template section components, the same
// reasoning Standing365Page.tsx used: this brand's own rustic kraft-paper
// and hand-drawn-logo identity doesn't fit the generic per-client template
// system. Exposed as a CSS variable (matching Standing365's own
// --font-s365-serif pattern) since body copy stays in the app's default
// sans throughout, only headings switch to this warmer premium serif.
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-buffelskop-serif",
});

export function BuffelskopPage({
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
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/buffelskop`;

  return (
    <main className={`${playfair.variable} flex flex-1 flex-col bg-[#F8F1E4]`}>
      <BuffelskopSchema url={url} />
      <FbclidCapture />
      <OwnerBarGate growthClientId={clientId} />
      <Hero />
      <ScrollReveal>
        <NatureSection />
      </ScrollReveal>
      <ScrollReveal>
        <Gallery photos={photos} storageBase={photosStorageBase} />
      </ScrollReveal>
      <ScrollReveal>
        <ChooseYourGrind />
      </ScrollReveal>
      <ScrollReveal>
        <BulkBanner />
      </ScrollReveal>
      <ScrollReveal>
        <Pricing />
      </ScrollReveal>
      <ScrollReveal>
        <LeadForm
          growthClientId={clientId}
          landingPageId={landingPageId}
          pageUrl={url}
          primaryColor="#A62F1D"
          contactEmail={contactEmail}
          callPhone={callPhone}
          whatsappPhone={whatsappPhone}
          websiteUrl={null}
          businessName={businessName}
        />
      </ScrollReveal>
      <FinalCta callPhone={callPhone} contactEmail={contactEmail} />
      <PixelConsentGate pixelId={metaPixelId} />
    </main>
  );
}
