import type { Metadata } from "next";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AgentApplicationForm } from "@/components/agents/AgentApplicationForm";

export const metadata: Metadata = {
  title: "Become an Agent",
  description: "Earn recurring commission promoting DigitalFlyer Growth to your network.",
};

// Sec 3: "a plain language explanation page covering exactly how
// commission works... This copy should read as a straightforward
// agreement, not fine print" — worth a legal pass before public launch,
// same flag already noted for the Growth Privacy Policy and Terms.
export default function AgentApplyPage() {
  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <MarketingHeader />

      <section className="border-b border-gray-100 bg-white px-4 py-14 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
          <span className="font-badge text-xs uppercase tracking-widest text-brand">Agent Referral Programme</span>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Earn commission promoting DigitalFlyer Growth</h1>
          <p className="max-w-xl text-sm text-gray-500 sm:text-base">
            You don&apos;t need to be a Growth member yourself. Apply, get approved, and start earning recurring
            commission on every annual membership you bring in.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
        <div className="mb-10 flex flex-col gap-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-bold tracking-tight text-ink">How commission works</h2>
          <ul className="flex flex-col gap-3 text-sm text-gray-600">
            <li>
              <span className="font-semibold text-gray-900">Referrals only count on Growth and Enterprise annual plans</span> —
              never Foundation, and never a monthly plan.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Your first 10 referrals earn 25% commission.</span> From your
              11th referral onward, every referral earns 40%, including your first 10 renewing after that point.
            </li>
            <li>
              <span className="font-semibold text-gray-900">Commission repeats every year a referred member renews</span>, not
              just on their first payment.
            </li>
            <li>
              Commission is only ever payable once a member&apos;s annual payment has actually cleared. If someone
              cancels before paying, no commission was earned for that period, and nothing is clawed back later.
            </li>
          </ul>

          <h2 className="mt-2 text-lg font-bold tracking-tight text-ink">Terms</h2>
          <p className="text-sm text-gray-600">
            Agents are independent, not employees of DigitalFlyer SA, and are responsible for their own tax on any
            commission earned. Payment happens via direct bank transfer once a referral&apos;s annual payment has
            cleared. Applying does not guarantee approval, and DigitalFlyer SA reserves the right to review and, where
            necessary, remove an agent from the programme.
          </p>
        </div>

        <AgentApplicationForm />
      </section>

      <SiteFooter />
    </main>
  );
}
