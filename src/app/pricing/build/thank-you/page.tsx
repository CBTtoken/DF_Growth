import type { Metadata } from "next";
import { BrandHeader } from "@/components/brand/BrandHeader";
import { TrackEvent } from "@/components/analytics/TrackEvent";
import { MetaConversion } from "@/components/analytics/MetaConversion";
import { BUILD_ORDER_WORKING_DAYS } from "@/lib/growth-client/build-order";

// Private post-payment page, same as the other post-checkout screens: it
// should never be indexed, and there is nothing on it worth crawling.
export const metadata: Metadata = { robots: { index: false, follow: false } };

// Sprint "Onboarding two doors" item 1. Paystack sends the member here
// after the R450-plus-first-period charge, with its own ?reference= on the
// URL. That reference is also the CAPI event_id the webhook uses for this
// same sale, so the browser pixel firing it here lets Meta dedupe the two
// into one conversion rather than counting the sale twice.
//
// This page deliberately makes no claim that the payment succeeded. Paystack
// redirects here on completion of the flow, but the webhook is what actually
// confirms the money, so the words describe what happens next rather than
// asserting a state this page cannot verify.
export default async function BuildThankYouPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const { reference, trxref } = await searchParams;
  const eventId = reference ?? trxref;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
      <TrackEvent name="purchase" method="growth_build_order" />
      <MetaConversion event="Subscribe" eventId={eventId} />
      <BrandHeader />
      <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-10 shadow-sm">
        <span className="grid size-14 place-items-center rounded-full bg-brand/10 text-2xl text-brand">✓</span>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Thank you, we have your details</h1>
        <p className="text-sm leading-relaxed text-gray-500">
          Check your email for a link to set up your password. That gets you into your dashboard,
          where you can watch your page take shape.
        </p>
        <p className="text-sm leading-relaxed text-gray-500">
          We start on your page now. It will be live within {BUILD_ORDER_WORKING_DAYS} working
          days, and we will email you the moment it is up. If we need anything else from you, we
          will ask on WhatsApp.
        </p>
      </div>
    </main>
  );
}
