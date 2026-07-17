import { PixelConsentGate } from "@/components/landing/PixelConsentGate";
import { FbclidCapture } from "@/components/landing/FbclidCapture";
import { OwnerBarGate } from "@/components/landing/OwnerBarGate";
import { LeadForm } from "@/components/landing/LeadForm";
import { Hero } from "@/components/custom-pages/rebiz-nomads/Hero";
import { About } from "@/components/custom-pages/rebiz-nomads/About";
import { Benefits } from "@/components/custom-pages/rebiz-nomads/Benefits";
import { FacebookGroups } from "@/components/custom-pages/rebiz-nomads/FacebookGroups";
import { Closing } from "@/components/custom-pages/rebiz-nomads/Closing";
import type { CustomPageProps } from "@/lib/custom-pages/registry";

// Second real instance of the custom-page-type mechanism (see
// Standing365Page.tsx for the first) — pasted content from the existing
// rebiz.digitalflyer.co.za page, laid out fresh rather than ported
// wall-for-wall, per "feel free to edit as you see fit." Uses Growth's own
// brand tokens directly (no bespoke palette/typeface) since this is
// explicitly framed as part of the membership itself, not a standalone
// product with its own identity the way Standing 365's book is.
//
// Real feedback round two: reuses LeadForm.tsx (the exact same contact
// form every templated client page already has) rather than building a
// second, custom-page-specific one — a WhatsApp-only CTA with no form was
// a genuine gap, not a stylistic choice.
//
// whatsappPhone is deliberately null here, not
// process.env.NEXT_PUBLIC_WHATSAPP_NUMBER — RE:Biz membership comes
// bundled with paid Growth/Foundation membership, not a separate WhatsApp
// inquiry. Closing.tsx already replaced this page's original "Message Us
// on WhatsApp to Join" CTAs with a real path to /pricing for exactly that
// reason; wiring a WhatsApp option back in through this form's post-submit
// contact-details reveal would quietly reintroduce the same thing.
export function RebizNomadsPage({ clientId, businessName, metaPixelId, landingPageId, contactEmail }: CustomPageProps) {
  const pageUrl = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/rebiz`;

  return (
    <main className="flex flex-1 flex-col">
      <FbclidCapture />
      <OwnerBarGate growthClientId={clientId} />
      <Hero />
      <About />
      <Benefits />
      <FacebookGroups />
      <LeadForm
        growthClientId={clientId}
        landingPageId={landingPageId}
        pageUrl={pageUrl}
        primaryColor="#1081b8"
        contactEmail={contactEmail}
        callPhone={null}
        whatsappPhone={null}
        websiteUrl={null}
        businessName={businessName}
      />
      <Closing />
      <PixelConsentGate pixelId={metaPixelId} />
    </main>
  );
}
