import { PixelConsentGate } from "@/components/landing/PixelConsentGate";
import { FbclidCapture } from "@/components/landing/FbclidCapture";
import { OwnerBarGate } from "@/components/landing/OwnerBarGate";
import { Hero } from "@/components/custom-pages/rebiz-nomads/Hero";
import { About } from "@/components/custom-pages/rebiz-nomads/About";
import { Benefits } from "@/components/custom-pages/rebiz-nomads/Benefits";
import { Closing } from "@/components/custom-pages/rebiz-nomads/Closing";
import type { CustomPageProps } from "@/lib/custom-pages/registry";

// Second real instance of the custom-page-type mechanism (see
// Standing365Page.tsx for the first) — pasted content from the existing
// rebiz.digitalflyer.co.za page, laid out fresh rather than ported
// wall-for-wall, per "feel free to edit as you see fit." Uses Growth's own
// brand tokens directly (no bespoke palette/typeface) since this is
// explicitly framed as part of the membership itself, not a standalone
// product with its own identity the way Standing 365's book is.
export function RebizNomadsPage({ clientId, metaPixelId }: CustomPageProps) {
  return (
    <main className="flex flex-1 flex-col">
      <FbclidCapture />
      <OwnerBarGate growthClientId={clientId} />
      <Hero />
      <About />
      <Benefits />
      <Closing />
      <PixelConsentGate pixelId={metaPixelId} />
    </main>
  );
}
