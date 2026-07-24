import type { Metadata } from "next";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { GetInTouchSection } from "@/components/marketing/GetInTouchSection";
import { createAdminClient } from "@/lib/supabase/admin";
import { Hero } from "@/components/home/Hero";
import { WhyChoose } from "@/components/home/WhyChoose";
import { HowItWorks } from "@/components/home/HowItWorks";
import { RealOnlinePower } from "@/components/home/RealOnlinePower";
import { SoundFamiliar } from "@/components/home/SoundFamiliar";
import { MostVisitedPages, SHOWCASE_SLUGS } from "@/components/home/MostVisitedPages";
import { HomePricing } from "@/components/home/HomePricing";
import { DoMore } from "@/components/home/DoMore";
import { WhatYouGet } from "@/components/home/WhatYouGet";
import { FinalCTA } from "@/components/home/FinalCTA";

// DigitalFlyer Growth's own home page. "/" permanent-redirects here, so this
// is the site's landing page. Redesigned 2026-07-24 from a Bolt design,
// ported into src/components/home/*. The real functional pieces (the header
// with its Meta-Pixel consent gate, the footer, the TierCard signup forms
// inside HomePricing, and the GetInTouch contact form) are reused, not
// rebuilt. Every home-page photo is centralised in src/lib/home/media.ts so
// images can be swapped without touching a component.
//
// Deliberately NOT rendered here yet (but kept in the codebase): the real
// featured-testimonials credibility block (HomepageCredibilitySection). The
// Bolt design has no social-proof section; adding one back is the most
// likely first tweak.

const PAGE_TITLE = "Build Your Presence. Grow Your Business.";
const PAGE_DESCRIPTION =
  "DigitalFlyer helps South African businesses build a professional online presence, connect with customers, generate leads and grow, all from one place.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: { title: PAGE_TITLE, description: PAGE_DESCRIPTION, url: "/pricing" },
  twitter: { title: PAGE_TITLE, description: PAGE_DESCRIPTION },
};

export const revalidate = 60;

export default async function PricingPage() {
  // Load the real captured screenshots for exactly the three curated
  // showcase pages (by their real slugs), so a card always shows the actual
  // page rather than depending on those pages topping the page-view ranking.
  const admin = createAdminClient();
  const { data: showcaseClients } = await admin
    .from("growth_clients")
    .select("slug, screenshot_path")
    .in("slug", SHOWCASE_SLUGS);
  const screenshotsBase = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/client-screenshots`;
  const screenshots: Record<string, string> = {};
  for (const c of showcaseClients ?? []) {
    if (c.screenshot_path) screenshots[c.slug] = `${screenshotsBase}/${c.screenshot_path}`;
  }

  return (
    <main className="flex flex-1 flex-col">
      <MarketingHeader />
      <Hero />
      <WhyChoose />
      <HowItWorks />
      <RealOnlinePower />
      <SoundFamiliar />
      <MostVisitedPages screenshots={screenshots} />
      <HomePricing />
      <DoMore />
      <WhatYouGet />
      <FinalCTA />
      <GetInTouchSection />
      <SiteFooter />
    </main>
  );
}
