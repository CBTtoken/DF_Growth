import Link from "next/link";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { TrackEvent } from "@/components/analytics/TrackEvent";
import { MetaConversion } from "@/components/analytics/MetaConversion";

// Combined spec Sec 10: this used to be the redirect target for a brand-new
// growth_engine/enterprise signup paying upfront, before ever seeing the
// onboarding wizard — hence the old "check your email for a magic link"
// copy. Now the only thing that lands here is the wizard's own final
// payment step (src/app/api/checkout/finish), reached by someone who's
// already logged in and has already finished the rest of onboarding, so
// there's no magic link left to send — just a straight link into their new
// dashboard.
export default async function PricingSuccessPage({
  searchParams,
}: {
  // Tracking audit, 5 August 2026: Paystack appends ?reference=&trxref=
  // (same value, both always present) to the callback URL on a successful
  // return. This is the same id the webhook's server-side Subscribe CAPI
  // call (api/webhooks/paystack/route.ts) uses as its event_id, so passing
  // it to MetaConversion here lets Meta dedupe the two into one sale
  // instead of the browser pixel firing with no id at all, which is what
  // this looked like before.
  searchParams: Promise<{ reference?: string }>;
}) {
  const { reference } = await searchParams;
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
      <TrackEvent name="sign_up" method="growth_paid" />
      <MetaConversion event="Subscribe" eventId={reference} />
      <BrandHeader />
      <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-10 shadow-sm">
        <span className="grid size-14 place-items-center rounded-full bg-brand/10 text-2xl text-brand">✓</span>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Payment received</h1>
        <p className="text-sm text-gray-500">You&apos;re all set up. Your page is live right now.</p>
        <Link
          href="/dashboard"
          className="mt-2 inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark"
        >
          Go to your dashboard
        </Link>
      </div>
    </main>
  );
}
