import Image from "next/image";
import Link from "next/link";
import { HOME_IMAGES } from "@/lib/home/media";

// "What you get", per the split handoff: three plain items, each with a
// real screenshot, describing what the member ends up holding, not feature
// names. Every image is real: Buffelskop's live page and the live
// marketplace (captured 4 Aug 2026, after the custom-page fix restored the
// right Buffelskop render), and Dewald's own dashboard screenshot with the
// week's genuine numbers. Sources live in HOME_IMAGES so they can be
// swapped without touching this component.
const items = [
  {
    image: HOME_IMAGES.whatYouGetPage,
    title: "A page customers actually find",
    body: "Your services, prices, photos and contact details on one professional page, at your own link, ready for Google and WhatsApp.",
    link: null as { href: string; label: string } | null,
  },
  {
    image: HOME_IMAGES.whatYouGetDashboard,
    title: "Enquiries that come to you",
    body: "When a customer fills in your contact form, it lands in your dashboard and your inbox. You reply, you win the job.",
    link: null,
  },
  {
    image: HOME_IMAGES.whatYouGetMarketplace,
    title: "A spot on the marketplace",
    body: "Your business listed on the DigitalFlyer marketplace, where customers browse and compare local businesses.",
    link: { href: "/marketplace", label: "Browse the marketplace" },
  },
];

export function WhatYouGetHome() {
  return (
    <section className="bg-neutral-light py-10 lg:py-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 lg:mb-8">
          <p className="section-eyebrow">What You Get</p>
          <h2 className="section-heading text-2xl lg:text-3xl">What You End Up Holding</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
          {items.map((item) => (
            <div
              key={item.title}
              className="bg-white border border-neutral-border rounded-2xl overflow-hidden shadow-card flex flex-col"
            >
              <Image
                src={item.image.src}
                alt={item.image.alt}
                width={item.image.width}
                height={item.image.height}
                sizes="(max-width: 768px) 100vw, 33vw"
                className="w-full border-b border-neutral-border"
              />
              <div className="p-5">
                <h3 className="text-sm font-bold text-neutral-ink mb-1.5">{item.title}</h3>
                <p className="text-sm text-neutral-mid leading-relaxed">{item.body}</p>
                {item.link ? (
                  <Link
                    href={item.link.href}
                    className="mt-2 inline-block text-sm font-bold text-brand-blue hover:text-brand-blue-dark transition-colors"
                  >
                    {item.link.label} →
                  </Link>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
