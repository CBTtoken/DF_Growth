import Image from "next/image";
import Link from "next/link";
import { ExternalLink, ArrowRight } from "lucide-react";

// The three flagship member pages. Tags and gradient accents are curated
// here; a real captured screenshot (from the client-screenshots pipeline) is
// dropped in per slug via the `screenshots` map when one exists, otherwise
// the stylised browser-mock body renders.
const clients = [
  { name: "Buffelskop", tag: "Accommodation", accent: "from-brand-blue to-brand-blue-dark", slug: "buffelskop" },
  {
    name: "Helplift Network Vaal Triangle",
    tag: "Community Services",
    accent: "from-brand-blue-mid to-brand-blue",
    slug: "helplift-network-vaal-triangle",
  },
  { name: "Standing 365", tag: "Events & Production", accent: "from-neutral-ink to-brand-blue-dark", slug: "standing-365" },
];

export function MostVisitedPages({ screenshots = {} }: { screenshots?: Record<string, string> }) {
  return (
    <section className="bg-neutral-light py-10 lg:py-14">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-5 lg:mb-7">
          <p className="section-eyebrow">Real Members</p>
          <h2 className="section-heading text-2xl lg:text-3xl">Our Most Visited Pages</h2>
          <p className="mt-1.5 text-sm text-neutral-mid leading-relaxed">
            Real DigitalFlyer members, real pages, real customers finding them.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-5">
          {clients.map((client) => {
            const shot = screenshots[client.slug];
            return (
              <Link
                key={client.name}
                href={`/${client.slug}`}
                className="group bg-white border border-neutral-border rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover hover:border-brand-blue/30 transition-all duration-200"
              >
                {/* Browser chrome */}
                <div className="bg-neutral-light border-b border-neutral-border px-3.5 py-2 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-border" />
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-border" />
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-border" />
                  </div>
                  <div className="flex-1 bg-white border border-neutral-border rounded-md px-2.5 py-0.5 text-[11px] text-neutral-muted ml-1.5 truncate">
                    growth.digitalflyersa.co.za/{client.slug}
                  </div>
                </div>

                {shot ? (
                  /* Real captured screenshot of the live page */
                  <div className="relative h-44 overflow-hidden bg-neutral-light">
                    <Image
                      src={shot}
                      alt={`${client.name} page`}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover object-top group-hover:scale-[1.02] transition-transform duration-300"
                    />
                    <span className="absolute bottom-2 left-3 z-10 text-white text-xs font-bold drop-shadow">
                      {client.tag}
                    </span>
                    <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-neutral-ink/50 to-transparent" />
                    <ExternalLink size={16} className="absolute top-3 right-3 text-white/80 group-hover:text-white transition-colors drop-shadow" />
                  </div>
                ) : (
                  <>
                    {/* Stylised fallback hero */}
                    <div className={`h-32 bg-gradient-to-br ${client.accent} relative`}>
                      <div className="absolute inset-0 flex flex-col justify-end p-4">
                        <span className="text-white/80 text-[11px] font-medium mb-0.5">{client.tag}</span>
                        <h3 className="text-white font-bold text-base leading-tight">{client.name}</h3>
                      </div>
                      <ExternalLink size={16} className="absolute top-3 right-3 text-white/60 group-hover:text-white transition-colors" />
                    </div>
                    <div className="p-4 space-y-2">
                      <div className="h-2 bg-neutral-border rounded w-3/4" />
                      <div className="h-2 bg-neutral-border rounded w-full" />
                      <div className="h-2 bg-neutral-border rounded w-5/6" />
                      <div className="flex gap-1.5 pt-1.5">
                        <div className="h-7 w-16 bg-brand-blue-light rounded" />
                        <div className="h-7 w-16 bg-neutral-border rounded" />
                      </div>
                    </div>
                  </>
                )}
              </Link>
            );
          })}
        </div>

        <p className="mt-4 text-xs text-neutral-muted">
          10 styles available. Choose yours during signup, change any time.
        </p>

        {/* CTA bar */}
        <div className="mt-6 lg:mt-8 bg-white border border-neutral-border rounded-2xl p-4 lg:p-5 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-neutral-ink">
              You&apos;ve Seen What&apos;s Possible. Your business could be next.
            </p>
            <p className="text-xs text-neutral-mid mt-0.5">Takes less than 5 minutes.</p>
          </div>
          <Link href="#pricing" className="btn-accent shrink-0 w-full sm:w-auto">
            See Pricing &amp; Join
            <ArrowRight size={18} />
          </Link>
        </div>
      </div>
    </section>
  );
}
