import { BrandHeader } from "@/components/brand/BrandHeader";
import { TrackEvent } from "@/components/analytics/TrackEvent";
import { MetaConversion } from "@/components/analytics/MetaConversion";

// Found via real UAT: Foundation's signup used to redirect straight to
// /onboard, which just shows whatever session happens to already be
// active in that browser — not necessarily the account that was just
// created, since the new user isn't actually logged in until they click
// the magic link in their email. A repeat tester (or anyone testing in a
// browser with an older session still active) landed on their OLD
// account's onboarding progress instead of a fresh signup, looking like
// the new signup did nothing at all. Mirrors /pricing/success, which
// already got this right for paid tiers.
export default async function TrialStartedPage({
  searchParams,
}: {
  // ?ev= carries the server-side CAPI's event_id (set in pricing/actions.ts)
  // so the browser pixel can fire the same id and Meta dedupes the two.
  searchParams: Promise<{ ev?: string }>;
}) {
  const { ev } = await searchParams;
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
      <TrackEvent name="sign_up" method="foundation_trial" />
      <MetaConversion event="CompleteRegistration" eventId={ev} />
      <BrandHeader />
      <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-10 shadow-sm">
        <span className="grid size-14 place-items-center rounded-full bg-brand/10 text-2xl text-brand">✓</span>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Your trial has started</h1>
        <p className="text-sm text-gray-500">
          Check your email for a link to set up your account. You&apos;ll choose a password, then
          go straight into your onboarding wizard.
        </p>
      </div>
    </main>
  );
}
