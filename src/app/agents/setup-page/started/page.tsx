import { BrandHeader } from "@/components/brand/BrandHeader";

// Mirrors /pricing/trial-started exactly, same reasoning: the new
// account isn't logged in yet, they still need to click the email link.
export default function AgentSetupStartedPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-gray-50 p-8 text-center">
      <BrandHeader />
      <div className="flex max-w-md flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white p-10 shadow-sm">
        <span className="grid size-14 place-items-center rounded-full bg-brand/10 text-2xl text-brand">✓</span>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Your free page is on its way</h1>
        <p className="text-sm text-gray-500">
          Check your email for a link to set up your account. You&apos;ll choose a password, then go straight
          into your onboarding wizard — no payment step, ever.
        </p>
      </div>
    </main>
  );
}
