import Link from "next/link";
import {
  Star,
  Search,
  Gauge,
  Crosshair,
  ArrowRight,
  TrendingUp,
  Eye,
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 mb-8 lg:mb-10">
          <div className="lg:col-span-5">
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

          {/* Dashboard mockup */}
          <div className="lg:col-span-7">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                  <span className="w-2.5 h-2.5 rounded-full bg-white/20" />
                </div>
                <div className="flex-1 bg-white/10 rounded-md px-3 py-1 text-xs text-white/50 ml-2">
                  growth.digitalflyersa.co.za/yourbusiness
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Eye size={14} className="text-brand-blue-mid" />
                    <span className="text-[11px] text-white/60 font-medium">Page views</span>
                  </div>
                  <div className="text-xl font-bold text-white">1,247</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <TrendingUp size={11} className="text-green-400" />
                    <span className="text-[11px] text-green-400 font-medium">+18%</span>
                  </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Star size={14} className="text-brand-blue-mid" />
                    <span className="text-[11px] text-white/60 font-medium">Google rating</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xl font-bold text-white">4.8</span>
                    <div className="flex">
                      {[1, 2, 3, 4].map((i) => (
                        <Star key={i} size={11} className="text-accent fill-accent" />
                      ))}
                    </div>
                  </div>
                  <div className="text-[11px] text-white/50 mt-0.5">42 reviews</div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <Crosshair size={14} className="text-brand-blue-mid" />
                    <span className="text-[11px] text-white/60 font-medium">Ad tracking</span>
                  </div>
                  <div className="text-xl font-bold text-white">Active</div>
                  <div className="text-[11px] text-white/50 mt-0.5">Meta pixel OK</div>
                </div>
              </div>
            </div>
          </div>
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
          <Link href="#pricing" className="btn-accent shrink-0 w-full sm:w-auto">
            Start Your Free Trial
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
