import type { Metadata } from "next";
import Link from "next/link";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HomePricing } from "@/components/home/HomePricing";
import { WhyChoose } from "@/components/home/WhyChoose";

// The pricing page, and only the pricing page. Home page split handoff,
// 4 August 2026: this URL used to be the site's entire front page doing
// five jobs at once; the home page now lives at "/" and this page keeps
// the existing URL (so nothing already shared breaks) and receives the
// full detail: both plans with every inclusion, the monthly and annual
// toggle inside the cards, the build-it-for-me offer, the Enterprise line,
// the terms checkboxes and marketing opt-in inside the signup forms, and a
// link to the FAQ.

const PAGE_TITLE = "Pricing";
const PAGE_DESCRIPTION =
  "DigitalFlyer Growth plans in plain language: Foundation from R100 a month, Growth from R180 a month, both starting with a free 7-day trial, no card required.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: "/pricing",
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

export default function PricingPage() {
  return (
    <main className="flex flex-1 flex-col">
      <MarketingHeader />

      <section className="bg-gradient-to-br from-brand-blue-light via-white to-white pt-12 pb-2 lg:pt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-ink tracking-tight">
            Pricing
          </h1>
          <p className="mt-2 max-w-xl text-base text-neutral-mid leading-relaxed">
            Two plans, every inclusion spelled out, and a free 7-day trial to start, no card
            required.{" "}
            <Link href="/" className="font-bold text-brand-blue hover:text-brand-blue-dark transition-colors">
              New here? Start on the home page →
            </Link>
          </p>
        </div>
      </section>

      <HomePricing />
      <WhyChoose />

      <section className="bg-neutral-light py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-sm text-neutral-mid">
            Questions about trials, billing, cancelling, booking or the shop?{" "}
            <Link href="/faq" className="font-bold text-brand-blue hover:text-brand-blue-dark transition-colors">
              Read the FAQ →
            </Link>
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
