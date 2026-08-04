import Image from "next/image";
import { HeroDocument } from "@/components/bizup/landing/HeroDocument";

// The KatisoBiz block on the home page, per the split handoff, carrying the
// real KatisoBiz brand at Dewald's ask: the logo front and centre on a
// branded panel (the logo's own blue and orange are the app's brand-blue
// and accent, so the panel borrows both).
//
// The quote is the KatisoBiz landing page's own HeroDocument, reused rather
// than screenshotted: the first attempt used a raster screenshot and its
// square canvas corners looked wrong inside the rounded panel. This is the
// same document the KatisoBiz page renders, drawn in HTML, so it stays
// sharp at any size and can never drift out of step with that page.
//
// The wording rule from the handoff's corrections is load-bearing: nothing
// in the system connects a Growth account to a KatisoBiz account by
// itself, so this copy promises the tool and what a plan includes, and
// never says or implies the two accounts connect themselves.
export function KatisoBizFree() {
  return (
    <section className="bg-white py-10 lg:py-14 border-b border-neutral-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-brand-blue/15 bg-gradient-to-br from-brand-blue-light via-white to-accent/10 p-6 sm:p-8 lg:p-10">
          {/* Quiet brand shapes, echoing the logo's two colours. */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-accent/10" aria-hidden />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-brand-blue/10" aria-hidden />

          <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div>
              <span className="inline-block rounded-full bg-brand-blue px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                Included with every plan
              </span>

              <Image
                src="/katisobiz/logo.png"
                alt="KatisoBiz, abundance is the only way"
                width={520}
                height={119}
                className="mt-5 h-12 w-auto sm:h-14"
              />

              <h2 className="mt-4 text-2xl lg:text-3xl font-extrabold text-neutral-ink leading-tight">
                Quote it. Send it. Invoice it. From your phone.
              </h2>

              <p className="mt-3 text-sm lg:text-base text-neutral-mid leading-relaxed">
                Build a professional quote in minutes, send it on WhatsApp, and turn it into an
                invoice when the job is done. The free plan gives you ten documents a month, no card
                needed. Growth members get the R49 plan&apos;s features as part of their membership,
                switched on by our team.
              </p>

              <a
                href="https://katisobiz.co.za"
                className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-brand-blue px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-blue-dark"
              >
                See KatisoBiz →
              </a>
            </div>

            {/* The same real document the KatisoBiz page itself renders. */}
            <div className="flex justify-center lg:justify-end">
              <div className="w-full max-w-[320px]">
                <HeroDocument />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
