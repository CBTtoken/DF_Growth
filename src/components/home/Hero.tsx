import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
import { HOME_IMAGES } from "@/lib/home/media";

const trustBadges = [
  { label: "7 days free", sub: "No card needed" },
  { label: "Paystack secure", sub: "Checkout" },
  { label: "Cancel anytime", sub: "No lock-in" },
];

export function Hero() {
  const img = HOME_IMAGES.hero;

  return (
    <section className="relative bg-gradient-to-br from-brand-blue-light via-white to-white pt-20 pb-8 lg:pt-24 lg:pb-10 overflow-hidden">
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Announcement bar */}
        <div className="flex justify-center mb-6 lg:mb-8">
          <Link
            href="#pricing"
            className="group flex items-center gap-3 bg-accent text-white font-bold text-sm sm:text-base px-5 py-2.5 rounded-full shadow-lg shadow-accent/30 hover:bg-accent-hover hover:-translate-y-0.5 transition-all duration-200"
          >
            <Zap size={18} className="fill-white shrink-0" />
            <span>Try free for 7 days, no card required</span>
            <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform shrink-0" />
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-center">
          {/* Left */}
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-5xl xl:text-6xl font-extrabold text-neutral-ink leading-[1.08] tracking-tight">
              Build Your Presence.{" "}
              <span className="text-brand-blue">Grow Your Business.</span>
            </h1>

            <p className="mt-4 text-base lg:text-lg text-neutral-mid leading-relaxed">
              DigitalFlyer gives South African small businesses a professional online presence,
              lead generation, and a full suite of growth tools, all in one place.
            </p>

            <div className="mt-6 flex flex-row flex-wrap items-center gap-3">
              <Link href="#pricing" className="btn-accent-lg">
                See Pricing
                <ArrowRight size={18} />
              </Link>
              <Link href="#how-it-works" className="btn-outline text-sm px-5 py-3">
                How it works
              </Link>
            </div>

            <p className="mt-4 text-sm text-neutral-muted">
              We built DigitalFlyer to help South African businesses get found, get trusted, and grow.
            </p>

            {/* Trust badges */}
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-2">
              {trustBadges.map((t) => (
                <div
                  key={t.label}
                  className="flex items-center gap-2.5 bg-brand-blue-light border border-brand-blue/20 rounded-lg px-3.5 py-2.5"
                >
                  <span className="w-2 h-2 rounded-full bg-brand-blue shrink-0" />
                  <div>
                    <p className="text-sm font-bold text-brand-blue leading-none">{t.label}</p>
                    <p className="text-xs text-brand-blue/70 mt-0.5">{t.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: photo */}
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
