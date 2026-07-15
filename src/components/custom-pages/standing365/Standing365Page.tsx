import { Source_Serif_4 } from "next/font/google";
import { PixelConsentGate } from "@/components/landing/PixelConsentGate";
import { FbclidCapture } from "@/components/landing/FbclidCapture";
import { OwnerBarGate } from "@/components/landing/OwnerBarGate";
import { Hero } from "@/components/custom-pages/standing365/Hero";
import { About } from "@/components/custom-pages/standing365/About";
import { TwelveMonths } from "@/components/custom-pages/standing365/TwelveMonths";
import { OwnACopy } from "@/components/custom-pages/standing365/OwnACopy";
import { Closing } from "@/components/custom-pages/standing365/Closing";
import { BookSchema } from "@/components/custom-pages/standing365/BookSchema";
import { OrderReturnBanner } from "@/components/custom-pages/standing365/OrderReturnBanner";
import type { CustomPageProps } from "@/lib/custom-pages/registry";

// STANDING365_LANDING_BUILD_SPEC_CLAUDE.md Sec 4: full custom code, hand
// built sections, freeform editorial layout — deliberately not composed
// from the standard template section components in components/landing/,
// which are built for generic per-client data, not this book's own fixed
// content and brand.
//
// Brand tokens pulled from the existing live page
// (standing365.digitalflyer.co.za) rather than guessed: its btn-primary
// background is rgb(184, 131, 42) (#B8832A, warm gold), used there against
// rgb(22, 33, 62) (#16213E, deep navy) text, with rgb(46, 42, 34) (#2E2A22,
// warm charcoal) as its body text color and "Source Serif 4" as its body
// typeface. Applied as a starting direction per the spec's own
// instruction — still needs Dewald's confirmation before Sprint 1 styling
// is treated as final.
// Exposed as a CSS variable (matching layout.tsx's own pattern for Geist
// and Barlow Condensed) rather than applied via .className directly — this
// page still needs its small-caps labels in the app's default sans font,
// only headlines and pull-quotes switch to serif, so both need to coexist
// rather than one blanket override.
const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-s365-serif",
});

export function Standing365Page({ clientId, metaPixelId }: CustomPageProps) {
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/standing-365`;

  return (
    <main className={`${sourceSerif.variable} flex flex-1 flex-col`}>
      <BookSchema url={url} />
      <FbclidCapture />
      {/* Real feedback, round two: this rendered correctly but sat after
          Closing (the footer) in the previous version, meaning it rendered
          at the very bottom of the page — effectively invisible without
          scrolling all the way down. OwnerBar has no fixed/sticky
          positioning of its own; it only ever reads as a real top bar
          because of where it sits in the DOM, exactly like it does on
          every other Growth page via ClientLandingPageView. Moved first,
          matching that placement precisely, not just present somewhere. */}
      <OwnerBarGate growthClientId={clientId} />
      <OrderReturnBanner />
      <Hero />
      <About />
      <TwelveMonths />
      <OwnACopy clientId={clientId} />
      <Closing />
      <PixelConsentGate pixelId={metaPixelId} />
    </main>
  );
}
