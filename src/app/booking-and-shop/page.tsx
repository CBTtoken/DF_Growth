import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarCheck, ShoppingCart } from "lucide-react";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { HOME_IMAGES } from "@/lib/home/media";

// Home page split handoff, 4 August 2026: the booking and shop detail
// moves off the front page onto a page of its own. The copy is the front
// page's own, kept whole, with a short intro so the page does not start
// mid-thought.

const PAGE_TITLE = "Booking & Shop";
const PAGE_DESCRIPTION =
  "Take bookings and sell products straight from your DigitalFlyer page: a real calendar with live availability, and a product catalog with stock tracking.";

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/booking-and-shop" },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: "/booking-and-shop",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "DigitalFlyer SA" }],
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    images: ["/opengraph-image"],
  },
};

export const revalidate = 3600;

const tools = [
  {
    icon: CalendarCheck,
    title: "Booking",
    body: "A real appointment, rental, or slot calendar built into your page. Visitors see live availability and book directly, no double-bookings, no back-and-forth messaging.",
    detail:
      "Set your own available days and times, take appointments, rentals or slots, and see every booking in your dashboard. Works for salons, guesthouses, trades, tutors, anyone who works by appointment.",
  },
  {
    icon: ShoppingCart,
    title: "Shop",
    body: "A product catalog and cart built into your page. Add products one at a time or upload many at once, with real stock tracking so you never oversell.",
    detail:
      "Customers browse, add to cart and order right on your page. You manage products, stock and orders from your dashboard, no separate shop platform to pay for or learn.",
  },
];

export default function BookingAndShopPage() {
  const img = HOME_IMAGES.doMore;

  return (
    <main className="flex flex-1 flex-col">
      <MarketingHeader />

      <section className="bg-gradient-to-br from-brand-blue-light via-white to-white pt-12 pb-8 lg:pt-16 lg:pb-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-center">
            <div>
              <p className="section-eyebrow">Built-in Tools</p>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-neutral-ink tracking-tight">
                Do More With Your Page
              </h1>
              <p className="mt-3 text-base text-neutral-mid leading-relaxed">
                Your DigitalFlyer page can do more than tell people about you. With the Growth plan,
                it can take the booking and make the sale too, no separate setup, no separate login.
              </p>
            </div>
            <div className="relative rounded-2xl overflow-hidden shadow-card-hover aspect-[16/9]">
              <Image src={img.src} alt={img.alt} fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-10 lg:py-14">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
            {tools.map((tool) => {
              const Icon = tool.icon;
              return (
                <div key={tool.title} className="bg-white border border-neutral-border rounded-2xl p-6 shadow-card">
                  <div className="w-11 h-11 rounded-xl bg-brand-blue flex items-center justify-center mb-3">
                    <Icon size={22} className="text-white" strokeWidth={1.75} />
                  </div>
                  <h2 className="text-lg font-bold text-neutral-ink mb-2">{tool.title}</h2>
                  <p className="text-sm text-neutral-mid leading-relaxed">{tool.body}</p>
                  <p className="mt-2 text-sm text-neutral-mid leading-relaxed">{tool.detail}</p>
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-sm text-neutral-mid">
            Switch either one on any time from your dashboard.{" "}
            <Link href="/faq#booking-shop" className="font-bold text-brand-blue hover:text-brand-blue-dark transition-colors">
              See the full FAQ →
            </Link>
          </p>
        </div>
      </section>

      <section className="bg-brand-blue py-10 lg:py-12">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-white font-extrabold text-2xl leading-tight">
            Ready to take bookings and orders?
          </h2>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <Link href="/pricing#pricing" className="btn-accent-lg">
              See Pricing &amp; Join
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-white/40 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              Back to the home page
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
