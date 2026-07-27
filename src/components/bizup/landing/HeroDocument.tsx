// The hero. BizUp/docs landing copy: "A single phone mockup showing a
// real-looking quote... The document is the hero, not the software."
//
// Rendered in HTML rather than as an image of the real PDF, deliberately.
// The copy's own rule is "keep total page weight under 1MB" because many
// of these visitors are on prepaid data on a mid-range Android. An image
// of a quote costs 200KB or more; this costs about 2KB, stays sharp on any
// screen, and reflows properly at 360px where a fixed-width image cannot.
//
// The layout mirrors the Classic template (serif, ruled header, formal),
// which is the one chosen for the hero. It is a faithful rendering of the
// same document, not a mockup of a product that does not exist: every
// figure below is what the real template produces for this job.
//
// Drift risk, stated rather than hidden: this is a second implementation
// of the Classic layout. If Classic changes materially, this needs the
// same change. It is short enough that keeping them in step is easy, and
// the tradeoff buys the page weight target.

const LINES = [
  { d: "Callout and assessment", q: "1", u: "callout", t: "R450.00" },
  { d: "Kwikot 150L geyser (supply)", q: "1", u: "each", t: "R4 899.00" },
  { d: "Replace 150L geyser, labour", q: "3", u: "hour", t: "R1 350.00" },
  { d: "Drip tray and overflow pipe", q: "1", u: "each", t: "R685.00" },
];

export function HeroDocument() {
  return (
    <div className="mx-auto w-full max-w-[300px]">
      {/* Phone frame, drawn rather than imaged. */}
      <div className="rounded-[2rem] border-[10px] border-neutral-ink bg-neutral-ink p-0 shadow-card-hover">
        <div className="overflow-hidden rounded-[1.4rem] bg-white">
          <div className="px-4 py-4 font-serif text-[7.5px] leading-relaxed text-neutral-ink">
            {/* Ruled header, as Classic renders it */}
            <div className="flex items-start justify-between border-b border-neutral-ink/70 pb-2">
              <div>
                <p className="font-bold text-[13px] leading-none">Quotation</p>
                <p className="mt-1">QUO-2026-0114</p>
                <p>Valid until 26 August 2026</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold leading-tight">Sipho&apos;s Plumbing</p>
                <p>14 Kerk Street, Blanco</p>
                <p>George, 6529</p>
                <p>082 555 0134</p>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-[6.5px] uppercase tracking-wide text-neutral-muted">Quote for</p>
              <p className="font-bold">Mrs A van der Merwe</p>
              <p>27 Meade Street, George Central</p>
            </div>

            <div className="mt-3">
              <div className="flex justify-between border-b border-neutral-border pb-1 text-[6.5px] uppercase tracking-wide text-neutral-muted">
                <span className="w-[58%]">Description</span>
                <span className="w-[14%] text-right">Qty</span>
                <span className="w-[28%] text-right">Total</span>
              </div>
              {LINES.map((l) => (
                <div key={l.d} className="flex justify-between border-b border-neutral-border py-1">
                  <span className="w-[58%] pr-1">{l.d}</span>
                  <span className="w-[14%] text-right">{l.q}</span>
                  <span className="w-[28%] text-right">{l.t}</span>
                </div>
              ))}
            </div>

            <div className="mt-2 flex justify-end">
              <div className="w-[62%]">
                <div className="flex justify-between border-t border-neutral-ink pt-1">
                  <span className="font-bold">Total</span>
                  <span className="font-bold">R7 384.00</span>
                </div>
                {/* Sec 3.1: this member is not a VAT vendor, so there is no
                    VAT row at all and the document says so plainly. That is
                    the common case and the page should show it. */}
                <p className="mt-1 text-[6px] text-neutral-muted">Not a VAT vendor. No VAT charged.</p>
              </div>
            </div>

            <div className="mt-3">
              <p className="text-[6.5px] uppercase tracking-wide text-neutral-muted">Banking details</p>
              <p>S Ndlovu, First National Bank, cheque</p>
              <p>Account ••••••4471, branch 250655</p>
              <p className="mt-1 bg-accent-light p-1 text-[6px] leading-snug">
                Our banking details never change. If you receive a message asking you to pay into a
                different account, please do not pay it and contact us.
              </p>
            </div>

            <p className="mt-3 text-center text-[5.5px] text-neutral-muted">
              Generated via KatisoBiz, DigitalFlyer SA
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
