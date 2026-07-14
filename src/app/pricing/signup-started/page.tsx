import { BrandHeader } from "@/components/brand/BrandHeader";

// Combined spec Sec 10: growth_engine/enterprise signups no longer pay
// upfront on /pricing, so this replaces the old immediate redirect to
// Paystack — mirrors /pricing/trial-started's own fix for the same
// magic-link-not-yet-clicked bug, with copy that doesn't claim a "trial"
// (this isn't one) and sets the right expectation that payment is still
// coming, just at the end of the wizard instead of right now.
export default function SignupStartedPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
      <BrandHeader />
      <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-10 shadow-sm">
        <span className="grid size-14 place-items-center rounded-full bg-brand/10 text-2xl text-brand">✓</span>
        <h1 className="text-2xl font-bold tracking-tight text-ink">You&apos;re almost set up</h1>
        <p className="text-sm text-gray-500">
          Check your email for a link to set up your account. You&apos;ll choose a password,
          fill in your business details, then confirm payment right at the end.
        </p>
      </div>
    </main>
  );
}
