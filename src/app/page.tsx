import type { Metadata } from "next";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { GetInTouchSection } from "@/components/marketing/GetInTouchSection";
import { createAdminClient } from "@/lib/supabase/admin";
import { HomeHero } from "@/components/home/HomeHero";
import { SoundFamiliar } from "@/components/home/SoundFamiliar";
import { WhatYouGetHome } from "@/components/home/WhatYouGetHome";
import { KatisoBizFree } from "@/components/home/KatisoBizFree";
import { PlansTeaser } from "@/components/home/PlansTeaser";
import { BuildItForMe } from "@/components/home/BuildItForMe";
import { MostVisitedPages, SHOWCASE_SLUGS } from "@/components/home/MostVisitedPages";
import { FinalCTA } from "@/components/home/FinalCTA";

// The home page, at "/" where a home page belongs. Home page split handoff,
// 4 August 2026: until then "/" permanent-redirected to /pricing, so the
// brand's front door was a URL that says "pricing" and the one page did
// five jobs at once. This page has one job: start a free trial. Everything
// else moved to the page where it belongs (see the handoff report for the
// full map), and nothing was deleted.
//
// Section order is the handoff's, verbatim: hero, Sound Familiar, what you
// get, KatisoBiz free, the two plans, build-it-for-me, real member pages,
// one closing call to action, the contact form. Nothing else.

const PAGE_TITLE = "Build Your Presence. Grow Your Business.";
const PAGE_DESCRIPTION =
  "DigitalFlyer helps South African businesses build a professional online presence, connect with customers, generate leads and grow, all from one place.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/" },
  // Overriding openGraph replaces the root layout's block wholesale, images
  // included, so everything is restated rather than inherited. Same lesson
  // as the 28 July site audit on the old front page.
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: "/",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "DigitalFlyer SA" }],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export const revalidate = 60;

export default async function HomePage() {
  // Real captured screenshots for the three curated showcase pages, same
  // mechanism the old front page used.
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
      <HomeHero />
      <SoundFamiliar />
      <WhatYouGetHome />
      <KatisoBizFree />
      <PlansTeaser />
      <section className="bg-white py-10 lg:py-14 border-b border-neutral-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <BuildItForMe href="/pricing#pricing" />
        </div>
      </section>
      <MostVisitedPages screenshots={screenshots} ctaHref="/pricing#pricing" />
      <FinalCTA href="/pricing#pricing" />
      <GetInTouchSection />
      <SiteFooter />
    </main>
  );
}
