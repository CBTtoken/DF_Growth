import { ImageIcon, MessagesSquare } from "lucide-react";

// The KatisoBiz block on the home page, per the split handoff. The wording
// rule from the handoff's corrections is load-bearing: nothing in the
// system connects a Growth account to a KatisoBiz account by itself, so
// this copy promises the tool and what a plan includes, and never says or
// implies the two accounts connect themselves.
export function KatisoBizFree() {
  return (
    <section className="bg-white py-10 lg:py-14 border-b border-neutral-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-10 items-center">
          <div>
            <p className="section-eyebrow">Also Yours</p>
            <h2 className="section-heading text-2xl lg:text-3xl mb-3 flex items-center gap-2.5">
              <span className="inline-flex w-10 h-10 rounded-xl bg-brand-blue items-center justify-center shrink-0">
                <MessagesSquare size={20} className="text-white" strokeWidth={1.75} />
              </span>
              KatisoBiz, Free
            </h2>
            <p className="text-sm text-neutral-mid leading-relaxed">
              Quoting and invoicing on your phone. Build a quote in minutes, send it on WhatsApp,
              and turn it into an invoice when the job is done. The free plan gives you ten
              documents a month, no card needed. Growth members get the R49 plan&apos;s features as
              part of their membership, switched on by our team.
            </p>
            <a
              href="https://katisobiz.co.za"
              className="mt-3 inline-block text-sm font-bold text-brand-blue hover:text-brand-blue-dark transition-colors"
            >
              See KatisoBiz →
            </a>
          </div>

          {/* Visibly a placeholder until Dewald's real phone screenshot of a
              quote being built exists. Never a mockup with invented numbers. */}
          <div className="rounded-2xl border border-neutral-border bg-neutral-light shadow-card overflow-hidden">
            <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-1.5 px-6 text-center">
              <ImageIcon size={22} className="text-neutral-muted" aria-hidden />
              <p className="text-xs font-medium text-neutral-muted">
                Real screenshot coming soon: a quote being built on a phone
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
