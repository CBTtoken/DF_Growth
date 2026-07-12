import { BrandHeader } from "@/components/brand/BrandHeader";

// Combined spec Sec 10: this used to be the redirect target for a brand-new
// growth_engine/enterprise signup paying upfront, before ever seeing the
// onboarding wizard — hence the old "check your email for a magic link"
// copy. Now the only thing that lands here is the wizard's own final
// payment step (src/app/api/checkout/finish), reached by someone who's
// already logged in and has already finished the rest of onboarding, so
// there's no magic link left to send — just a straight link into their new
// dashboard.
export default function PricingSuccessPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
      <BrandHeader />
      <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-10 shadow-sm">
        <span className="grid size-14 place-items-center rounded-full bg-brand/10 text-2xl text-brand">✓</span>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Payment received</h1>
        <p className="text-sm text-gray-500">You&apos;re all set up. Your page is live right now.</p>
        <a
          href="/dashboard"
          className="mt-2 inline-flex items-center justify-center rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-brand-dark"
        >
          Go to your dashboard
        </a>
      </div>
    </main>
  );
}
