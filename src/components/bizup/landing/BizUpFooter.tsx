import Link from "next/link";

// BizUp/docs landing copy, Section 10.
//
// The disclosure block below is a BUILD REQUIREMENT, not decorative copy.
// BizUp takes subscription payments online, so ECTA section 43 requires
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

export function BizUpFooter() {
  return (
    <footer className="border-t border-neutral-border bg-neutral-light">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-medium text-neutral-mid">
          <span className="font-extrabold text-neutral-ink">BizUp</span>
          <a href="#pricing" className="hover:text-brand-blue">Pricing</a>
          <a href="#how-it-works" className="hover:text-brand-blue">How it works</a>
          <a href="#faq" className="hover:text-brand-blue">FAQ</a>
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
            +27 72 311 0570 · info@digitalflyer.co.za · https://bizup.digitalflyer.co.za
          </p>
        </div>

        {/* Deliberately low key. The visitor came for a quoting tool, and
            selling Growth here dilutes the single clear action. Cross-sell
            happens inside the product once there is a habit. */}
        <p className="mt-6 text-xs text-neutral-muted">
          BizUp is from DigitalFlyer SA, which also helps South African businesses get found by
          local customers.{" "}
          <a
            href="https://growth.digitalflyersa.co.za"
            className="font-semibold text-brand-blue hover:underline"
          >
            Find out more
          </a>
        </p>
      </div>
    </footer>
  );
}
