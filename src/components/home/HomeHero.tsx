import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HOME_IMAGES } from "@/lib/home/media";

// The home page hero, per the split handoff: headline, one supporting line,
// the price visible without scrolling, one primary button (start free, no
// card required) and one secondary link to pricing. Nothing else. The old
// hero's three trust badges collapse into the single price line, which says
// all three things in one sentence.
export function HomeHero() {
  const img = HOME_IMAGES.hero;

  return (
    <section className="relative bg-gradient-to-br from-brand-blue-light via-white to-white pt-14 pb-10 lg:pt-20 lg:pb-14 overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-extrabold text-neutral-ink leading-[1.08] tracking-tight">
              Build Your Presence.{" "}
              <span className="text-brand-blue">Grow Your Business.</span>
            </h1>

            <p className="mt-4 text-base lg:text-lg text-neutral-mid leading-relaxed">
              A professional page for your business, found by real customers, run from your phone.
              No tech skills needed.
            </p>

            {/* The price, on screen before anyone scrolls. */}
            <p className="mt-4 text-sm font-semibold text-neutral-ink">
              Free for 7 days, no card required. From R100 a month after that, cancel anytime.
            </p>

            <div className="mt-6 flex flex-row flex-wrap items-center gap-3">
              <Link href="/pricing#pricing" className="btn-accent-lg">
                Start Free, No Card Required
                <ArrowRight size={18} />
              </Link>
              <Link href="/pricing" className="btn-outline text-sm px-5 py-3">
                See full pricing
              </Link>
            </div>
          </div>

          <div className="relative">
            <div className="relative rounded-2xl overflow-hidden shadow-card-hover aspect-[4/3] lg:aspect-[5/4]">
              <Image
                src={img.src}
                alt={img.alt}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
              <div className="absolute bottom-3 left-3 right-3 bg-white/95 rounded-xl px-4 py-3 shadow-card">
                <p className="text-sm font-bold text-neutral-ink">Your business, online in minutes</p>
                <p className="text-xs text-neutral-mid mt-0.5">A real page customers can find and trust</p>
              </div>
            </div>
            <div className="absolute -top-3 -right-3 w-16 h-16 bg-brand-blue rounded-2xl -z-10 hidden lg:block" aria-hidden />
            <div className="absolute -bottom-3 -left-3 w-12 h-12 bg-accent rounded-xl -z-10 hidden lg:block" aria-hidden />
          </div>
        </div>
      </div>
    </section>
  );
}
