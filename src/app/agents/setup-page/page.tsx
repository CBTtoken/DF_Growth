import type { Metadata } from "next";
import { MarketingHeader } from "@/components/brand/MarketingHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { AgentCompedSignupForm } from "@/components/agents/AgentCompedSignupForm";

export const metadata: Metadata = {
  title: "Set Up Your Free Agent Page",
  description: "Approved DigitalFlyer agents get a genuinely free page to promote their own business.",
};

// Sec 4: linked from the agent-approval email — a genuinely free,
// permanent (not a 7-day trial) Growth page for an approved agent's own
// business, reusing the exact same onboarding wizard every Foundation
// signup goes through.
export default function AgentSetupPagePage() {
  return (
    <main className="flex flex-1 flex-col bg-gray-50">
      <MarketingHeader />

      <section className="border-b border-gray-100 bg-white px-4 py-14 sm:px-6">
        <div className="mx-auto flex max-w-2xl flex-col items-center gap-3 text-center">
          <span className="font-badge text-xs uppercase tracking-widest text-brand">Agent Perk</span>
          <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">Your own free DigitalFlyer page</h1>
          <p className="max-w-xl text-sm text-gray-500 sm:text-base">
            As an approved agent, you get a genuinely free page to promote your own business — permanent, not a
            trial, no payment step, ever. Takes about 10 minutes.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-2xl px-4 py-12 sm:px-6">
        <AgentCompedSignupForm />
      </section>

      <SiteFooter />
    </main>
  );
}
