import Link from "next/link";
import { ImageIcon } from "lucide-react";

// "What you get", per the split handoff: three plain items, each with a
// real screenshot, describing what the member ends up holding, not feature
// names. The screenshots are Dewald's to take on his phone (a member page,
// a dashboard, a KatisoBiz quote); until they exist the frames below are
// visibly placeholders, never a mockup with invented numbers in it.
const items = [
  {
    title: "A page customers actually find",
    body: "Your services, prices, photos and contact details on one professional page, at your own link, ready for Google and WhatsApp.",
    shot: null as string | null,
    shotAlt: "A real member page open on a phone",
    link: null as { href: string; label: string } | null,
  },
  {
    title: "Enquiries that come to you",
    body: "When a customer fills in your contact form, it lands in your dashboard and your inbox. You reply, you win the job.",
    shot: null,
    shotAlt: "The member dashboard showing visitors and enquiries",
    link: null,
  },
  {
    title: "A spot on the marketplace",
    body: "Your business listed on the DigitalFlyer marketplace, where customers browse and compare local businesses.",
    shot: null,
    shotAlt: "The DigitalFlyer marketplace",
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
              {item.shot ? (
                // eslint-disable-next-line @next/next/no-img-element -- phone screenshots vary in aspect ratio
                <img src={item.shot} alt={item.shotAlt} className="w-full" />
              ) : (
                <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-1.5 bg-neutral-light border-b border-neutral-border px-6 text-center">
                  <ImageIcon size={22} className="text-neutral-muted" aria-hidden />
                  <p className="text-xs font-medium text-neutral-muted">Real screenshot coming soon</p>
                </div>
              )}
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
