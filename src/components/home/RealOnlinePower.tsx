import Link from "next/link";
import {
  Star,
  Search,
  Gauge,
  Crosshair,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

const items = [
  {
    icon: Star,
    title: "Your Reviews, Right In Google Search",
    body: "Real reviews build real trust, and once you've got them, your page is built to hand Google exactly what it needs to show your star rating directly in search results, not buried on a review site nobody visits.",
  },
  {
    icon: Search,
    title: "Built To Actually Get Found",
    body: "Every page is set up the way search engines expect from the moment it goes live, the technical groundwork is already done, not something you have to figure out or pay someone else for later.",
  },
  {
    icon: Gauge,
    title: "See What's Actually Working",
    body: "Real visitor numbers, right in your own dashboard. No separate analytics account to create, no new dashboard to learn, just your numbers, whenever you want them.",
  },
  {
    icon: Crosshair,
    title: "Ads That Track Properly",
    body: "Run Meta ads and know they're actually being counted, tracking that holds up against today's privacy browsers and ad blockers, not just a pixel that quietly stops reporting half your results.",
  },
];

export function RealOnlinePower() {
  return (
    <section className="bg-neutral-ink text-white py-10 lg:py-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Home page split handoff, 4 Aug 2026: the mock dashboard that used
            to sit here showed 1,247 page views, +18%, a 4.8 Google rating
            and 42 reviews, none of which exist. The handoff's rule is no
            invented numbers anywhere, so the panel is gone until a real
            dashboard screenshot exists to replace it. The four items below
            are the section's real content and they stand on their own. */}
        <div className="mb-8 lg:mb-10 max-w-2xl">
          <p className="text-brand-blue-mid text-xs font-black uppercase tracking-[0.15em] mb-2">
            Real Online Power
          </p>
          <h2 className="text-white font-extrabold text-2xl lg:text-3xl leading-tight">
            This Isn&apos;t Just A Webpage
          </h2>
          <p className="mt-3 text-sm text-white/80 leading-relaxed">
            Every DigitalFlyer page comes with the real technical groundwork most small businesses
            never get around to, built in from day one, not an upsell.
          </p>
        </div>

        {/* Four items */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 lg:gap-4">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.title}
                className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/10 transition-colors duration-200"
              >
                <div className="w-10 h-10 rounded-lg bg-brand-blue flex items-center justify-center mb-3">
                  <Icon size={20} className="text-white" strokeWidth={1.75} />
                </div>
                <h3 className="text-sm font-bold text-white mb-1.5">{item.title}</h3>
                <p className="text-sm text-white/70 leading-relaxed">{item.body}</p>
              </div>
            );
          })}
        </div>

        {/* Mid-page CTA */}
        <div className="mt-6 lg:mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-3 bg-brand-blue rounded-2xl p-4 lg:p-5">
          <div className="flex items-center gap-2.5 flex-1">
            <CheckCircle2 size={20} className="text-white/90 shrink-0" />
            <div>
              <p className="text-base font-bold text-white">Ready To Join?</p>
              <p className="text-xs text-white/80">Start your 7-day free trial, no card required.</p>
            </div>
          </div>
          <Link href="/pricing#pricing" className="btn-accent shrink-0 w-full sm:w-auto">
            Start Your Free Trial
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
