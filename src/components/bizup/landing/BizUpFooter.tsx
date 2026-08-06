import Link from "next/link";
import { katisoPath } from "@/lib/bizup/product";

// BizUp/docs landing copy, Section 10.
//
// The disclosure block below is a BUILD REQUIREMENT, not decorative copy.
// KatisoBiz takes subscription payments online, so ECTA section 43 requires
// certain disclosures to be available before a transaction is concluded.
// Where a supplier fails to make them the consumer gains a cancellation
// right, which is a commercial consequence rather than a fine. It also
// satisfies Companies Act section 32, which requires the registered name
// or registration number to be furnished on demand and not misstated.
//
// Details confirmed by Dewald 27 July 2026 against the CIPC record.
//
// STILL OUTSTANDING, flagged rather than guessed: the attorney has been
// asked to confirm the complete section 43 list, which runs to more items
// than are safe to reproduce from memory. The pre-purchase items (full
// pricing including any extras, what the subscription provides, payment
// methods, the cancellation and refund position, and how to correct an
// error before confirming) must also be reachable from the checkout
// screen, which is built with the subscription flow, not here.

export async function BizUpFooter() {
  const help = await katisoPath("/help");
  const howItWorks = await katisoPath("/how-it-works");
  const faq = await katisoPath("/faq");

  return (
    <footer className="border-t border-neutral-border bg-neutral-light">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Growth cross-sell, and the one place on this page it belongs.
            The copy deck says "do not sell Growth on this page, it dilutes
            a single clear action", and that reasoning holds for the body.
            Dewald asked for it at the bottom, which is where a visitor who
            has already read everything and is still deciding will look.
            Kept factual and quiet: it states a real entitlement rather than
            pitching a second product.

            The claim is true as built: Growth Engine and Enterprise include
            the R49 tier, Foundation includes KatisoBiz Free. See
            bizUpEntitlementForTier in lib/bizup/entitlements.ts. */}
        <div className="rounded-2xl border border-brand-blue/20 bg-brand-blue-light p-5">
          <p className="text-sm font-bold text-neutral-ink">
            Already on DigitalFlyer Growth? KatisoBiz is included.
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-neutral-mid">
            Growth gets your business found by local customers with a professional page, a place on
            the marketplace and reviews. KatisoBiz comes with it, so quoting and invoicing are
            already paid for.
          </p>
          <a
            href="https://growth.digitalflyersa.co.za/pricing"
            className="mt-3 inline-block text-sm font-bold text-brand-blue hover:underline"
          >
            See what is in Growth
          </a>
        </div>

        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-neutral-mid">
          <span className="font-extrabold text-neutral-ink">KatisoBiz</span>
          <a href="#pricing" className="hover:text-brand-blue">Pricing</a>
          <a href={howItWorks} className="hover:text-brand-blue">How it works</a>
          <Link href={help} className="hover:text-brand-blue">Help</Link>
          <a href={faq} className="hover:text-brand-blue">FAQ</a>
          <Link href="/terms" className="hover:text-brand-blue">Terms</Link>
          <Link href="/privacy" className="hover:text-brand-blue">Privacy</Link>
          <a href="mailto:info@digitalflyer.co.za" className="hover:text-brand-blue">Contact</a>
        </div>

        {/* ECTA s43 / Companies Act s32 disclosure. */}
        <div className="mt-7 border-t border-neutral-border pt-6 text-xs leading-relaxed text-neutral-muted">
          <p className="font-bold text-neutral-mid">
            Digital Flyer (Pty) Ltd, registration number 2018/350974/07, trading as DigitalFlyer SA.
          </p>
          <p className="mt-1">609 Swart Street, Pretoria, 0044, South Africa</p>
          <p>
            +27 72 311 0570 · info@digitalflyer.co.za · https://katisobiz.co.za
          </p>
        </div>

              </div>
    </footer>
  );
}
