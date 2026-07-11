import { BrandHeader } from "@/components/brand/BrandHeader";

// Found via real UAT: Foundation's signup used to redirect straight to
// /onboard, which just shows whatever session happens to already be
// active in that browser — not necessarily the account that was just
// created, since the new user isn't actually logged in until they click
// the magic link in their email. A repeat tester (or anyone testing in a
// browser with an older session still active) landed on their OLD
// account's onboarding progress instead of a fresh signup, looking like
// the new signup did nothing at all. Mirrors /pricing/success, which
// already got this right for paid tiers.
export default function TrialStartedPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
      <BrandHeader />
      <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-10 shadow-sm">
        <span className="grid size-14 place-items-center rounded-full bg-brand/10 text-2xl text-brand">✓</span>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Your trial has started</h1>
        <p className="text-sm text-gray-500">
          Check your email for a magic link to get started. It lands you straight in your
          onboarding wizard, no password needed.
        </p>
      </div>
    </main>
  );
}
